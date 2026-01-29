from datetime import datetime
import json
import logging
import asyncio
from typing import Any
from sqlalchemy.orm import Session
from app import models, schemas
from app.core import database, websocket

logger = logging.getLogger(__name__)


async def process_sensor_data(device_uid: str, updates: schemas.SensorPayload):
    """
    Process sensor data from MQTT or HTTP.
    Auto-creates devices if they don't exist.
    Updates device status and spot occupancy.
    """
    db: Session = database.SessionLocal()
    try:
        # 1. Get or Create Device
        device = (
            db.query(models.Device)
            .filter(models.Device.device_uid == device_uid)
            .first()
        )

        if not device:
            # Auto-create device when it first connects
            logger.info(f"New device detected: {device_uid}. Auto-creating...")

            # Try to determine parking area from spot codes
            # Assuming first spot exists and we can find its section
            parking_area_id = None
            section_id = None

            if updates.spots:
                first_spot_code = updates.spots[0].spot_code
                existing_spot = (
                    db.query(models.Spot)
                    .filter(models.Spot.spot_code == first_spot_code)
                    .first()
                )
                if existing_spot:
                    section_id = existing_spot.section_id
                    section = (
                        db.query(models.ParkingSection)
                        .filter(models.ParkingSection.id == section_id)
                        .first()
                    )
                    if section:
                        parking_area_id = section.parking_area_id

            # If we couldn't determine area, use first available area
            if not parking_area_id:
                first_area = db.query(models.ParkingArea).first()
                if first_area:
                    parking_area_id = first_area.id
                else:
                    logger.error("No parking areas found. Cannot create device.")
                    return

            device = models.Device(
                device_uid=device_uid,
                parking_area_id=parking_area_id,
                section_id=section_id,
                is_online=True,
                last_seen=datetime.now(),
            )
            db.add(device)
            db.flush()  # Get the ID
            logger.info(f"Created device {device_uid} (ID: {device.id})")
        else:
            # Update existing device
            device.last_seen = datetime.now()
            device.is_online = True
            db.add(device)

        # 2. Update Spots
        updated_spots = []
        for spot_data in updates.spots:
            spot = (
                db.query(models.Spot)
                .filter(models.Spot.spot_code == spot_data.spot_code)
                .first()
            )
            if spot:
                # Use status directly from payload
                new_status = spot_data.status.upper()

                # Only log if status changed
                if spot.status != new_status:
                    logger.info(f"Spot {spot.spot_code}: {new_status}")

                spot.status = new_status
                spot.last_updated = datetime.now()
                db.add(spot)

                updated_spots.append(
                    {
                        "id": spot.id,
                        "spot_code": spot.spot_code,
                        "status": spot.status,
                        "section_id": spot.section_id,
                    }
                )
            else:
                logger.warning(f"Spot {spot_data.spot_code} not found in database")

        db.commit()

        # 3. Broadcast Update via WebSocket (Dashboard)
        if updated_spots:
            # Fetch Area Code for broadcasting
            area_code_val = None
            area_name = None
            if device.parking_area_id:
                area = (
                    db.query(models.ParkingArea)
                    .filter(models.ParkingArea.id == device.parking_area_id)
                    .first()
                )
                if area:
                    area_code_val = area.area_code
                    area_name = area.name

            await websocket.dashboard_manager.broadcast(
                {
                    "type": "spot_update",
                    "device": device_uid,
                    "timestamp": datetime.now().isoformat(),
                    "data": updated_spots,
                },
                area_code=area_code_val,
            )
            logger.debug(f"Broadcasted {len(updated_spots)} spot updates to dashboard")

            # 4. Broadcast "Live Display" Update (Top 16 Available)
            # 4. Broadcast "Live Display" Update (Top 4 Available per Section)
            if area_code_val:
                try:
                    # Identify affected sections
                    affected_section_ids = {s["section_id"] for s in updated_spots}

                    for sec_id in affected_section_ids:
                        # Fetch Top 4 AVAILABLE spots for this section
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
                                "area_name": area_name,
                                "area_code": area_code_val,
                                "section_id": sec_id,  # Target specific section
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
                            area_code=area_code_val,
                        )
                except Exception as ex:
                    logger.error(
                        f"Error broadcasting live display update from sensor service: {ex}"
                    )
            else:
                if device.parking_area_id:
                    logger.warning(
                        f"Could not find area_code for area_id {device.parking_area_id}"
                    )

    except Exception as e:
        logger.error(f"Error processing sensor data from {device_uid}: {e}")
        db.rollback()
    finally:
        db.close()
