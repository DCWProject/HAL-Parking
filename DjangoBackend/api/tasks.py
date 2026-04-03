from huey import crontab
from huey.contrib.djhuey import db_periodic_task
from django.utils import timezone
from datetime import timedelta
from api.models import Device, Spot
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
from api.services import get_live_display_data_for_section

logger = logging.getLogger(__name__)



def Device_offline():
    """
    Check for devices that have not been seen for more than 1 minute.
    """
    logger.info("Checking for offline devices...")
    threshold = timezone.now() - timedelta(minutes=1)
    offline_devices = Device.objects.filter(is_online=True, last_seen__lt=threshold)

    if not offline_devices.exists():
        return

    channel_layer = get_channel_layer()
    for device in offline_devices:
        device.is_online = False
        device.save()
        
        area_code = device.parking_area.area_code if device.parking_area else "default"
        async_to_sync(channel_layer.group_send)(
            f"dashboard_{area_code}",
            {"type": "device_offline", "device_uid": device.device_uid},
        )

def Spot_offline():
    """
    Check for spots that have not been updated for more than 1 minute.
    """
    logger.info("Checking for offline spots...")
    threshold = timezone.now() - timedelta(minutes=1)
    
    # Filter spots that are NOT currently OFFLINE but haven't been updated in 1 min
    offline_spots = Spot.objects.exclude(status="OFFLINE").filter(last_updated__lt=threshold)

    if not offline_spots.exists():
        return

    channel_layer = get_channel_layer()
    affected_sections = {} # {section_id: (area_code, area_name)}

    # Collect metadata for broadcast
    for spot in offline_spots:
        sec = spot.section
        area = sec.parking_area
        affected_sections[sec.id] = (area.area_code, area.name)
    
    # Mark as OFFLINE
    offline_spots.update(status="OFFLINE")

    # Broadcast updates per section
    for section_id, (a_code, a_name) in affected_sections.items():
        # Dashboard and Parking Detail payload
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
        
        payload = {
            "type": "spot_update",
            "timestamp": timezone.now().isoformat(),
            "data": data,
        }
        
        async_to_sync(channel_layer.group_send)(f"dashboard_{a_code}", payload)
        async_to_sync(channel_layer.group_send)(f"parking_detail_{a_code}", payload)

        # Live Display payload
        top_spots = get_live_display_data_for_section(section_id)
        live_data = [
            {
                "id": s.id,
                "spot_code": s.spot_code,
                "status": s.status,
                "section_id": s.section_id,
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
                "from": "live_display_monitor",
            },
        )

@db_periodic_task(crontab(minute="*"))
def check_offline():
    """
    Periodic task to check for unavailability of devices and spots.
    Runs every minute.
    """
    logger.info("Executing periodic check for offline devices and spots...")
    Device_offline()
    Spot_offline()
