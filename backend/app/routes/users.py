from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Student, Lecturer
from ..auth import require_admin, get_current_user, hash_password

router = APIRouter()

# ── STUDENTS ──────────────────────────────────────────────

@router.get("/students")
def get_students(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    students = db.query(Student).all()
    return [{
        "id": s.id,
        "nim": s.nim,
        "name": s.name,
        "email": s.user.email if s.user else None,
        "photo_path": s.photo_path,
    } for s in students]

@router.post("/students")
def create_student(data: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    # Buat user dulu
    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    
    user = User(
        name=data["name"],
        email=data["email"],
        password=hash_password(data["password"]),
        role="mahasiswa"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Buat student
    student = Student(
        user_id=user.id,
        nim=data["nim"],
        name=data["name"],
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return {"message": "Mahasiswa berhasil ditambahkan", "id": student.id}

@router.put("/students/{student_id}")
def update_student(student_id: int, data: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Mahasiswa tidak ditemukan")
    student.name = data.get("name", student.name)
    student.nim = data.get("nim", student.nim)
    db.commit()
    return {"message": "Mahasiswa berhasil diupdate"}

@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Mahasiswa tidak ditemukan")
    db.delete(student)
    db.commit()
    return {"message": "Mahasiswa berhasil dihapus"}

# ── LECTURERS ─────────────────────────────────────────────

@router.get("/lecturers")
def get_lecturers(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    lecturers = db.query(Lecturer).all()
    return [{"id": l.id, "nip": l.nip, "name": l.name} for l in lecturers]

@router.post("/lecturers")
def create_lecturer(data: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    user = User(
        name=data["name"],
        email=data["email"],
        password=hash_password(data["password"]),
        role="dosen"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    lecturer = Lecturer(
        user_id=user.id,
        nip=data["nip"],
        name=data["name"],
    )
    db.add(lecturer)
    db.commit()
    db.refresh(lecturer)
    return {"message": "Dosen berhasil ditambahkan", "id": lecturer.id}

@router.delete("/lecturers/{lecturer_id}")
def delete_lecturer(lecturer_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    lecturer = db.query(Lecturer).filter(Lecturer.id == lecturer_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Dosen tidak ditemukan")
    db.delete(lecturer)
    db.commit()
    return {"message": "Dosen berhasil dihapus"}

# ── ALL USERS ─────────────────────────────────────────────

@router.get("/all")
def get_all_users(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in users]

@router.put("/role/{user_id}")
def update_role(user_id: int, data: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    role = data["role"]
    user.role = role

    # Keep role/profile relation in sync so feature queries work.
    if role == "dosen":
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == user.id).first()
        if not lecturer:
            auto_nip = f"AUTO{user.id:06d}"
            if db.query(Lecturer).filter(Lecturer.nip == auto_nip).first():
                auto_nip = f"AUTO{user.id:06d}{user.id}"
            db.add(Lecturer(user_id=user.id, nip=auto_nip, name=user.name))
    db.commit()
    return {"message": "Role berhasil diupdate"}