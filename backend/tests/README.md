# Cara Menjalankan Test FaceAttend

## Install dependencies test

```bash
cd backend
pip install pytest httpx pytest-asyncio sqlalchemy[sqlite] --break-system-packages
```

> **Catatan**: Test menggunakan SQLite in-memory, jadi **tidak perlu MySQL berjalan**.

---

## Jalankan semua test

```bash
cd backend
pytest
```

## Jalankan test tertentu

```bash
# Hanya test auth
pytest tests/test_auth.py

# Hanya test sesi absensi
pytest tests/test_attendance.py

# Satu test spesifik
pytest tests/test_auth.py::TestLogin::test_login_berhasil

# Dengan output detail
pytest -v

# Berhenti di error pertama
pytest -x
```

---

## Struktur test

| File | Yang diuji |
|------|-----------|
| `tests/conftest.py` | Fixtures shared (DB, client, user, course) |
| `tests/test_auth.py` | Login, register, proteksi token |
| `tests/test_attendance.py` | Buka/tutup sesi, riwayat absensi per role |
| `tests/test_courses.py` | CRUD mata kuliah |

---

## Cara membaca hasil

```
PASSED  ✓  test berhasil
FAILED  ✗  test gagal (ada bug)
ERROR   !  test error sebelum assertion (masalah setup)
```

Jika ada FAILED, baca bagian `FAILED ... AssertionError` untuk tahu di mana letak masalahnya.
