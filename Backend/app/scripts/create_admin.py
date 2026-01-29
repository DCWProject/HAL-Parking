import getpass
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app import models
from app.core.config import settings


def prompt_non_empty(label: str) -> str:
    while True:
        value = input(f"{label}: ").strip()
        if value:
            return value
        print(f"❌ {label} cannot be empty")


def create_admin():
    print("\n🔐 InteliPark – Create Admin User\n")

    email = prompt_non_empty("Admin Email")
    name = prompt_non_empty("Admin Name")

    while True:
        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm Password: ")

        if not password:
            print("❌ Password cannot be empty")
            continue

        if password != confirm:
            print("❌ Passwords do not match. Try again.")
            continue

        break

    db = SessionLocal()
    try:
        existing = db.query(models.Admin).filter(models.Admin.email == email).first()
        if existing:
            print(f"\n⚠️ Admin with email '{email}' already exists.")
            return

        admin = models.Admin(
            email=email,
            username=name,
            hashed_password=get_password_hash(password),
        )
        db.add(admin)
        db.commit()

        print("\n✅ Admin created successfully!")
        print(f"   Email : {email}")
        print(f"   Name  : {name}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Failed to create admin: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
