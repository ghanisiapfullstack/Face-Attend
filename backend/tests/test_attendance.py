"""
Test untuk endpoint sesi absensi:
  POST /api/attendance/sessions/open
  POST /api/attendance/sessions/{id}/close
  GET  /api/attendance/sessions
  GET  /api/attendance/my          (mahasiswa)
  GET  /api/attendance/all         (admin)
"""
import pytest
from conftest import auth_headers, create_user
from app import models


class TestBukaSesi:
    def test_dosen_bisa_buka_sesi(self, client, dosen_user, course_with_schedule):
        schedule_id = course_with_schedule["schedule"].id
        headers = auth_headers(client, "dosen@test.com", "dosen123")

        resp = client.post("/api/attendance/sessions/open", json={
            "schedule_id": schedule_id,
        }, headers=headers)

        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data

    def test_buka_sesi_dua_kali_return_sesi_sama(self, client, dosen_user, course_with_schedule):
        schedule_id = course_with_schedule["schedule"].id
        headers = auth_headers(client, "dosen@test.com", "dosen123")

        resp1 = client.post("/api/attendance/sessions/open", json={"schedule_id": schedule_id}, headers=headers)
        resp2 = client.post("/api/attendance/sessions/open", json={"schedule_id": schedule_id}, headers=headers)

        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.json()["session_id"] == resp2.json()["session_id"]

    def test_mahasiswa_tidak_bisa_buka_sesi(self, client, mahasiswa_user, course_with_schedule):
        schedule_id = course_with_schedule["schedule"].id
        headers = auth_headers(client, "mhs@test.com", "mhs123")

        resp = client.post("/api/attendance/sessions/open", json={
            "schedule_id": schedule_id,
        }, headers=headers)

        assert resp.status_code == 403

    def test_buka_sesi_jadwal_tidak_ada(self, client, dosen_user):
        headers = auth_headers(client, "dosen@test.com", "dosen123")
        resp = client.post("/api/attendance/sessions/open", json={
            "schedule_id": 99999,
        }, headers=headers)
        assert resp.status_code == 404

    def test_admin_bisa_buka_sesi_mana_saja(self, client, admin_user, course_with_schedule):
        schedule_id = course_with_schedule["schedule"].id
        headers = auth_headers(client, "admin@test.com", "admin123")

        resp = client.post("/api/attendance/sessions/open", json={
            "schedule_id": schedule_id,
        }, headers=headers)

        assert resp.status_code == 200


class TestTutupSesi:
    def _buka_sesi(self, client, headers, schedule_id) -> int:
        resp = client.post("/api/attendance/sessions/open", json={"schedule_id": schedule_id}, headers=headers)
        assert resp.status_code == 200
        return resp.json()["session_id"]

    def test_dosen_bisa_tutup_sesi(self, client, dosen_user, course_with_schedule):
        headers = auth_headers(client, "dosen@test.com", "dosen123")
        session_id = self._buka_sesi(client, headers, course_with_schedule["schedule"].id)

        resp = client.post(f"/api/attendance/sessions/{session_id}/close", headers=headers)

        assert resp.status_code == 200
        assert resp.json()["session_id"] == session_id

    def test_tutup_sesi_sudah_closed(self, client, dosen_user, course_with_schedule):
        headers = auth_headers(client, "dosen@test.com", "dosen123")
        session_id = self._buka_sesi(client, headers, course_with_schedule["schedule"].id)

        client.post(f"/api/attendance/sessions/{session_id}/close", headers=headers)
        resp2 = client.post(f"/api/attendance/sessions/{session_id}/close", headers=headers)

        assert resp2.status_code == 200
        assert "sudah ditutup" in resp2.json()["message"]

    def test_tutup_sesi_tidak_ada(self, client, dosen_user):
        headers = auth_headers(client, "dosen@test.com", "dosen123")
        resp = client.post("/api/attendance/sessions/99999/close", headers=headers)
        assert resp.status_code == 404


class TestLihatSesi:
    def test_dosen_bisa_lihat_sessions(self, client, dosen_user):
        headers = auth_headers(client, "dosen@test.com", "dosen123")
        resp = client.get("/api/attendance/sessions", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_mahasiswa_tidak_bisa_lihat_sessions(self, client, mahasiswa_user):
        headers = auth_headers(client, "mhs@test.com", "mhs123")
        resp = client.get("/api/attendance/sessions", headers=headers)
        assert resp.status_code == 403


class TestRiwayatAbsensi:
    def test_mahasiswa_bisa_lihat_absensi_sendiri(self, client, mahasiswa_user):
        headers = auth_headers(client, "mhs@test.com", "mhs123")
        resp = client.get("/api/attendance/my", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_admin_bisa_lihat_semua_absensi(self, client, admin_user):
        headers = auth_headers(client, "admin@test.com", "admin123")
        resp = client.get("/api/attendance/all", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_notifikasi_sesi_terbuka_untuk_mahasiswa(self, client, mahasiswa_user):
        headers = auth_headers(client, "mhs@test.com", "mhs123")
        resp = client.get("/api/attendance/live/open-for-me", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_dosen_tidak_bisa_akses_notifikasi_mahasiswa(self, client, dosen_user):
        headers = auth_headers(client, "dosen@test.com", "dosen123")
        resp = client.get("/api/attendance/live/open-for-me", headers=headers)
        assert resp.status_code == 403
