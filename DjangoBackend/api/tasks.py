from huey import crontab
from huey.contrib.djhuey import task, db_periodic_task
from django.utils import timezone
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import timedelta
import logging
import redis
from api.models import Spot, Device, ParkingSection, ParkingArea

logger = logging.getLogger(__name__)

# Setup Redis Client for background tasks
redis_client = redis.Redis(host="127.0.0.1", port=6379, db=0, decode_responses=True)

# ==========================================
# 1. HELPER FUNCTIONS
# ==========================================


def get_live_display_data_for_section(section_id):
    """Calculates the top 6 spots for the LED boards."""
    final_spots = []
    is_grid = getattr(settings, "IS_DISPLAY_GRID_VIEW", False)

    if is_grid:
        all_spot = Spot.objects.filter(section_id=section_id).order_by("spot_code")
        final_spots.extend(all_spot)
    else:
        max_spots = 6
        avail_spots = list(
            Spot.objects.filter(section_id=section_id, status="AVAILABLE").order_by(
                "spot_code"
            )[:max_spots]
        )
        final_spots.extend(avail_spots)

        if len(final_spots) < max_spots:
            needed = max_spots - len(final_spots)
            offline_spots = list(
                Spot.objects.filter(
                    section_id=section_id, status__in=["OFFLINE", "OCCUPIED"]
                ).order_by("status")[:needed]
            )
            final_spots.extend(offline_spots)

    return final_spots


# ==========================================
# 2. EVENT-DRIVEN TASKS (Triggered by MQTT)
# ==========================================


@task()
def save_spot_state_to_db(spot_code, new_status, device_uid):
    """
    Background Task: Broadcasts to Admin Dashboard and saves to DB.
    The LED board UI (live_display) is handled instantly by MQTT script.
    """
    try:
        # Get the spot and its relationships
        spot = Spot.objects.select_related("section", "section__parking_area").get(
            spot_code=spot_code
        )

        # 1. Update Database
        spot.status = new_status
        if new_status != "OFFLINE":
            spot.offline_last_status = new_status
        spot.status_changed_at = timezone.now()
        spot.last_updated = timezone.now()

        spot.save(
            update_fields=[
                "status",
                "offline_last_status",
                "status_changed_at",
                "last_updated",
            ]
        )

        # 2. Broadcast to Admin Dashboard (parking_detail)
        channel_layer = get_channel_layer()
        area_code = spot.section.parking_area.area_code

        async_to_sync(channel_layer.group_send)(
            f"parking_detail_{area_code}",
            {
                "type": "spot_update",
                "device": device_uid,
                "timestamp": timezone.now().isoformat(),
                "data": [
                    {
                        "id": spot.id,
                        "spot_code": spot_code,
                        "status": new_status,
                        "section_id": spot.section.id,
                    }
                ],
            },
        )

        logger.info(
            f"[HUEY] DB Saved & Dashboard Updated for: {spot_code} -> {new_status}"
        )

    except Exception as e:
        logger.error(f"[HUEY] DB Save/Broadcast Error for {spot_code}: {str(e)}")


@task()
def update_device_heartbeat(device_uid, ip, mac, reported_spots, active_nodes):
    """
    Background Task: Updates Device heartbeat and bumps Spot timestamps.
    """
    try:
        device = Device.objects.filter(device_uid=device_uid).first()
        now = timezone.now()

        if not device:
            parking_area = None
            section = None

            if reported_spots:
                first_spot_code = reported_spots[0]
                existing_spot = Spot.objects.filter(spot_code=first_spot_code).first()
                if existing_spot:
                    section = existing_spot.section
                    parking_area = section.parking_area

            if not parking_area:
                parking_area = ParkingArea.objects.first()
                if not parking_area:
                    return

            device = Device.objects.create(
                device_uid=device_uid,
                parking_area=parking_area,
                section=section,
                is_online=True,
                last_seen=now,
            )
        else:
            device.last_seen = now
            device.is_online = True

        if ip:
            device.ip_address = ip
        if mac:
            device.mac_address = mac

        if len(reported_spots) > 0:
            device.no_of_sensor_nodes = len(reported_spots)
            device.active_sensor_nodes = active_nodes
            sections = ParkingSection.objects.filter(
                spots__spot_code__in=reported_spots
            ).distinct()
            device.sections.add(*sections)

            # CRITICAL: Ping all reported spots so the 3-min offline cron task knows they are alive
            Spot.objects.filter(spot_code__in=reported_spots).update(last_updated=now)

        device.save()
    except Exception as e:
        logger.error(f"[HUEY] Error updating device {device_uid}: {str(e)}")


# ==========================================
# 3. PERIODIC TASKS (Cron Jobs)
# ==========================================


def Device_offline():
    """Check for devices that have not been seen for more than 1 minute."""
    threshold = timezone.now() - timedelta(minutes=1)
    offline_devices = Device.objects.filter(is_online=True, last_seen__lt=threshold)

    if offline_devices.exists():
        updated = offline_devices.update(is_online=False)
        logger.info(f"[CRON] Marked {updated} devices OFFLINE.")


def Spot_offline():
    """Check for spots that have not been updated for more than 3 minutes."""
    now = timezone.now()
    threshold = now - timedelta(minutes=3)

    offline_spots = Spot.objects.exclude(status="OFFLINE").filter(
        last_updated__lt=threshold
    )
    spots_to_update = list(offline_spots)

    if not spots_to_update:
        return

    channel_layer = get_channel_layer()
    affected_sections = {}

    # Collect metadata and update Redis Cache
    for spot in spots_to_update:
        sec = spot.section
        area = sec.parking_area
        affected_sections[sec.id] = (area.area_code, area.name)

        # Keep Redis cache in sync with the database offline status!
        redis_client.set(f"spot:{spot.spot_code}:status", "OFFLINE")

    # Mark as OFFLINE in Database
    offline_spots.update(status="OFFLINE", status_changed_at=now)
    logger.info(f"[CRON] Updated {len(spots_to_update)} dead spots to OFFLINE")

    # Broadcast updates per section
    for section_id, (a_code, a_name) in affected_sections.items():
        # Parking Detail Broadcast
        all_spots_in_section = Spot.objects.filter(section_id=section_id)
        data = [
            {
                "id": s.id,
                "spot_code": s.spot_code,
                "status": s.status,
                "section_id": s.section_id,
            }
            for s in all_spots_in_section
        ]

        async_to_sync(channel_layer.group_send)(
            f"parking_detail_{a_code}",
            {"type": "spot_update", "timestamp": now.isoformat(), "data": data},
        )

        # Live Display Broadcast (Uses offline mapping so UI boards handle offline state cleanly)
        top_spots = get_live_display_data_for_section(section_id)
        live_data = [
            {
                "id": s.id,
                "spot_code": s.spot_code,
                "section_id": s.section_id,
                "current_status": s.status,
                "status": s.status if s.status != "OFFLINE" else s.offline_last_status,
            }
            for s in top_spots
        ]

        async_to_sync(channel_layer.group_send)(
            f"live_display_{a_code}",
            {
                "type": "live_slots_update",
                "area_name": a_name,
                "area_code": a_code,
                "section_id": section_id,
                "data": live_data,
                "from": "cron_monitor",
            },
        )


@db_periodic_task(crontab(minute="*"))
def check_offline():
    """
    Periodic task to check for unavailability of devices and spots.
    Runs EVERY 1 minute to ensure the 1-min device threshold triggers accurately.
    """
    Device_offline()
    Spot_offline()
