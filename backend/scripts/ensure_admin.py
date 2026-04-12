"""
Buat atau reset akun admin untuk development.
Jalankan dari folder backend:

  python scripts/ensure_admin.py
  python scripts/ensure_admin.py --email admin@faceattend.com --password admin123

Hanya untuk lingkungan dev — jangan commit password produksi.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Agar `import app` jalan saat dijalankan sebagai file
_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.auth import hash_password  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import User  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description="Pastikan ada user admin di database.")
    p.add_argument("--email", default="admin@faceattend.com")
    p.add_argument("--password", default="admin123")
    p.add_argument("--name", default="Administrator")
    args = p.parse_args()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if user:
            user.password = hash_password(args.password)
            user.role = "admin"
            user.name = args.name
            db.commit()
            print(f"OK: password & role admin diperbarui untuk {args.email}")
        else:
            db.add(
                User(
                    name=args.name,
                    email=args.email,
                    password=hash_password(args.password),
                    role="admin",
                )
            )
            db.commit()
            print(f"OK: admin dibuat — {args.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
