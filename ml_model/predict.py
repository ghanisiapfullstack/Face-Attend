import numpy as np
import json
from deepface import DeepFace

EMBEDDINGS_FILE = "embeddings.json"
THRESHOLD = 0.6

def load_embeddings():
    try:
        with open(EMBEDDINGS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def predict(image):
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
        print(f"Error predicting: {e}")
        return None, 0