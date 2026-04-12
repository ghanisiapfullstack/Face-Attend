"""
Test untuk endpoint mata kuliah dan enrollment:
  GET    /api/courses
  POST   /api/courses
  DELETE /api/courses/{id}
"""
import pytest
from conftest import auth_headers


class TestCourses:
    def test_admin_bisa_lihat_semua_course(self, client, admin_user):
        headers = auth_headers(client, "admin@test.com", "admin123")
        resp = client.get("/api/courses", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_admin_bisa_buat_course(self, client, admin_user, dosen_user, db):
        from app.models import Lecturer
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == dosen_user.id).first()
        headers = auth_headers(client, "admin@test.com", "admin123")

        resp = client.post("/api/courses", json={
        "code": "IF301",
        "name": "Algoritma Lanjut",
        "lecturer_id": lecturer.id,
        "credits": 3,
        }, headers=headers)

        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "berhasil" in data["message"]

    def test_mahasiswa_tidak_bisa_buat_course(self, client, mahasiswa_user):
        headers = auth_headers(client, "mhs@test.com", "mhs123")
        resp = client.post("/api/courses", json={
            "code": "IF999",
            "name": "Coba Buat",
            "lecturer_id": 1,
            "credits": 2,
        }, headers=headers)
        assert resp.status_code == 403

    def test_admin_bisa_hapus_course(self, client, admin_user, course_with_schedule):
        course_id = course_with_schedule["course"].id
        headers = auth_headers(client, "admin@test.com", "admin123")

        resp = client.delete(f"/api/courses/{course_id}", headers=headers)
        assert resp.status_code == 200

    def test_hapus_course_tidak_ada(self, client, admin_user):
        headers = auth_headers(client, "admin@test.com", "admin123")
        resp = client.delete("/api/courses/99999", headers=headers)
        assert resp.status_code == 404
