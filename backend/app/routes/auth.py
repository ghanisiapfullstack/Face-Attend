from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Lecturer
from ..auth import verify_password, create_access_token, hash_password

router = APIRouter()

@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data["email"]).first()
    if not user or not verify_password(data["password"], user.password):
        raise HTTPException(status_code=401, detail="Email atau password salah")

    # If a role was changed to dosen directly, make sure lecturer profile exists.
    if user.role == "dosen":
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == user.id).first()
        if not lecturer:
            auto_nip = f"AUTO{user.id:06d}"
            exists_nip = db.query(Lecturer).filter(Lecturer.nip == auto_nip).first()
            if exists_nip:
                auto_nip = f"AUTO{user.id:06d}{user.id}"
            lecturer = Lecturer(
                user_id=user.id,
                nip=auto_nip,
                name=user.name,
            )
            db.add(lecturer)
            db.commit()
    
    token = create_access_token({"sub": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "id": user.id
    }

@router.post("/register")
def register(data: dict, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    
    user = User(
        name=data["name"],
        email=data["email"],
        password=hash_password(data["password"]),
        role=data.get("role", "mahasiswa")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User berhasil dibuat", "id": user.id}