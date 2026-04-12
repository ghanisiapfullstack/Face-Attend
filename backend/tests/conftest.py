"""
Shared fixtures untuk semua test FaceAttend.
Memakai SQLite in-memory — tidak perlu MySQL berjalan.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.auth import hash_password
from app import models

# ── Database in-memory ──────────────────────────────────────────────────────

SQLALCHEMY_TEST_URL = "sqlite:///./test_faceattend.db"

engine_test = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Buat semua tabel sekali per sesi test."""
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture()
def db():
    """DB session bersih per test."""
    connection = engine_test.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """TestClient dengan dependency override ke DB test."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ── Helper: buat user & dapatkan token ──────────────────────────────────────

def create_user(db, name: str, email: str, password: str, role: str = "mahasiswa"):
    user = models.User(
        name=name,
        email=email,
        password=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_token(client, email: str, password: str) -> str:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login gagal: {resp.text}"
    return resp.json()["access_token"]


def auth_headers(client, email: str, password: str) -> dict:
    return {"Authorization": f"Bearer {get_token(client, email, password)}"}


# ── Fixtures siap pakai ──────────────────────────────────────────────────────

@pytest.fixture()
def admin_user(db):
    return create_user(db, "Admin Test", "admin@test.com", "admin123", "admin")


@pytest.fixture()
def dosen_user(db):
    user = create_user(db, "Dosen Test", "dosen@test.com", "dosen123", "dosen")
    lecturer = models.Lecturer(user_id=user.id, nip="NIP001", name=user.name)
    db.add(lecturer)
    db.commit()
    db.refresh(lecturer)
    return user


@pytest.fixture()
def mahasiswa_user(db):
    user = create_user(db, "Mahasiswa Test", "mhs@test.com", "mhs123", "mahasiswa")
    student = models.Student(user_id=user.id, nim="12345678", name=user.name)
    db.add(student)
    db.commit()
    db.refresh(student)
    return user


@pytest.fixture()
def course_with_schedule(db, dosen_user):
    """Buat course + schedule yang terhubung ke dosen_user."""
    lecturer = db.query(models.Lecturer).filter(
        models.Lecturer.user_id == dosen_user.id
    ).first()

    course = models.Course(
        code="MK001",
        name="Pemrograman Web",
        lecturer_id=lecturer.id,
        credits=3,
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    import datetime
    schedule = models.Schedule(
        course_id=course.id,
        day="Senin",
        start_time=datetime.time(8, 0),
        end_time=datetime.time(10, 0),
        room="R101",
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return {"course": course, "schedule": schedule, "lecturer": lecturer}
