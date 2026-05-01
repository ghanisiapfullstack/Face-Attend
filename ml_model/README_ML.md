# Face Recognition - Machine Learning Assignment

## Overview
Proyek ini mengimplementasikan **face recognition** untuk sistem absensi menggunakan
**Transfer Learning** dengan DeepFace (ArcFace model pretrained pada MS-Celeb-1M).

Pendekatan: ekstrak embedding wajah dari model pretrained, lalu klasifikasi
menggunakan **Cosine Similarity + Threshold**.

---

## Struktur File
```
ml_model/
├── dataset/              # Foto per orang (subfolder = nama orang)
│   ├── ghani/
│   │   ├── foto1.jpg
│   │   └── ...
│   └── Radit/
│       └── ...
├── train.py              # Feature extraction & simpan embeddings
├── test.py               # Evaluasi model (accuracy, F1, confusion matrix)
├── embeddings.json       # Output train.py — dipakai backend
├── test_split.json       # Output train.py — dibaca test.py
├── test_results.json     # Output test.py — hasil evaluasi lengkap
└── README_ML.md
```

---

## Cara Pakai

### 1. Siapkan dataset
Taruh foto di `dataset/<NamaOrang>/` minimal **20-30 foto per orang**.
Variasikan: sudut, pencahayaan, ekspresi.

### 2. Training
```bash
cd ml_model
python train.py
```
- Split otomatis: **80% train, 20% test**
- Output: `embeddings.json`, `test_split.json`

### 3. Testing / Evaluasi
```bash
python test.py
```
- Output: Accuracy, Precision, Recall, F1, Confusion Matrix
- Disimpan ke `test_results.json`

---

## Konfigurasi Threshold

Ubah nilai ini di bagian atas `test.py` (dan `face_recognition.py` untuk backend):

| Parameter | Default | Keterangan |
|---|---|---|
| `THRESHOLD` | `0.68` | Minimum cosine similarity untuk dianggap match. Naikkan jika banyak false positive. |
| `MATCH_MARGIN` | `0.05` | Selisih minimum skor #1 vs #2. Naikkan jika dua orang sering tertukar. |

### Panduan tuning:

**THRESHOLD**
- `0.60` → Longgar, lebih banyak yang dikenali tapi rawan salah orang
- `0.68` → Default, seimbang *(rekomendasi untuk dataset kecil)*
- `0.75` → Ketat, lebih sedikit false positive tapi lebih banyak "unknown"

**MATCH_MARGIN**
- `0.03` → Sangat longgar, cocok jika hanya ada 2-3 orang di kelas
- `0.05` → Default *(rekomendasi untuk dataset kecil <30 foto/orang)*
- `0.08` → Ketat, cocok jika dataset besar dan foto variatif

### Contoh: dataset kecil (<15 foto/orang)
```python
THRESHOLD    = 0.65
MATCH_MARGIN = 0.03
```

### Contoh: dataset besar (>30 foto/orang)
```python
THRESHOLD    = 0.72
MATCH_MARGIN = 0.08
```

---

## Pengaruh Jumlah Foto terhadap Akurasi

| Jumlah foto/orang | Kualitas embedding | Ekspektasi akurasi |
|---|---|---|
| < 10 foto | Buruk — rata-rata tidak representatif | < 50% |
| 10–20 foto | Cukup | 50–80% |
| 20–30 foto | Baik | 80–95% |
| > 30 foto (variatif) | Sangat baik | > 95% |

> **Catatan:** Ghani (8 foto) score rendah (0.30) karena foto test kondisinya
> berbeda dari training set — ini menunjukkan bahwa **kualitas dan kuantitas data
> sangat mempengaruhi performa model**, bukan model-nya yang salah.

---

## Model yang Digunakan

| Komponen | Detail |
|---|---|
| **Model** | ArcFace (via DeepFace) |
| **Pretrained on** | MS-Celeb-1M (~10 juta foto, 100k orang) |
| **Embedding dim** | 512 |
| **Metode klasifikasi** | Cosine Similarity + Threshold |
| **Tipe learning** | Transfer Learning / Feature Extraction |

---

## Untuk Jupyter Notebook / Google Colab

Copy isi `train.py` dan `test.py` ke cell-cell notebook.
Install dependencies:
```python
!pip install deepface tf-keras numpy
```
