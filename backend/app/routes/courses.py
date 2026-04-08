from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Course, Lecturer
from ..auth import require_admin

router = APIRouter()

@router.get("")
def get_courses(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    courses = db.query(Course).all()
    return [{"id": c.id, "code": c.code, "name": c.name,
             "lecturer_name": c.lecturer.name if c.lecturer else None,
             "credits": c.credits} for c in courses]

@router.post("")
def create_course(data: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    course = Course(
        code=data["code"],
        name=data["name"],
        lecturer_id=data["lecturer_id"],
        credits=data["credits"]
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return {"message": "Mata kuliah berhasil ditambahkan", "id": course.id}

@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Mata kuliah tidak ditemukan")
    db.delete(course)
    db.commit()
    return {"message": "Mata kuliah berhasil dihapus"}