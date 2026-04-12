from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from .database import engine, Base
from . import models

# Create tables
Base.metadata.create_all(bind=engine)

def run_light_migration():
    # Lightweight migration so existing databases get newer columns/tables without manual ALTER.
    with engine.begin() as conn:
        column_exists = conn.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'attendances'
              AND column_name = 'session_id'
        """)).scalar()
        if not column_exists:
            conn.execute(text("ALTER TABLE attendances ADD COLUMN session_id INT NULL"))

        enrollments_table = conn.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = 'enrollments'
        """)).scalar()
        if not enrollments_table:
            conn.execute(text("""
                CREATE TABLE enrollments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    course_id INT NOT NULL,
                    enrolled_at DATETIME NULL,
                    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES students(id),
                    CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id)
                )
            """))

        overrides_table = conn.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = 'schedule_overrides'
        """)).scalar()
        if not overrides_table:
            conn.execute(text("""
                CREATE TABLE schedule_overrides (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    schedule_id INT NOT NULL,
                    original_date DATE NOT NULL,
                    replacement_date DATE NOT NULL,
                    new_start_time TIME NOT NULL,
                    new_end_time TIME NOT NULL,
                    new_room VARCHAR(50) NULL,
                    reason VARCHAR(255) NULL,
                    created_by_user_id INT NOT NULL,
                    created_at DATETIME NULL,
                    updated_at DATETIME NULL,
                    CONSTRAINT fk_overrides_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id),
                    CONSTRAINT fk_overrides_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
                )
            """))

        avatar_col = conn.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'users'
              AND column_name = 'avatar_path'
        """)).scalar()
        if not avatar_col:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_path VARCHAR(512) NULL"))

if "sqlite" not in str(engine.url):
    run_light_migration()

app = FastAPI(title="FaceAttend API", version="1.0.0")

# CORS - allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
_AVATARS = _STATIC_DIR / "avatars"
_AVATARS.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")

from .routes import attendance, auth, courses, face, schedules, users

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(face.router, prefix="/api/face", tags=["Face"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["Schedules"])


@app.get("/")
def root():
    return {"message": "FaceAttend API is running!"}