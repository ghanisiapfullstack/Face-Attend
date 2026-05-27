# 📋 Product Requirements Document (PRD)
## FaceAttend — Sistem Absensi Berbasis Pengenalan Wajah

| | |
|---|---|
| **Versi** | 1.0 |
| **Tanggal** | Mei 2026 |
| **Status** | Active |
| **Tim** | Ghani, dkk |

---

## 📌 Daftar Isi

1. [Latar Belakang](#1-latar-belakang)
2. [Tujuan Produk](#2-tujuan-produk)
3. [Pengguna & Role](#3-pengguna--role)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Arsitektur Sistem](#6-arsitektur-sistem)
7. [Alur Kerja Utama](#7-alur-kerja-utama)
8. [Tech Stack](#8-tech-stack)
9. [Batasan Sistem](#9-batasan-sistem)

---

## 1. Latar Belakang

Proses absensi manual di kelas perguruan tinggi memiliki beberapa masalah utama:

| Masalah | Dampak |
|---|---|
| Absensi manual memakan waktu | 5–10 menit terbuang per sesi kelas |
| Rawan titip absen | Data kehadiran tidak akurat |
| Rekap manual oleh dosen | Tidak ada visibilitas real-time |
| Mahasiswa tidak tahu status kehadiran | Tidak bisa memantau persentase hadir |

**FaceAttend** hadir sebagai solusi absensi otomatis berbasis pengenalan wajah yang terintegrasi dengan jadwal kuliah dan manajemen data akademik. Mahasiswa cukup menghadap kamera — sistem mencatat kehadiran secara otomatis.

---

## 2. Tujuan Produk

- ✅ Menghilangkan proses absensi manual yang memakan waktu kelas
- ✅ Mencegah kecurangan titip absen
- ✅ Menyediakan rekap kehadiran real-time untuk dosen dan admin
- ✅ Memberikan visibilitas kehadiran kepada mahasiswa
- ✅ Mendukung manajemen jadwal termasuk kelas pengganti

---

## 3. Pengguna & Role

```
┌─────────────────────────────────────────────────────┐
│                   FaceAttend Users                  │
├───────────────┬──────────────────┬──────────────────┤
│     Admin     │      Dosen       │    Mahasiswa     │
├───────────────┼──────────────────┼──────────────────┤
│ Full access   │ Manage sesi      │ View only        │
│ CRUD semua    │ Buka/tutup sesi  │ Lihat jadwal     │
│ data master   │ Aktifkan kamera  │ Lihat riwayat    │
│               │ Jadwal pengganti │ Notifikasi sesi  │
└───────────────┴──────────────────┴──────────────────┘
```

| Role | Akses | Deskripsi |
|---|---|---|
| **Admin** | Full | Mengelola seluruh data master sistem |
| **Dosen** | Partial | Mengelola sesi absensi kelas yang diampu |
| **Mahasiswa** | Read-only | Melihat jadwal dan riwayat kehadiran pribadi |

---

## 4. Functional Requirements

### 4.1 Autentikasi & Profil

| ID | Requirement | Role |
|---|---|---|
| FR-01 | Login dengan email dan password | Semua |
| FR-02 | JWT token dengan expiry 24 jam | Semua |
| FR-03 | Update nama dan foto profil | Semua |
| FR-04 | Ganti password dengan verifikasi password lama | Semua |
| FR-05 | Admin dapat reset password user lain | Admin |

### 4.2 Manajemen Data Master

| ID | Requirement | Role |
|---|---|---|
| FR-06 | CRUD data mahasiswa (nama, NIM, email, password) | Admin |
| FR-07 | CRUD data dosen (nama, NIP, email, password) | Admin |
| FR-08 | CRUD mata kuliah (kode, nama, dosen pengampu, SKS) | Admin |
| FR-09 | CRUD jadwal kelas (hari, jam, ruangan) | Admin |
| FR-10 | Enroll/remove mahasiswa ke mata kuliah | Admin |
| FR-11 | Ubah role pengguna (admin/dosen/mahasiswa) | Admin |

### 4.3 Sesi Absensi

| ID | Requirement | Role |
|---|---|---|
| FR-12 | Buka sesi absensi untuk jadwal yang diampu | Dosen, Admin |
| FR-13 | Aktifkan kamera untuk scanning wajah real-time via WebSocket | Dosen, Admin |
| FR-14 | Sistem mengenali wajah dan mencatat kehadiran otomatis | System |
| FR-15 | Status "Hadir" jika tepat waktu, "Terlambat" jika >15 menit | System |
| FR-16 | Cegah duplikasi absensi dalam satu sesi | System |
| FR-17 | Hanya mahasiswa yang enrolled di MK yang bisa dikenali | System |
| FR-18 | Tutup/kunci sesi absensi | Dosen, Admin |
| FR-19 | Live log kehadiran real-time saat sesi berlangsung | Dosen |

### 4.4 Jadwal & Kelas Pengganti

| ID | Requirement | Role |
|---|---|---|
| FR-20 | Lihat jadwal mengajar dalam format tabel | Dosen |
| FR-21 | Buat jadwal kelas pengganti (tanggal, jam, ruangan baru) | Dosen |
| FR-22 | Edit dan hapus jadwal kelas pengganti | Dosen |
| FR-23 | Mahasiswa melihat jadwal dalam tampilan kalender interaktif | Mahasiswa |
| FR-24 | Kalender menampilkan kelas pengganti dengan indikator berbeda | Mahasiswa |

### 4.5 Dashboard & Monitoring

| ID | Requirement | Role |
|---|---|---|
| FR-25 | Dashboard admin: total mahasiswa, dosen, MK, absensi hari ini | Admin |
| FR-26 | Dashboard dosen: rekap kehadiran per mata kuliah | Dosen |
| FR-27 | Dashboard mahasiswa: persentase kehadiran per MK | Mahasiswa |
| FR-28 | Notifikasi banner jika ada sesi absensi aktif untuk MK yang diikuti | Mahasiswa |
| FR-29 | Riwayat absensi dengan filter tanggal dan mata kuliah | Mahasiswa |
| FR-30 | Admin dapat melihat dan menghapus semua data absensi | Admin |

---

## 5. Non-Functional Requirements

| ID | Kategori | Requirement |
|---|---|---|
| NFR-01 | **Performance** | Face recognition berjalan async (threadpool) agar tidak memblokir WebSocket event loop |
| NFR-02 | **Performance** | Embeddings di-cache in-memory, tidak dibaca dari disk per frame |
| NFR-03 | **Performance** | API endpoint non-ML merespons < 500ms |
| NFR-04 | **Security** | JWT token expire dalam 24 jam |
| NFR-05 | **Security** | Password di-hash menggunakan bcrypt |
| NFR-06 | **Security** | Face recognition hanya dibandingkan ke kandidat enrolled (bukan semua mahasiswa) |
| NFR-07 | **Reliability** | Database di-host di cloud (Supabase PostgreSQL) |
| NFR-08 | **Usability** | Frontend responsif untuk desktop dan tablet |
| NFR-09 | **Scalability** | Sistem mendukung multiple koneksi WebSocket bersamaan |

---

## 6. Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Admin Pages │  │ Dosen Pages │  │ Mahasiswa Pages │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│              Axios + JWT Bearer Token                    │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP REST + WebSocket
┌──────────────────────────▼───────────────────────────────┐
│                  FastAPI Backend (Uvicorn)                │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Routes: auth, users, courses, schedules,          │  │
│  │          attendance, face (WebSocket)              │  │
│  └────────────────────────────────────────────────────┘  │
│         │                          │                     │
│  SQLAlchemy ORM            DeepFace ArcFace              │
│         │                          │                     │
│  PostgreSQL (Supabase)    embeddings.json (cache)        │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Alur Kerja Utama

### Setup Awal (Admin)
```
1. Tambah Dosen
2. Tambah Mahasiswa
3. Buat Mata Kuliah → assign Dosen Pengampu
4. Buat Jadwal Kelas (hari, jam, ruangan)
5. Enroll Mahasiswa ke Mata Kuliah
6. Generate embeddings wajah (python train.py)
```

### Sesi Absensi (Dosen)
```
1. Login → halaman Sesi Absensi Kelas
2. Pilih jadwal → klik Buka Sesi
3. Klik Aktifkan Kamera → WebSocket terhubung
4. Mahasiswa menghadap kamera → terdeteksi otomatis
5. Live log menampilkan nama + status real-time
6. Klik Akhiri & Kunci Sesi → sesi ditutup
```

### Pengalaman Mahasiswa
```
1. Login → Dashboard
2. Lihat banner notifikasi jika sesi aktif
3. Hadap kamera di kelas → tercatat otomatis
4. Lihat riwayat kehadiran & persentase per MK
5. Lihat jadwal di kalender interaktif
```

---

## 8. Tech Stack

| Layer | Teknologi | Versi |
|---|---|---|
| **Frontend** | React | 19 |
| | Vite | Latest |
| | Tailwind CSS | v4 |
| | Framer Motion | Latest |
| | react-webcam | Latest |
| | Axios | Latest |
| **Backend** | FastAPI | Latest |
| | SQLAlchemy | Latest |
| | Uvicorn | Latest |
| | python-jose (JWT) | Latest |
| | bcrypt | 4.0.1 |
| **Database** | PostgreSQL (Supabase) | Latest |
| **Face Recognition** | DeepFace (ArcFace) | Latest |
| | OpenCV | Latest |
| | NumPy | Latest |
| **Realtime** | WebSocket | Native |
| **Deployment** | Render (Backend) | — |

---

## 9. Batasan Sistem

| Batasan | Keterangan |
|---|---|
| Pencahayaan | Pengenalan wajah membutuhkan pencahayaan yang cukup |
| Enrollment wajib | Mahasiswa harus di-enroll ke MK agar bisa dikenali |
| Dataset | Minimal 20–30 foto per orang untuk akurasi optimal |
| Model change | Embeddings harus di-generate ulang jika model berubah |
| OAuth | Belum mendukung login Google/GitHub/Facebook |
| Mobile | Belum dioptimalkan untuk smartphone |
