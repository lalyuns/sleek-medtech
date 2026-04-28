from app.database import SessionLocal
from app.models.user import User, UserRole
from passlib.context import CryptContext

db = SessionLocal()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

existing = db.query(User).filter(User.email == "admin@sleek.com").first()
if existing:
    print("Admin user already exists, id:", existing.user_id)
else:
    user = User(
        name="Admin",
        email="admin@sleek.com",
        hashed_password=pwd.hash("admin1234"),
        role=UserRole.admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print("Admin user created, id:", user.user_id)

db.close()
