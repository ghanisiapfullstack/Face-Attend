import os
import numpy as np
import json
from deepface import DeepFace
from pathlib import Path

DATASET_DIR = "dataset"
OUTPUT_FILE = "embeddings.json"

def train():
    embeddings = {}
    
    print("🔄 Memulai proses training...")
    
    for person_name in os.listdir(DATASET_DIR):
        person_dir = os.path.join(DATASET_DIR, person_name)
        if not os.path.isdir(person_dir):
            continue
            
        photos = [f for f in os.listdir(person_dir) 
                  if f.endswith(('.jpg', '.jpeg', '.png'))]
        
        if not photos:
            print(f"  Tidak ada foto untuk {person_name}, skip!")
            continue
        
        print(f"📸 Processing {person_name} ({len(photos)} foto)...")
        person_embeddings = []
        
        for photo in photos:
            photo_path = os.path.join(person_dir, photo)
            try:
                embedding = DeepFace.represent(
                    img_path=photo_path,
                    model_name="Facenet",
                    enforce_detection=False
                )
                if embedding:
                    person_embeddings.append(embedding[0]["embedding"])
                    print(f"   ✅ {photo} berhasil diproses")
            except Exception as e:
                print(f"   ❌ {photo} gagal: {e}")
        
        if person_embeddings:
            # Rata-rata semua embedding
            avg_embedding = np.mean(person_embeddings, axis=0).tolist()
            embeddings[person_name] = {
                "embedding": avg_embedding,
                "photo_count": len(person_embeddings)
            }
            print(f"   ✅ {person_name} selesai!")
    
    # Simpan ke file JSON
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(embeddings, f)
    
    print(f"\n✅ Training selesai! {len(embeddings)} orang tersimpan di {OUTPUT_FILE}")

if __name__ == "__main__":
    train()