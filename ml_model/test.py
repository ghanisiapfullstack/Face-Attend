"""
=============================================================
  FACE RECOGNITION - TESTING / EVALUATION SCRIPT
  Model   : DeepFace - ArcFace (Pretrained on MS-Celeb-1M)
  Method  : Cosine Similarity + Threshold Classification
  Metrics : Accuracy, Precision, Recall, F1-Score,
            Confusion Matrix
=============================================================

Cara pakai:
    1. Jalankan train.py dulu untuk generate embeddings.json & test_split.json
    2. python test.py

Cocok untuk dipindah ke Jupyter Notebook / Google Colab.
=============================================================
"""

import json
import os

import numpy as np
from deepface import DeepFace

# ── Config ────────────────────────────────────────────────
EMBEDDINGS_FILE  = "embeddings.json"
TEST_SPLIT_FILE  = "test_split.json"
MODEL_NAME       = "ArcFace"
THRESHOLD        = 0.68    # minimum cosine similarity untuk dianggap match
MATCH_MARGIN     = 0.05    # selisih minimum skor #1 vs #2 (lebih longgar untuk dataset kecil)
# ─────────────────────────────────────────────────────────


# ── Helper functions ──────────────────────────────────────

def cosine_similarity(a, b):
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def get_embedding(img_path: str) -> list | None:
    """Extract embedding dari satu gambar."""
    try:
        result = DeepFace.represent(
            img_path=img_path,
            model_name=MODEL_NAME,
            enforce_detection=False,
        )
        if result:
            return result[0]["embedding"]
    except Exception as e:
        print(f"   ⚠ Gagal: {img_path} → {e}")
    return None


def predict(face_embedding: list, embeddings: dict) -> tuple[str | None, float, float]:
    """
    Prediksi identitas dari embedding.

    Returns:
        (predicted_label, best_score, second_score)
        predicted_label = None jika tidak ada yang melewati threshold
    """
    best_label   = None
    best_score   = -1.0
    second_score = -1.0

    for person_name, data in embeddings.items():
        score = cosine_similarity(face_embedding, data["embedding"])
        if score > best_score:
            second_score = best_score
            best_score   = score
            best_label   = person_name
        elif score > second_score:
            second_score = score

    if second_score < 0:
        second_score = 0.0

    if (
        best_label
        and best_score >= THRESHOLD
        and (best_score - second_score) >= MATCH_MARGIN
    ):
        return best_label, best_score, second_score

    return None, best_score, second_score


def compute_metrics(y_true: list, y_pred: list, labels: list) -> dict:
    """
    Hitung Accuracy, Precision, Recall, F1 (macro average).
    y_pred = None berarti model tidak mengenali (unknown).
    """
    n = len(labels)

    # Confusion matrix: baris = actual, kolom = predicted
    # Tambah kolom "unknown" untuk prediksi None
    label_to_idx = {l: i for i, l in enumerate(labels)}
    cm = np.zeros((n, n + 1), dtype=int)   # +1 untuk kolom unknown

    for true, pred in zip(y_true, y_pred):
        true_idx = label_to_idx.get(true, -1)
        if true_idx == -1:
            continue
        if pred is None or pred not in label_to_idx:
            pred_idx = n   # kolom unknown
        else:
            pred_idx = label_to_idx[pred]
        cm[true_idx][pred_idx] += 1

    # Per-class metrics
    precisions, recalls, f1s = [], [], []
    for i, label in enumerate(labels):
        tp = cm[i][i]
        fp = cm[:, i].sum() - tp
        fn = cm[i, :].sum() - tp

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall    = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1        = (2 * precision * recall / (precision + recall)
                     if (precision + recall) > 0 else 0.0)

        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)

    # Overall accuracy (hanya prediksi yang benar, bukan unknown)
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    accuracy = correct / len(y_true) if y_true else 0.0

    return {
        "accuracy"          : accuracy,
        "macro_precision"   : float(np.mean(precisions)),
        "macro_recall"      : float(np.mean(recalls)),
        "macro_f1"          : float(np.mean(f1s)),
        "per_class"         : {
            label: {
                "precision" : precisions[i],
                "recall"    : recalls[i],
                "f1"        : f1s[i],
            }
            for i, label in enumerate(labels)
        },
        "confusion_matrix"  : cm.tolist(),
        "cm_labels"         : labels + ["unknown"],
    }


# ── Main evaluation 

