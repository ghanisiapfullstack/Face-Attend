"""
Test untuk endpoint autentikasi:
  POST /api/auth/login
  POST /api/auth/register
"""
import pytest
from conftest import create_user, auth_headers


class TestLogin:
    def test_login_berhasil(self, client, admin_user):
        resp = client.post("/api/auth/login", json={
            "email": "admin@test.com",
            "password": "admin123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["role"] == "admin"
        assert data["name"] == "Admin Test"

    def test_login_password_salah(self, client, admin_user):
        resp = client.post("/api/auth/login", json={
            "email": "admin@test.com",
            "password": "salah_password",
        })
        assert resp.status_code == 401

    def test_login_email_tidak_ada(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "tidakada@test.com",
            "password": "apasaja",
        })
        assert resp.status_code == 401

    def test_login_email_kosong(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "",
            "password": "admin123",
        })
        assert resp.status_code == 401

    def test_login_dosen_return_role(self, client, dosen_user):
        resp = client.post("/api/auth/login", json={
            "email": "dosen@test.com",
            "password": "dosen123",
        })
        assert resp.status_code == 200
        assert resp.json()["role"] == "dosen"

    def test_login_mahasiswa_return_role(self, client, mahasiswa_user):
        resp = client.post("/api/auth/login", json={
            "email": "mhs@test.com",
            "password": "mhs123",
        })
        assert resp.status_code == 200
        assert resp.json()["role"] == "mahasiswa"

    def test_token_bisa_dipakai_untuk_akses_protected(self, client, admin_user):
        headers = auth_headers(client, "admin@test.com", "admin123")
        resp = client.get("/api/users/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "admin@test.com"


class TestRegister:
    def test_register_berhasil(self, client):
        resp = client.post("/api/auth/register", json={
            "name": "User Baru",
            "email": "baru@test.com",
            "password": "password123",
        })
        assert resp.status_code == 200
        assert "id" in resp.json()

    def test_register_email_duplikat(self, client, admin_user):
        resp = client.post("/api/auth/register", json={
            "name": "Duplikat",
            "email": "admin@test.com",
            "password": "password123",
        })
        assert resp.status_code == 400

    def test_register_role_default_mahasiswa(self, client, db):
        from app.models import User
        client.post("/api/auth/register", json={
            "name": "Cek Role",
            "email": "cekrole@test.com",
            "password": "password123",
        })
        user = db.query(User).filter(User.email == "cekrole@test.com").first()
        assert user is not None
        assert user.role == "mahasiswa"


class TestProtectedRoute:
    def test_akses_tanpa_token_ditolak(self, client):
        resp = client.get("/api/users/me")
        assert resp.status_code == 401

    def test_akses_dengan_token_palsu_ditolak(self, client):
        resp = client.get("/api/users/me", headers={
            "Authorization": "Bearer tokenpalsu.tidakvalid.sama sekali"
        })
        assert resp.status_code == 401

    def test_mahasiswa_tidak_bisa_akses_admin_endpoint(self, client, mahasiswa_user):
        headers = auth_headers(client, "mhs@test.com", "mhs123")
        resp = client.get("/api/attendance/all", headers=headers)
        assert resp.status_code == 403
