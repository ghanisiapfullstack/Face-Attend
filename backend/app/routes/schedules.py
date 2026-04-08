from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Schedule, Course, Lecturer
from ..auth import require_admin, require_dosen

router = APIRouter()

@router.get("")
def get_schedules(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    schedules = db.query(Schedule).all()
    return [{"id": s.id, "course_name": s.course.name if s.course else None,
             "day": s.day, "start_time": str(s.start_time),
             "end_time": str(s.end_time), "room": s.room} for s in schedules]

@router.post("")
def create_schedule(data: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    schedule = Schedule(
        course_id=data["course_id"],
        day=data["day"],
        start_time=data["start_time"],
        end_time=data["end_time"],
        room=data["room"]
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return {"message": "Jadwal berhasil ditambahkan", "id": schedule.id}

@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    db.delete(schedule)
    db.commit()
    return {"message": "Jadwal berhasil dihapus"}

@router.get("/my")
def get_my_schedules(db: Session = Depends(get_db), current_user=Depends(require_dosen)):
    query = db.query(Schedule)
    if current_user.role != "admin":
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == current_user.id).first()
        if not lecturer:
            raise HTTPException(status_code=404, detail="Data dosen tidak ditemukan")
        query = query.join(Course, Schedule.course_id == Course.id).filter(Course.lecturer_id == lecturer.id)

    schedules = query.all()
    return [
        {
            "id": s.id,
            "course_id": s.course_id,
            "course_name": s.course.name if s.course else None,
            "day": s.day,
            "start_time": str(s.start_time),
            "end_time": str(s.end_time),
            "room": s.room,
            "label": f"{s.course.name if s.course else 'Tanpa MK'} - {s.day} {s.start_time}-{s.end_time} ({s.room})",
        }
        for s in schedules
    ]