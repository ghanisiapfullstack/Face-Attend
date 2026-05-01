"""
=============================================================
  FACE RECOGNITION - TRAINING SCRIPT
  Model   : DeepFace - ArcFace (Pretrained on MS-Celeb-1M)
  Method  : Transfer Learning / Feature Extraction
  Output  : embeddings.json
=============================================================

Cara pakai:
    python train.py

Struktur dataset:
    dataset/
    ├── NamaPerson1/
    │   ├── foto1.jpg
    │   └── foto2.jpg
    └── NamaPerson2/
        └── foto1.jpg
"""

import json
import os
import random

import numpy as np
from deepface import DeepFace
from pathlib import Path

# ── Config ────────────────────────────────────────────────
DATASET_DIR  = "dataset"
OUTPUT_FILE  = "embeddings.json"
MODEL_NAME   = "ArcFace"          # Pretrained model dari DeepFace
TRAIN_RATIO  = 0.8                # 80% train, 20% test
RANDOM_SEED  = 42
# ─────────────────────────────────────────────────────────


def get_embedding(img_path: str) -> list | None:
    """Extract face embedding dari satu gambar menggunakan ArcFace."""
    try:
        result = DeepFace.represent(
            img_path=img_path,
            model_name=MODEL_NAME,
            enforce_detection=False,
        )
        if result:
            return result[0]["embedding"]
    except Exception as e:
        print(f"      ⚠ Gagal proses {img_path}: {e}")
    return None


def train():
    print("=" * 60)
    print("  FACE RECOGNITION - TRAINING")
    print(f"  Model     : {MODEL_NAME} (Pretrained - DeepFace)")
    print(f"  Method    : Transfer Learning / Feature Extraction")
    print(f"  Train/Test: {int(TRAIN_RATIO*100)}/{int((1-TRAIN_RATIO)*100)}")
    print("=" * 60)

    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)

    embeddings    = {}   # hasil akhir untuk inferensi
    train_summary = []   # ringkasan per orang
    test_split    = {}   # simpan path test untuk dipakai test.py

    persons = [
        p for p in os.listdir(DATASET_DIR)
        if os.path.isdir(os.path.join(DATASET_DIR, p))
    ]

    if not persons:
        print("❌ Tidak ada folder dataset ditemukan!")
        return

    print(f"\nFile Ditemukan {len(persons)} orang: {', '.join(persons)}\n")

    for person_name in persons:
        person_dir = os.path.join(DATASET_DIR, person_name)
        photos = [
            f for f in os.listdir(person_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]

        if not photos:
            print(f"  ⚠ {person_name}: tidak ada foto, skip.")
            continue

        # ── Train / Test split ────────────────────────────
        random.shuffle(photos)
        split_idx   = max(1, int(len(photos) * TRAIN_RATIO))
        train_photos = photos[:split_idx]
        test_photos  = photos[split_idx:]

        print(f"👤 {person_name}")
        print(f"   Total foto : {len(photos)}")
        print(f"   Train      : {len(train_photos)} foto")
        print(f"   Test       : {len(test_photos)} foto")

        # ── Extract embeddings dari train set ─────────────
        train_embeddings = []
        for photo in train_photos:
            path = os.path.join(person_dir, photo)
            emb  = get_embedding(path)
            if emb is not None:
                train_embeddings.append(emb)
                print(f"      ✅ {photo}")
            else:
                print(f"      ❌ {photo} (gagal)")

        if not train_embeddings:
            print(f"   ❌ Tidak ada embedding valid untuk {person_name}, skip.\n")
            continue

        # ── Rata-rata semua embedding (mean embedding) ────
        avg_embedding = np.mean(train_embeddings, axis=0).tolist()

        embeddings[person_name] = {
            "embedding"   : avg_embedding,
            "photo_count" : len(train_embeddings),
            "model"       : MODEL_NAME,
        }

        train_summary.append({
            "person"          : person_name,
            "total_photos"    : len(photos),
            "train_photos"    : len(train_embeddings),
            "test_photos"     : len(test_photos),
            "embedding_dim"   : len(avg_embedding),
        })

        # Simpan path test untuk test.py
        test_split[person_name] = [
            os.path.join(person_dir, p) for p in test_photos
        ]

        print(f"   ✅ Embedding selesai (dim={len(avg_embedding)})\n")

    # ── Simpan embeddings.json ────────────────────────────
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(embeddings, f, indent=2)

    # ── Simpan test split untuk test.py ──────────────────
    with open("test_split.json", "w", encoding="utf-8") as f:
        json.dump(test_split, f, indent=2)

    # ── Ringkasan ─────────────────────────────────────────
    print("=" * 60)
    print("  TRAINING SELESAI")
    print("=" * 60)
    print(f"  {'Nama':<20} {'Train':>6} {'Test':>6} {'Emb Dim':>8}")
    print(f"  {'-'*44}")
    for s in train_summary:
        print(f"  {s['person']:<20} {s['train_photos']:>6} {s['test_photos']:>6} {s['embedding_dim']:>8}")
    print(f"  {'-'*44}")
    print(f"  Total kelas   : {len(train_summary)}")
    print(f"  Output        : {OUTPUT_FILE}")
    print(f"  Test split    : test_split.json")
    print("=" * 60)
    print("\n▶ Jalankan test.py untuk evaluasi akurasi model.")


if __name__ == "__main__":
    train()
