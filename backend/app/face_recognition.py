import json
import os
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from deepface import DeepFace

load_dotenv()

_default_embeddings = Path(__file__).resolve().parents[2] / "ml_model" / "embeddings.json"
EMBEDDINGS_FILE = os.getenv("EMBEDDINGS_FILE", str(_default_embeddings))
THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.72"))
MATCH_MARGIN = float(os.getenv("FACE_MATCH_MARGIN", "0.06"))

_embeddings_cache = None


def load_embeddings():
    global _embeddings_cache
    if _embeddings_cache is not None:
        return _embeddings_cache
    try:
        with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
            _embeddings_cache = json.load(f)
            return _embeddings_cache
    except OSError:
        return {}


def clear_embeddings_cache():
    global _embeddings_cache
    _embeddings_cache = None


def cosine_similarity(a, b):
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _norm_name(s: str) -> str:
    return "".join(c for c in (s or "").lower() if c.isalnum())


def embedding_key_matches_student(student_name: str, emb_key: str) -> bool:
    """Cocokkan nama di DB dengan key folder di embeddings.json."""
    a = _norm_name(student_name)
    b = _norm_name(emb_key)
    if not a or not b:
        return False
    if a == b:
        return True
    if len(b) >= 3 and b in a:
        return True
    if len(a) >= 3 and a in b:
        return True
    return False


def build_embedding_candidates(students, embeddings: dict) -> list[tuple[str, int]]:
    """
    Pasangan (key_embeddings, student_id) untuk mahasiswa terdaftar.
    Hanya key yang cocok dengan nama mahasiswa yang dipakai saat inferensi.
    """
    if not embeddings or not students:
        return []
    keys = list(embeddings.keys())
    out: list[tuple[str, int]] = []
    seen: set[tuple[str, int]] = set()
    for s in students:
        for k in keys:
            if embedding_key_matches_student(s.name, k):
                t = (k, s.id)
                if t not in seen:
                    seen.add(t)
                    out.append(t)
    return out


def recognize_face(image):
    """Inferensi lawan semua embedding (legacy)."""
    embeddings = load_embeddings()
    if not embeddings:
        return None, 0.0

    try:
        result = DeepFace.represent(
            img_path=image,
            model_name="Facenet",
            enforce_detection=False,
        )
        if not result:
            return None, 0.0

        face_embedding = result[0]["embedding"]
        best_match = None
        best_score = -1.0
        second_score = -1.0
        for person_name, data in embeddings.items():
            score = cosine_similarity(face_embedding, data["embedding"])
            if score > best_score:
                second_score = best_score
                best_score = score
                best_match = person_name
            elif score > second_score:
                second_score = score

        if second_score < 0:
            second_score = 0.0
        if (
            best_match
            and best_score >= THRESHOLD
            and (best_score - second_score) >= MATCH_MARGIN
        ):
            return best_match, float(best_score)
        return None, float(best_score)

    except Exception as e:
        print(f"Error: {e}")
        return None, 0.0


def recognize_face_against_candidates(image, candidates: list[tuple[str, int]]):
    """
    Bandingkan wajah hanya dengan embedding milik kandidat (mis. mahasiswa terdaftar di MK).
    Mengurangi salah orang (mis. Ghani terbaca Radith jika Radith tidak ikut MK).

    Returns:
        (student_id | None, best_score)
    """
    embeddings = load_embeddings()
    if not embeddings or not candidates:
        return None, 0.0

    try:
        result = DeepFace.represent(
            img_path=image,
            model_name="Facenet",
            enforce_detection=False,
        )
        if not result:
            return None, 0.0

        face_embedding = result[0]["embedding"]
        scores: list[tuple[float, int]] = []
        for key, sid in candidates:
            data = embeddings.get(key)
            if not data or "embedding" not in data:
                continue
            sc = cosine_similarity(face_embedding, data["embedding"])
            scores.append((sc, sid))

        if not scores:
            return None, 0.0

        scores.sort(key=lambda x: x[0], reverse=True)
        best_sc, best_sid = scores[0]
        second_sc = scores[1][0] if len(scores) > 1 else 0.0
        thr = float(os.getenv("FACE_MATCH_THRESHOLD", "0.72"))
        margin = float(os.getenv("FACE_MATCH_MARGIN", "0.06"))
        if best_sc >= thr and (best_sc - second_sc) >= margin:
            return best_sid, float(best_sc)
        return None, float(best_sc)

    except Exception as e:
        print(f"Error: {e}")
        return None, 0.0
