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

                offline_ids = [d.id for d in offline_devices]
                affected_sections = set()

                for device in offline_devices:
                    device.is_online = False
                    db.add(device)
                    if device.section_id:
                        # Check if there are other online devices in the same section
                        # We exclude devices that are currently being marked offline (offline_ids)
                        other_active_devices = (
                            db.query(models.Device)
                            .filter(
                                models.Device.section_id == device.section_id,
                                models.Device.is_online == True,
                                models.Device.id.notin_(offline_ids),
                            )
                            .count()
                        )

                        # Only mark spots offline if NO active devices remain in the section
                        if other_active_devices == 0:
                            spots = (
                                db.query(models.Spot)
                                .filter(models.Spot.section_id == device.section_id)
                                .all()
                            )
                            for spot in spots:
                                spot.status = "OFFLINE"
                                db.add(spot)

                            if device.parking_area:
                                affected_sections.add(
                                    (
                                        device.section_id,
                                        device.parking_area.area_code,
                                        device.parking_area.name,
                                    )
                                )

                    area_code = (
                        device.parking_area.area_code if device.parking_area else None
                    )
                    await websocket.dashboard_manager.broadcast(
                        {"type": "device_offline", "device_uid": device.device_uid},
                        area_code=area_code,
                    )

                if offline_devices:
                    db.commit()

                    for sec_id, a_code, a_name in affected_sections:
                        try:
                            top_spots = (
                                db.query(models.Spot)
                                .filter(
                                    models.Spot.section_id == sec_id,
                                    models.Spot.status == "AVAILABLE",
                                )
                                .order_by(models.Spot.spot_code)
                                .limit(4)
                                .all()
                            )

                            await websocket.live_display_manager.broadcast(
                                {
                                    "type": "live_slots_update",
                                    "area_name": a_name,
                                    "area_code": a_code,
                                    "section_id": sec_id,
                                    "data": [
                                        {
                                            "id": s.id,
                                            "spot_code": s.spot_code,
                                            "status": s.status,
                                            "section_id": s.section_id,
                                        }
                                        for s in top_spots
                                    ],
                                },
                                area_code=a_code,
                            )
                        except Exception as ex:
                            print(f"Error broadcasting live display update: {ex}")

            finally:
                db.close()

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in offline check task: {e}")
