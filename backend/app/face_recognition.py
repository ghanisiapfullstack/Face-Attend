import numpy as np
import json
import os
from deepface import DeepFace

EMBEDDINGS_FILE = r"C:\Users\USER\face-attend\ml_model\embeddings.json"
THRESHOLD = 0.6

_embeddings_cache = None

def load_embeddings():
    global _embeddings_cache
    if _embeddings_cache is not None:
        return _embeddings_cache
    try:
        with open(EMBEDDINGS_FILE, 'r') as f:
            _embeddings_cache = json.load(f)
            return _embeddings_cache
    except:
        return {}

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def recognize_face(image):
    embeddings = load_embeddings()
    if not embeddings:
        return None, 0

    try:
        result = DeepFace.represent(
            img_path=image,
            model_name="Facenet",
            enforce_detection=False
        )
        if not result:
            return None, 0

        face_embedding = result[0]["embedding"]

        best_match = None
        best_score = -1

        for person_name, data in embeddings.items():
            score = cosine_similarity(face_embedding, data["embedding"])
            if score > best_score:
                best_score = score
                best_match = person_name

        if best_score >= THRESHOLD:
            return best_match, float(best_score)
        return None, float(best_score)

    except Exception as e:
        print(f"Error: {e}")
        return None, 0