def evaluate():
    print("=" * 60)
    print("  FACE RECOGNITION - EVALUATION")
    print(f"  Model     : {MODEL_NAME} (Pretrained - DeepFace)")
    print(f"  Threshold : {THRESHOLD}")
    print(f"  Margin    : {MATCH_MARGIN}")
    print("=" * 60)

    # Load embeddings
    if not os.path.exists(EMBEDDINGS_FILE):
        print(f"❌ {EMBEDDINGS_FILE} tidak ditemukan. Jalankan train.py dulu!")
        return
    with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
        embeddings = json.load(f)

    # Load test split
    if not os.path.exists(TEST_SPLIT_FILE):
        print(f"❌ {TEST_SPLIT_FILE} tidak ditemukan. Jalankan train.py dulu!")
        return
    with open(TEST_SPLIT_FILE, "r", encoding="utf-8") as f:
        test_split = json.load(f)

    labels = list(embeddings.keys())
    print(f"\n📋 Kelas terdaftar : {labels}")
    print(f"📋 Kelas test      : {list(test_split.keys())}\n")

    y_true      = []
    y_pred      = []
    detail_rows = []

    for true_label, photo_paths in test_split.items():
        if not photo_paths:
            print(f"  ⚠ {true_label}: tidak ada foto test, skip.")
            continue

        print(f"🔍 Testing: {true_label} ({len(photo_paths)} foto)")

        for path in photo_paths:
            emb = get_embedding(path)
            if emb is None:
                print(f"   ⚠ Skip (gagal extract embedding): {path}")
                continue

            pred_label, best_sc, second_sc = predict(emb, embeddings)
            correct = "✅" if pred_label == true_label else "❌"

            print(f"   {correct} {os.path.basename(path):<30} "
                  f"pred={pred_label or 'unknown':<15} "
                  f"score={best_sc:.4f}  margin={best_sc - second_sc:.4f}")

            y_true.append(true_label)
            y_pred.append(pred_label)
            detail_rows.append({
                "file"       : os.path.basename(path),
                "true"       : true_label,
                "predicted"  : pred_label or "unknown",
                "correct"    : pred_label == true_label,
                "best_score" : round(best_sc, 4),
                "margin"     : round(best_sc - second_sc, 4),
            })

        print()

    if not y_true:
        print("❌ Tidak ada data test yang berhasil diproses.")
        return

    # ── Compute metrics ───────────────────────────────────
    metrics = compute_metrics(y_true, y_pred, labels)

    # ── Print results ─────────────────────────────────────
    print("=" * 60)
    print("  HASIL EVALUASI")
    print("=" * 60)
    print(f"  Total sampel test : {len(y_true)}")
    print(f"  Benar diprediksi  : {sum(1 for t,p in zip(y_true,y_pred) if t==p)}")
    print(f"  Tidak dikenali    : {sum(1 for p in y_pred if p is None)}")
    print()
    print(f"  Accuracy          : {metrics['accuracy']*100:.2f}%")
    print(f"  Macro Precision   : {metrics['macro_precision']*100:.2f}%")
    print(f"  Macro Recall      : {metrics['macro_recall']*100:.2f}%")
    print(f"  Macro F1-Score    : {metrics['macro_f1']*100:.2f}%")

    print("\n  Per-Class Metrics:")
    print(f"  {'Kelas':<20} {'Precision':>10} {'Recall':>10} {'F1':>10}")
    print(f"  {'-'*52}")
    for label, m in metrics["per_class"].items():
        print(f"  {label:<20} {m['precision']*100:>9.2f}% "
              f"{m['recall']*100:>9.2f}% {m['f1']*100:>9.2f}%")

    # ── Confusion Matrix ──────────────────────────────────
    cm     = np.array(metrics["confusion_matrix"])
    cm_lbl = metrics["cm_labels"]

    print(f"\n  Confusion Matrix:")
    cm_header_label = "Actual / Pred"
    header = f"  {cm_header_label:<20}" + "".join(f"{l:>12}" for l in cm_lbl)
    print(header)
    print(f"  {'-' * (20 + 12 * len(cm_lbl))}")
    for i, row_label in enumerate(labels):
        row = f"  {row_label:<20}" + "".join(f"{cm[i][j]:>12}" for j in range(len(cm_lbl)))
        print(row)

    print("=" * 60)

    # ── Save results ──────────────────────────────────────
    results = {
        "model"            : MODEL_NAME,
        "threshold"        : THRESHOLD,
        "match_margin"     : MATCH_MARGIN,
        "total_test"       : len(y_true),
        "metrics"          : metrics,
        "detail"           : detail_rows,
    }
    with open("test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\n  📄 Detail hasil disimpan di: test_results.json")
    print("=" * 60)
    print()
    print("  ANALISIS & CATATAN:")
    print("  - Score rendah (<0.5) = foto test sangat berbeda dari")
    print("    rata-rata embedding training (pencahayaan/sudut berbeda)")
    print("  - Tambah lebih banyak foto training (20-30/orang) untuk")
    print("    meningkatkan akurasi embedding rata-rata")
    print("  - MATCH_MARGIN tinggi = lebih ketat, cocok untuk dataset besar")
    print("  - MATCH_MARGIN rendah = lebih longgar, cocok untuk dataset kecil")
    print("=" * 60)


if __name__ == "__main__":
    evaluate()
