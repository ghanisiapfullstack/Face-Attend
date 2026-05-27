# Panduan Import & Buat Diagram di Visual Paradigm

## Cara Import XML

1. Buka **Visual Paradigm**
2. **File → Import → XML/XMI Import**
3. Pilih `ERD_FaceAttend.xml` atau `UML_FaceAttend.xml`
4. Klik **Import**

> Jika import tidak sempurna, gunakan referensi di bawah untuk buat manual.

---

## 1. ERD (Entity Relationship Diagram)

**Cara buat di VP:**
- New Diagram → **Entity Relationship Diagram**
- Gunakan tool **Entity** untuk setiap tabel
- Gunakan tool **Relationship** untuk relasi antar tabel

### Tabel & Relasi

```
users ──────────────── students          (1 : 0..1)
users ──────────────── lecturers         (1 : 0..1)
lecturers ─────────── courses            (1 : 0..*)
courses ────────────── schedules         (1 : 0..*)
students ───────────── enrollments       (1 : 0..*)
courses ────────────── enrollments       (1 : 0..*)
schedules ──────────── schedule_overrides (1 : 0..*)
schedules ──────────── attendance_sessions (1 : 0..*)
attendance_sessions ── attendances       (1 : 0..*)
students ───────────── attendances       (1 : 0..*)
schedules ──────────── attendances       (1 : 0..*)
```

### Layout yang disarankan (kiri ke kanan):
```
[users] ──→ [students] ──→ [enrollments] ←── [courses] ──→ [schedules]
   │              │                                │              │
   └──→ [lecturers]                    [schedule_overrides]  [attendance_sessions]
                                                                   │
                                                              [attendances]
```

---

## 2. Use Case Diagram

**Cara buat di VP:**
- New Diagram → **Use Case Diagram**
- Tambah **Actor** (orang) dan **Use Case** (oval)
- Gunakan **Association** untuk hubungkan actor ke use case
- Gunakan **<<include>>** untuk relasi include

### Actors & Use Cases

**Admin:**
- Login
- Kelola Mahasiswa (CRUD)
- Kelola Dosen (CRUD)
- Kelola Mata Kuliah (CRUD)
- Kelola Jadwal (CRUD)
- Enroll Mahasiswa ke Mata Kuliah
- Kelola User & Role
- Reset Password User
- Lihat Semua Absensi
- Hapus Data Absensi

**Dosen:**
- Login
- Lihat Jadwal Mengajar
- Buka Sesi Absensi
- Aktifkan Kamera Scanning ──<<include>>── Buka Sesi Absensi
- Tutup Sesi Absensi
- Lihat Rekap Absensi Kelas
- Buat/Edit/Hapus Jadwal Pengganti

**Mahasiswa:**
- Login
- Lihat Dashboard Kehadiran
- Lihat Jadwal Kalender
- Lihat Riwayat Absensi
- Terima Notifikasi Sesi Aktif

---

## 3. Class Diagram

**Cara buat di VP:**
- New Diagram → **Class Diagram**
- Tambah **Class** untuk setiap entitas
- Tambah **attributes** dan **operations**
- Gunakan **Association** dengan multiplicity

### Classes & Multiplicity

```
User          1 ──── 0..1  Student
User          1 ──── 0..1  Lecturer
Lecturer      1 ──── 0..*  Course
Course        1 ──── 0..*  Schedule
Student       1 ──── 0..*  Enrollment
Course        1 ──── 0..*  Enrollment
Schedule      1 ──── 0..*  ScheduleOverride
Schedule      1 ──── 0..*  AttendanceSession
AttendanceSession 1 ─ 0..* Attendance
Student       1 ──── 0..*  Attendance

WebSocketHandler  1 ── 1  FaceRecognitionEngine
WebSocketHandler  1 ── 1  AttendanceSession
```

### Stereotype
- `FaceRecognitionEngine` → stereotype: **«service»**
- `WebSocketHandler` → stereotype: **«controller»**

---

## 4. Sequence Diagram — Sesi Absensi

**Cara buat di VP:**
- New Diagram → **Sequence Diagram**
- Tambah **Lifeline** untuk setiap participant
- Gunakan **Message** untuk panah komunikasi
- Gunakan **Combined Fragment** untuk loop/alt

### Participants (kiri ke kanan):
1. `:Dosen` (Actor)
2. `:Frontend`
3. `:BackendAPI`
4. `:WebSocketHandler`
5. `:FaceRecognitionEngine`
6. `:Database`

### Alur pesan:
```
Dosen → Frontend          : pilihJadwal() + klikBukaSesi()
Frontend → BackendAPI     : POST /sessions/open {schedule_id}
BackendAPI → Database     : INSERT attendance_sessions
Database → BackendAPI     : session_id = 5
BackendAPI → Frontend     : {session_id: 5}

Dosen → Frontend          : klikAktifkanKamera()
Frontend → WebSocket      : CONNECT ws://?token&session_id=5
WebSocket → Database      : verifyToken() + loadEnrolledStudents()
Database → WebSocket      : students[], embeddings{}

loop [setiap 450ms]
  Frontend → WebSocket    : SEND {image: base64}
  WebSocket → FaceEngine  : recognizeAgainstCandidates(frame, candidates)
  FaceEngine → WebSocket  : (student_id, score)

  alt [dikenali & belum absen]
    WebSocket → Database  : INSERT attendance
    WebSocket → Frontend  : {recognized:true, name, status}
  else [sudah absen]
    WebSocket → Frontend  : {already_absent: true}
  else [tidak dikenali]
    WebSocket → Frontend  : {recognized: false}
  end
end

Dosen → Frontend          : klikAkhiriSesi()
Frontend → BackendAPI     : POST /sessions/5/close
BackendAPI → Database     : UPDATE status='closed'
BackendAPI → Frontend     : {message: "Sesi ditutup"}
```

---

## 5. Activity Diagram — Alur Pengenalan Wajah

**Cara buat di VP:**
- New Diagram → **Activity Diagram**
- Gunakan **Action**, **Decision**, **Fork/Join**

```
[Start]
   ↓
[Terima frame base64 dari WebSocket]
   ↓
[Decode → OpenCV frame]
   ↓
[DeepFace.represent() → embedding 512-dim]
   ↓
[Hitung cosine similarity vs semua kandidat]
   ↓
◇ score >= 0.68?
  NO  → [Kirim: tidak dikenali] → [End]
  YES ↓
◇ margin >= 0.05?
  NO  → [Kirim: ambigu] → [End]
  YES ↓
◇ Student enrolled di course?
  NO  → [Kirim: tidak terdaftar di MK] → [End]
  YES ↓
◇ Sudah absen di sesi ini?
  YES → [Kirim: sudah terekam] → [End]
  NO  ↓
◇ check_in > start_time + 15 menit?
  YES → status = "terlambat"
  NO  → status = "hadir"
   ↓
[INSERT attendance ke Database]
   ↓
[Kirim: {recognized:true, name, nim, status}]
   ↓
[End]
```
