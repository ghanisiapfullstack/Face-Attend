import base64
import datetime
import json

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..auth import ALGORITHM, SECRET_KEY
from ..database import get_db
from ..face_recognition import (
    build_embedding_candidates,
    load_embeddings,
    recognize_face_against_candidates,
)
from ..models import Attendance, AttendanceSession, Enrollment, Student, User

router = APIRouter()


def get_user_from_token(db: Session, token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        return db.query(User).filter(User.email == email).first()
    except JWTError:
        return None


def is_already_recorded(db: Session, student_id: int, schedule_id, session_id):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        return False

    existing = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.schedule_id == schedule_id,
        Attendance.session_id == session_id,
    ).first()
    return existing is not None


@router.websocket("/ws")
async def websocket_face(websocket: WebSocket):
    await websocket.accept()
    db = next(get_db())

    try:
        token = websocket.query_params.get("token")
        session_id = websocket.query_params.get("session_id")

        if not token or not session_id:
            await websocket.send_text(json.dumps({"error": "token dan session_id wajib diisi"}))
            await websocket.close()
            return

        try:
            session_id_int = int(session_id)
        except (TypeError, ValueError):
            await websocket.send_text(json.dumps({"error": "session_id tidak valid"}))
            await websocket.close()
            return

        user = get_user_from_token(db, token)
        if not user or user.role not in ["admin", "dosen"]:
            await websocket.send_text(json.dumps({"error": "Akses ditolak"}))
            await websocket.close()
            return

        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id_int).first()
        if not session:
            await websocket.send_text(json.dumps({"error": "Sesi tidak ditemukan"}))
            await websocket.close()
            return
        if session.status != "open":
            await websocket.send_text(json.dumps({"error": "Sesi sudah ditutup"}))
            await websocket.close()
            return

        schedule = session.schedule
        course_id = schedule.course_id if schedule and schedule.course else None
        enrolled_students = (
            db.query(Student)
            .join(Enrollment, Enrollment.student_id == Student.id)
            .filter(Enrollment.course_id == course_id)
            .distinct()
            .all()
            if course_id
            else []
        )
        emb = load_embeddings()
        candidates = build_embedding_candidates(enrolled_students, emb)

        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            image_data = payload.get("image")

            if not image_data:
                continue

            image_bytes = base64.b64decode(image_data.split(",")[1])
            np_arr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if not course_id:
                await websocket.send_text(
                    json.dumps({"recognized": False, "error": "Jadwal tidak memiliki mata kuliah"})
                )
                continue

            if not enrolled_students:
                await websocket.send_text(
                    json.dumps(
                        {
                            "recognized": False,
                            "reason": "no_enrollment",
                            "message": "Tidak ada mahasiswa terdaftar di mata kuliah ini",
                        }
                    )
                )
                continue

            if not candidates:
                await websocket.send_text(
                    json.dumps(
                        {
                            "recognized": False,
                            "reason": "no_face_model",
                            "message": "Belum ada embedding wajah untuk mahasiswa terdaftar (cek train & nama vs dataset)",
                        }
                    )
                )
                continue

            student_id, score = await run_in_threadpool(
                recognize_face_against_candidates, frame, candidates
            )

            if not student_id:
                await websocket.send_text(
                    json.dumps(
                        {
                            "recognized": False,
                            "name": None,
                            "nim": None,
                            "score": score,
                            "message": "Wajah tidak dikenali atau ambigu (sesuaikan threshold / dataset)",
                        }
                    )
                )
                continue

            student = db.query(Student).filter(Student.id == student_id).first()
            if not student:
                await websocket.send_text(json.dumps({"recognized": False, "name": None, "nim": None}))
                continue

            enrolled_ok = (
                db.query(Enrollment)
                .filter(Enrollment.student_id == student.id, Enrollment.course_id == course_id)
                .first()
            )
            if not enrolled_ok:
                await websocket.send_text(
                    json.dumps(
                        {
                            "recognized": True,
                            "rejected": True,
                            "reason": "not_enrolled",
                            "name": student.name,
                            "nim": student.nim,
                            "message": "Mahasiswa tidak terdaftar di mata kuliah ini",
                        }
                    )
                )
                continue

            session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id_int).first()
            if not session or session.status != "open":
                await websocket.send_text(json.dumps({"error": "Sesi sudah ditutup"}))
                await websocket.close()
                return

            schedule = session.schedule
            schedule_id = schedule.id if schedule else None
            already = is_already_recorded(db, student.id, schedule_id, session_id_int)

            status = "hadir"
            if not already:
                now = datetime.datetime.now()
                status = "hadir"
                if schedule:
                    late_threshold = datetime.datetime.combine(
                        datetime.date.today(), schedule.start_time
                    ) + datetime.timedelta(minutes=15)
                    if now > late_threshold:
                        status = "terlambat"

                attendance = Attendance(
                    student_id=student.id,
                    schedule_id=schedule_id,
                    session_id=session_id_int,
                    check_in_time=now,
                    status=status,
                )
                db.add(attendance)
                db.commit()

            await websocket.send_text(
                json.dumps(
                    {
                        "recognized": True,
                        "name": student.name,
                        "nim": student.nim,
                        "status": status if not already else "sudah_absen",
                        "already_absent": already,
                        "score": score,
                    }
                )
            )

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"Error: {e}")
        try:
            await websocket.send_text(json.dumps({"error": "Terjadi kesalahan pada server"}))
        except Exception:
            pass
    finally:
        db.close()
