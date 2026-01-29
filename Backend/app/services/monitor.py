import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from app.core.database import SessionLocal
from app import models
from app.core import websocket


async def check_offline_devices_task():
    """
    Background task to check for offline devices.
    If device hasn't reported in 30 seconds, mark as offline.
    """
    while True:
        try:
            await asyncio.sleep(10)  # Run every 10 seconds
            db: Session = SessionLocal()
            try:
                threshold = datetime.now() - timedelta(seconds=60)
                # Find devices that are online but haven't been seen recently
                offline_devices = (
                    db.query(models.Device)
                    .options(joinedload(models.Device.parking_area))
                    .filter(
                        models.Device.is_online == True,
                        models.Device.last_seen < threshold,
                    )
                    .all()
                )

                for device in offline_devices:
                    device.is_online = False
                    db.add(device)
                    if device.section_id:
                        spots = (
                            db.query(models.Spot)
                            .filter(models.Spot.section_id == device.section_id)
                            .all()
                        )
                        for spot in spots:
                            spot.status = "OFFLINE"
                            db.add(spot)

                    area_code = (
                        device.parking_area.area_code if device.parking_area else None
                    )
                    await websocket.dashboard_manager.broadcast(
                        {"type": "device_offline", "device_uid": device.device_uid},
                        area_code=area_code,
                    )

                if offline_devices:
                    db.commit()

            finally:
                db.close()

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in offline check task: {e}")
