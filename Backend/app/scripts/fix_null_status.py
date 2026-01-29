from app.core.database import SessionLocal
from app.models.parking import Spot


def fix_null_status():
    db = SessionLocal()
    try:
        spots = db.query(Spot).filter(Spot.status == None).all()
        print(f"Found {len(spots)} spots with NULL status.")

        for spot in spots:
            spot.status = "OFFLINE"
            db.add(spot)

        if spots:
            db.commit()
            print(f"✅ Successfully updated {len(spots)} spots to 'OFFLINE'.")
        else:
            print("👍 No NULL status spots found.")

    except Exception as e:
        print(f"❌ Error updating spots: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    fix_null_status()
