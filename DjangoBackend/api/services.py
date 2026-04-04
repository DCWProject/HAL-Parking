from django.utils import timezone
from .models import Device, Spot, ParkingSection, ParkingArea
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging

logger = logging.getLogger(__name__)


def get_live_display_data_for_section(section_id):
    max_spots = 6
    final_spots = []
    # 1. Priority: Available
    avail_spots = list(
        Spot.objects.filter(section_id=section_id, status="AVAILABLE").order_by(
            "spot_code"
        )[:max_spots]
    )
    final_spots.extend(avail_spots)

    # 2. If slots remaining, fill with Offline (to alert admin/user)
    if len(final_spots) < max_spots:
        needed = max_spots - len(final_spots)
        offline_spots = list(
            Spot.objects.filter(
                section_id=section_id, status__in=["OFFLINE", "OCCUPIED"]
            ).order_by("status")[:needed]
        )
        final_spots.extend(offline_spots)
    return final_spots


def process_sensor_data(device_uid, spots_data):
    """
    Process sensor data from HTTP or MQTT.
    spots_data: list of dicts, e.g. [{'spot_code': 'A1', 'status': 'OCCUPIED'}]
    """
    device = Device.objects.filter(device_uid=device_uid).first()

    # Helper to get spot code safely
    def get_code(d):
        return d.get("spot_code") or d.get("spot")

    if not device:
        logger.info(f"New device detected: {device_uid}. Auto-creating...")
        parking_area = None
        section = None

        if spots_data:
            first_spot_code = get_code(spots_data[0])
            if first_spot_code:
                existing_spot = Spot.objects.filter(spot_code=first_spot_code).first()
                if existing_spot:
                    section = existing_spot.section
                    parking_area = section.parking_area

        if not parking_area:
            parking_area = ParkingArea.objects.first()
            if not parking_area:
                logger.error("No parking areas found. Cannot create device.")
                return

        device = Device.objects.create(
            device_uid=device_uid,
            parking_area=parking_area,
            section=section,
            is_online=True,
            last_seen=timezone.now(),
        )
    else:
        device.last_seen = timezone.now()
        device.is_online = True
        device.save()

    updated_spots = []
    for spot_data in spots_data:
        spot_code = get_code(spot_data)
        status = spot_data.get("status").upper()

        if not spot_code:
            logger.warning(f"Skipping update: Missing spot code in {spot_data}")
            continue

        spot = Spot.objects.filter(spot_code=spot_code).first()
        if spot:
            spot.status = status
            spot.last_updated = timezone.now()
            spot.save()

            updated_spots.append(
                {
                    "id": spot.id,
                    "spot_code": spot.spot_code,
                    "status": spot.status,
                    "section_id": spot.section.id,
                }
            )
        else:
            logger.warning(f"Spot {spot_code} not found")

    if updated_spots:
        channel_layer = get_channel_layer()
        area_code = device.parking_area.area_code if device.parking_area else "default"

        # Broadcast to parking_detail (Send ALL updates, similar to dashboard)
        async_to_sync(channel_layer.group_send)(
            f"parking_detail_{area_code}",
            {
                "type": "spot_update",
                "device": device_uid,
                "timestamp": timezone.now().isoformat(),
                "data": updated_spots,
            },
        )

        # Broadcast to live display (Use optimized logic)
        affected_section_ids = set(s["section_id"] for s in updated_spots)
        for sec_id in affected_section_ids:

            top_spots = get_live_display_data_for_section(sec_id)

            data = [
                {
                    "id": s.id,
                    "spot_code": s.spot_code,
                    "status": s.status,
                    "section_id": s.section_id,
                }
                for s in top_spots
            ]

            async_to_sync(channel_layer.group_send)(
                f"live_display_{area_code}",
                {
                    "type": "live_slots_update",
                    "area_name": (
                        device.parking_area.name if device.parking_area else ""
                    ),
                    "area_code": area_code,
                    "section_id": sec_id,
                    "data": data,
                    "from": "live_display",
                },
            )
