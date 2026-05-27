# FaceAttend — Progress Log
**Sesi:** a67c461f-1d59-4ae2-9e2c-3b4d84cfe52e  
**Tanggal:** 27 Mei 2026

---

## ✅ SELESAI

### 1. Migrasi Database — MySQL (Laragon) → Supabase PostgreSQL
- [x] Ganti driver `mysql-connector-python` → `psycopg2-binary`
- [x] Update `DATABASE_URL` format di `.env` dan `.env.example`
- [x] Rewrite light migrations di `main.py` ke PostgreSQL syntax
- [x] Ganti `Enum` columns → `String + CheckConstraint` (PG compatible)
- [x] Fix `bcrypt 5.0.0` → downgrade ke `4.0.1` (passlib compatibility)
- [x] Fix password truncate 72 bytes (bcrypt limit) di `auth.py`
- [x] Buat akun admin pertama via `ensure_admin.py`
- [x] Hapus quotes dari `SECRET_KEY` di `.env`

---

### 2. Bug Fixes — Backend
- [x] `delete_student` — cascade delete attendance, enrollment, user account
- [x] `delete_lecturer` — unlink courses, delete user account
- [x] `delete_course` — cascade delete attendance, sessions, schedules, enrollments
- [x] `delete_schedule` — cascade delete attendance, sessions, overrides
- [x] `get_lecturers` — tambah field `email` yang hilang
- [x] WebSocket `face.py` — fix db generator leak di `finally` block

### 3. Bug Fixes — Frontend
- [x] `Admin/Dosen.jsx` — tambah field NIP yang hilang (backend wajib)
- [x] `Admin/Users.jsx` — fix confirm dialog muncul saat page load
- [x] `Admin/Attendance.jsx` — fix date filter timezone bug
- [x] `Mahasiswa/Attendance.jsx` — fix date filter timezone bug
- [x] `Mahasiswa/Schedule.jsx` — fix kalender hanya tampil 1 hari, sekarang match by weekday semua bulan

---

### 4. Dokumentasi
- [x] `docs/PRD.md` — Product Requirements Document lengkap
- [x] `docs/ERD_mermaid.md` — ERD semua tabel (paste ke mermaid.live)
- [x] `docs/UML_1_usecase.md` — Use Case Diagram
- [x] `docs/UML_2_classdiagram.md` — Class Diagram
- [x] `docs/UML_3_sequence.md` — Sequence Diagram sesi absensi
- [x] `docs/UML_4_activity.md` — Activity Diagram face recognition
- [x] `docs/VP_GUIDE.md` — Panduan import ke Visual Paradigm
- [x] `README.md` — Rewrite total, up-to-date dengan stack baru

---

### 5. ML Scripts untuk Tugas Kuliah
- [x] `ml_model/train.py` — train/test split 80/20, summary output
- [x] `ml_model/test.py` — Accuracy, Precision, Recall, F1, FAR, FRR, Confusion Matrix
- [x] `ml_model/FaceAttend_ML.ipynb` — Notebook siap pakai di Google Colab (8 cell)
- [x] `ml_model/README_ML.md` — Panduan threshold tuning, pengaruh jumlah foto

---

### 6. Cleanup
- [x] Hapus semua file test (pytest, conftest, test_*.py)
- [x] Hapus `ml_model/predict.py`
- [x] Hapus `backend/test_faceattend.db`
- [x] Hapus `.env.test`

---

### 7. Push ke GitHub
- [x] Commit semua perubahan ke branch `main`
- [x] `docs/` belum di-push (pending)

---

## 🔄 IN PROGRESS — Migrasi Face Recognition ke InsightFace

### Latar Belakang
Dosen meminta sistem diubah dari:
- ❌ LiveCam WebSocket + ArcFace (DeepFace) — berat, lambat, tidak efisien
- ✅ InsightFace Buffalo_L + Smile Detection (MediaPipe) — ringan, 1 foto cukup

### Arsitektur Baru
```
Registrasi: Admin upload 1 foto → InsightFace extract embedding → simpan ke DB
Absensi:    Webcam aktif → MediaPipe deteksi senyum → capture foto →
            POST /api/face/recognize → InsightFace match → catat absensi
```

