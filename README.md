# FaceAttend

Sistem absensi kelas berbasis **pengenalan wajah**. Admin mengelola data master; dosen (atau admin) membuka **sesi absensi** per jadwal; mahasiswa cukup menghadapkan wajah ke kamera tanpa login per orang.

---

## Isi dokumentasi

1. [Arsitektur singkat](#arsitektur-singkat)
2. [Struktur folder](#struktur-folder)
3. [Prasyarat](#prasyarat)
4. [Database MySQL](#database-mysql)
5. [Model wajah (embeddings)](#model-wajah-embeddings)
6. [Menjalankan backend](#menjalankan-backend)
7. [Menjalankan frontend](#menjalankan-frontend)
8. [Peran pengguna & alur kerja](#peran-pengguna--alur-kerja)
9. [Ringkasan API](#ringkasan-api)
10. [Sesi absensi & WebSocket](#sesi-absensi--websocket)
11. [Masalah umum](#masalah-umum)

---

## Arsitektur singkat

```
┌─────────────┐     HTTP (REST)      ┌─────────────┐
│   React     │ ◄──────────────────► │   FastAPI   │
│   (Vite)    │     Bearer JWT       │   Backend   │
└─────────────┘                      └──────┬──────┘
       │                                   │
       │  WebSocket (scan wajah)           │  SQLAlchemy
       └──────────────────────────────────►│  MySQL
                                           └─────────────┘

Embeddings wajah: file JSON (DeepFace Facenet) ──► dibaca saat inferensi
```

- **Frontend**: React 19, Vite, React Router, Axios, `react-webcam`, `framer-motion`, `date-fns`, `lucide-react`.
- **Backend**: FastAPI, SQLAlchemy, MySQL, JWT (`python-jose` + bcrypt).
- **Face recognition**: DeepFace (Facenet), OpenCV, NumPy. Embedding referensi disimpan di `ml_model/embeddings.json` dan otomatis di-*cache* (in-memory) saat server berjalan.

---

## Pembaruan Terkini (Performa & UI)

1. **Async Backend Optimization**: Proses deteksi DeepFace sekarang berjalan di dalam **threadpool** (`run_in_threadpool`) agar WebSocket tidak memblokir (*freeze*) antrean *event loop* ketika banyak mahasiswa absen bersamaan.
2. **In-Memory Cache**: `embeddings.json` tidak lagi dibaca secara berulang dari disk per-frame, melainkan disimpan pada Memory/RAM.
3. **UI Mahasiswa**: Fitur kalender interaktif untuk halaman Jadwal menggunakan *CSS Grid* dan pustaka `date-fns`. Halaman riwayat absensi dirombak menjadi tampilan jejak waktu (*Timeline*), dilengkapi animasi UX menggunakan `framer-motion`.

---

## Struktur folder

| Path | Fungsi |
|------|--------|
| `frontend/` | UI web: hal_admin, dosen, mahasiswa; konteks auth; pemanggilan API. |
| `backend/app/main.py` | Entry FastAPI: CORS, router, `create_all`, migrasi ringan kolom `session_id`. |
| `backend/app/models.py` | Entitas DB: User, Student, Lecturer, Course, Schedule, AttendanceSession, Attendance. |
| `backend/app/database.py` | URL koneksi MySQL & session factory. |
| `backend/app/auth.py` | JWT, hash password, `get_current_user`, `require_admin`, `require_dosen`. |
| `backend/app/routes/` | `auth`, `users`, `attendance`, `schedules`, `courses`, `face` (termasuk WebSocket). |
| `backend/app/face_recognition.py` | Load embeddings, `recognize_face(image)`. |
| `ml_model/` | `train.py` (bikin `embeddings.json` dari folder foto), `predict.py` (uji cepat). |

---

## Prasyarat

- **Python** 3.x (disarankan sesuai yang dipakai di venv proyek).
- **Node.js** + npm (untuk Vite/React).
- **MySQL** berjalan lokal (atau sesuaikan URL di `backend/app/database.py`).
- Dependensi ML (TensorFlow/Keras lewat `deepface` / `tf-keras`) — instalasi pertama bisa memakan waktu.

---

## Database MySQL

1. Buat database, misalnya: `face_attend`.
2. Sesuaikan string koneksi di `backend/app/database.py`:

   ```text
   mysql+mysqlconnector://USER:PASSWORD@HOST:PORT/DATABASE
   ```

3. Saat pertama kali backend dijalankan, **SQLAlchemy** membuat tabel dari model (`create_all`). Untuk database yang sudah ada, ada **migrasi ringan** di `main.py` yang menambah kolom `attendances.session_id` jika belum ada.

---

## Model wajah (embeddings)

1. Siapkan folder dataset: `ml_model/dataset/<NAMA_ORANG>/` berisi foto `.jpg`/`.jpeg`/`.png`.
2. Dari folder `ml_model`, jalankan:

   ```bash
   python train.py
   ```

   Output: `ml_model/embeddings.json` (nama key harus **cukup cocok** dengan nama mahasiswa di DB agar pencarian `ilike` berhasil).

3. Path file embedding di backend saat ini di-hardcode di `backend/app/face_recognition.py` (`EMBEDDINGS_FILE`). Untuk deployment tim, disarankan nanti dipindah ke env/config agar path tidak mengikat satu mesin.

---

## Menjalankan backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API default: `http://127.0.0.1:8000`  
Dokumentasi interaktif: `http://127.0.0.1:8000/docs`

> Catatan: periksa `requirements.txt`; baris dependensi seharusnya termasuk `python-dotenv` (tanpa kesalahan ketik). Jika baris rusak, perbaiki manual sebelum `pip install`.

---

## Menjalankan frontend

```bash
cd frontend
npm install
npm run dev
```

Development server biasanya: `http://localhost:5173`

Di `frontend/src/utils/api.js`, `baseURL` diarahkan ke `http://localhost:8000` — samakan dengan port backend.

---

## Peran pengguna & alur kerja

| Peran | Login | Kegiatan utama |
|-------|--------|----------------|
| **admin** | Ya | Kelola mahasiswa, dosen, mata kuliah, jadwal, user/role, lihat semua absensi, hapus absensi, bisa buka menu sesi kelas (override). |
| **dosen** | Ya | Lihat jadwal miliknya (`GET /api/schedules/my`), **buka/tutup sesi absensi**, aktifkan kamera, lihat log & riwayat sesi. |
| **mahasiswa** | Ya | Lihat dashboard & **riwayat absensi** sendiri; **tidak** perlu membuka kamera untuk absen massal (itu di sisi dosen). |

### Penting: relasi dosen ↔ mata kuliah ↔ jadwal

- **Mata kuliah** punya field **dosen pengampu** (`lecturer_id`).
- **Jadwal** menaut ke **mata kuliah** (`course_id`).
- Jadwal yang muncul untuk dosen di aplikasi = jadwal yang **course**-nya mengarah ke `lecturers.id` akun dosen tersebut.

Jika akun dibuat sebagai dosen lewat **ubah role** di admin, backend akan mencoba membuat baris `lecturers` otomatis saat login/ubah role agar query jadwal tidak kosong.

---

## Ringkasan API

Base path: `/api/...`  
Header otentikasi (kecuali login/register): `Authorization: Bearer <access_token>`

| Area | Metode | Path | Catatan |
|------|--------|------|---------|
| Auth | POST | `/api/auth/login` | Body: email, password → JWT + role. |
| Auth | POST | `/api/auth/register` | Untuk dev; dosen/mahasiswa “lengkap” lebih baik lewat menu admin. |
| Users | — | `/api/users/students`, `/lecturers`, `/all`, `/role/{id}` | Sebagian besar butuh **admin**. |
| Courses | GET/POST/DELETE | `/api/courses` | Admin. |
| Schedules | GET/POST/DELETE | `/api/schedules` | Admin (list semua jadwal). |
| Schedules | GET | `/api/schedules/my` | **Dosen & admin** — jadwal yang relevan. |
| Attendance | GET | `/api/attendance/all` | Admin. |
| Attendance | GET | `/api/attendance/dosen` | Dosen (terfilter course); admin melihat semua. |
| Attendance | GET | `/api/attendance/my` | Mahasiswa. |
| Attendance | GET | `/api/attendance/stats` | Admin. |
| Attendance | DELETE | `/api/attendance/{id}` | Admin. |
| Sesi | GET | `/api/attendance/sessions` | Dosen/admin. |
| Sesi | POST | `/api/attendance/sessions/open` | Body: `{ "schedule_id": <id> }`. |
| Sesi | POST | `/api/attendance/sessions/{id}/close` | Tutup = kunci absensi untuk sesi itu. |
| Health | GET | `/` | Cek API hidup. |

Detail lengkap: buka `/docs` saat backend jalan.

---

## Sesi absensi & WebSocket

Alur yang diharapkan:

1. Dosen (atau admin) login → **Sesi Absensi Kelas** (`/dosen/attendance`).
2. Pilih **jadwal** → **Buka sesi** → backend membuat/ memakai `AttendanceSession` berstatus `open`.
3. **Aktifkan kamera** → frontend membuka WebSocket:

   ```text
   ws://localhost:8000/api/face/ws?token=<JWT>&session_id=<id>
   ```

4. Frame dikirim sebagai JSON dengan field `image` (base64 data URL).
5. Server decode gambar → DeepFace embedding → cocokkan ke `embeddings.json` → cari mahasiswa di DB → cek duplikasi **per sesi** → insert `Attendance` dengan `session_id` dan status hadir/terlambat (+15 menit dari jam mulai jadwal).
6. **Tutup sesi** → status `closed`; koneksi scan untuk sesi tersebut ditolak.

**Keamanan singkat**: token JWT tidak boleh dibocorkan; query `token` di WebSocket praktis tetapi kurang ideal untuk produksi (pertimbangkan cookie/httpOnly atau subprotocol di iterasi berikutnya).

---

## Masalah umum

| Gejala | Kemungkinan penyebab |
|--------|---------------------|
| Jadwal dosen kosong | Course tidak di-assign ke dosen tersebut; atau belum ada baris `lecturers` untuk user (login ulang setelah ubah role dosen). |
| Wajah tidak dikenali | `embeddings.json` kosong/salah path; nama folder dataset tidak mirip `students.name`; threshold di `face_recognition.py`. |
| WebSocket error / ditolak | Sesi sudah ditutup; `token` atau `session_id` salah; user bukan dosen/admin. |
| CORS error | Pastikan origin frontend (`5173`/`3000`) ada di `CORSMiddleware` di `main.py`. |
| Kolom DB error | Jalankan ulang backend agar migrasi ringkas `session_id` jalan; atau cek manual tabel `attendance_sessions` sudah terbentuk. |

---

## Kontribusi & versi dokumentasi

Dokumen ini menggambarkan perilaku kode di repo **FaceAttend** pada saat penulisan. Jika ada perubahan endpoint atau flow, **update bagian terkait di file ini** agar tim tetap selaras.