### Yang Sudah Selesai
- [x] `backend/requirements.txt` — tambah `insightface`, `onnxruntime`, hapus `deepface`, `tf-keras`
- [x] `backend/app/face_recognition.py` — rewrite total pakai InsightFace Buffalo_L
- [x] `backend/app/routes/face.py` — ganti WebSocket → HTTP POST `/api/face/recognize`
- [x] `backend/app/routes/users.py` — tambah `POST /api/users/students/{id}/face` untuk upload foto wajah
- [x] `backend/app/routes/users.py` — `get_students` sekarang return `has_embedding` status
- [x] `frontend/src/pages/Admin/Mahasiswa.jsx` — tambah kolom "Data Wajah" + tombol upload foto per mahasiswa
- [x] `frontend/src/pages/Dosen/Attendance.jsx` — rewrite total: hapus WebSocket, tambah MediaPipe smile detection + HTTP POST
- [x] `ml_model/train.py` — rewrite pakai InsightFace (bukan DeepFace)
- [x] `ml_model/test.py` — rewrite pakai InsightFace + tambah FAR/FRR metrics
- [x] `backend/.env.example` — update threshold values untuk InsightFace
- [x] Install `insightface` + `onnxruntime` di venv ✅

### Yang Belum Selesai
- [x] Install dependencies frontend: `@mediapipe/face_mesh` — via CDN (pinned version, sequential load, race condition fixed)
- [ ] Test end-to-end: upload foto mahasiswa → absensi dengan senyum
- [x] Update `ml_model/FaceAttend_ML.ipynb` untuk InsightFace
- [x] Update `ml_model/README_ML.md` untuk InsightFace
- [ ] Push semua perubahan ke GitHub

---

## 📋 TODO SELANJUTNYA

### Immediate (harus selesai dulu)
```
1. Restart backend → uvicorn app.main:app --reload --port 8000
2. Test upload foto wajah mahasiswa via Admin → Mahasiswa
3. Test absensi: buka sesi → aktifkan kamera → senyum → cek live log
4. Jika ada error, debug dan fix
```

### Setelah sistem berjalan
```
5. Update FaceAttend_ML.ipynb untuk InsightFace
6. Update README_ML.md
7. Push semua ke GitHub
8. Push docs/ ke GitHub
```

### Untuk Tugas ML
```
9. Tambah foto dataset (minimal 20-30 foto/orang)
10. Jalankan train.py → test.py
11. Analisis hasil: Accuracy, FAR, FRR, Confusion Matrix
12. Buat laporan berdasarkan hasil evaluasi
```

---

## 📁 File yang Berubah (Sesi Ini)

| File | Status | Keterangan |
|---|---|---|
| `backend/requirements.txt` | ✅ Done | insightface + onnxruntime |
| `backend/.env` | ✅ Done | Supabase PostgreSQL |
| `backend/.env.example` | ✅ Done | Updated threshold |
| `backend/app/database.py` | ✅ Done | PostgreSQL connection |
| `backend/app/models.py` | ✅ Done | String + CheckConstraint |
| `backend/app/auth.py` | ✅ Done | bcrypt fix |
| `backend/app/main.py` | ✅ Done | PG migrations |
| `backend/app/face_recognition.py` | ✅ Done | InsightFace |
| `backend/app/routes/face.py` | ✅ Done | HTTP POST (no WebSocket) |
| `backend/app/routes/users.py` | ✅ Done | face upload endpoint |
| `backend/app/routes/courses.py` | ✅ Done | cascade delete fix |
| `backend/app/routes/schedules.py` | ✅ Done | cascade delete fix |
| `frontend/src/pages/Admin/Mahasiswa.jsx` | ✅ Done | face upload UI |
| `frontend/src/pages/Admin/Dosen.jsx` | ✅ Done | NIP field fix |
| `frontend/src/pages/Admin/Users.jsx` | ✅ Done | role change fix |
| `frontend/src/pages/Admin/Attendance.jsx` | ✅ Done | date filter fix |
| `frontend/src/pages/Mahasiswa/Attendance.jsx` | ✅ Done | date filter fix |
| `frontend/src/pages/Mahasiswa/Schedule.jsx` | ✅ Done | calendar weekday fix |
| `frontend/src/pages/Dosen/Attendance.jsx` | ✅ Done | smile detection + HTTP |
| `ml_model/train.py` | ✅ Done | InsightFace |
| `ml_model/test.py` | ✅ Done | InsightFace + FAR/FRR |
| `ml_model/FaceAttend_ML.ipynb` | ✅ Done | rewrite ke InsightFace |
| `ml_model/README_ML.md` | ✅ Done | rewrite ke InsightFace |
| `docs/` | ⏳ Pending | belum di-push ke GitHub |
| `README.md` | ✅ Done | rewrite total |

---

## 🔧 Cara Jalankan Sekarang

```bash
# Terminal 1 — Backend
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

**Akun admin:** `admin@faceattend.com` / `admin123`

**Threshold InsightFace** (di `backend/.env`):
```env
FACE_MATCH_THRESHOLD=0.4
FACE_MATCH_MARGIN=0.05
```
