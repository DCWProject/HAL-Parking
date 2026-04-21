import json
import logging
import time
import paho.mqtt.client as mqtt
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# Import your models
from api.services import process_sensor_data
from api.models import Device, Spot, ParkingSection

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Runs the MQTT Listener for InteliPark with full logging"

    def handle(self, *args, **options):
        # --- CONFIGURATION ---
        # It is better to put these in settings.py, but defined here for immediate fix:
        broker = getattr(settings, "MQTT_BROKER_HOST", "localhost")
        port = getattr(settings, "MQTT_BROKER_PORT", 1883)
        username = getattr(settings, "MQTT_BROKER_USERNAME", "") # UPDATE THIS
        password = getattr(settings, "MQTT_BROKER_PASSWORD", "") # UPDATE THIS

        # Handle paho-mqtt v2 vs v1 compatibility
        try:
            from paho.mqtt.enums import CallbackAPIVersion
            client = mqtt.Client(CallbackAPIVersion.VERSION2, client_id="django_backend_listener")
        except (ImportError, AttributeError):
            client = mqtt.Client(client_id="django_backend_listener")

        # Set Credentials to fix "Not authorized"
        if username and password:
            client.username_pw_set(username, password)

        def on_connect(client, userdata, flags, rc, properties=None):
            if rc == 0:
                self.stdout.write(self.style.SUCCESS("CONNECTED: Successfully authorized with MQTT Broker"))
                # Subscribe to topics
                client.subscribe("parking/+/+/status")
                client.subscribe("parking/+/+/response")
                client.subscribe("parking/+/+/log")
            else:
                # rc 4 = Connection refused - bad username/password
                # rc 5 = Connection refused - not authorized
                self.stdout.write(self.style.ERROR(f"FAILED: Connection refused with code {rc}"))

        def on_message(client, userdata, msg):
            try:
                topic_parts = msg.topic.split("/")
                if len(topic_parts) != 4:
                    return
                
                # If the message has the retain flag, it's from the past. Skip it.
                # if msg.retain:
                #     self.stdout.write(self.style.WARNING(f"Filtered out RETAINED message from {msg.topic}"))
                #     return

                area_code = topic_parts[1]
                device_uid = topic_parts[2]
                msg_type = topic_parts[3]
                payload = json.loads(msg.payload.decode())

                # --- 1. HANDLE STATUS (Update Database) ---
                if msg_type == "status":
                    self.stdout.write(self.style.NOTICE(f"STATUS received from {device_uid}"))
                    
                    reported_spots = []
                    active_nodes = 0
                    
                    if "spots" in payload:
                        process_sensor_data(device_uid, payload["spots"])
                        reported_spots = [s.get("spot") for s in payload["spots"] if "spot" in s]
                        active_nodes = sum(1 for s in payload["spots"] if s.get("status") != "OFFLINE")

                    device = Device.objects.filter(device_uid=device_uid).first()
                    if device:
                        device.last_seen = timezone.now()
                        device.is_online = True
                        device.ip_address = payload.get("ip", device.ip_address)
                        device.mac_address = payload.get("mac", device.mac_address)
                        
                        if len(reported_spots) > 0:
                            device.no_of_sensor_nodes = len(reported_spots)
                            device.active_sensor_nodes = active_nodes
                            
                            # Sync sections
                            sections = ParkingSection.objects.filter(spots__spot_code__in=reported_spots).distinct()
                            device.sections.add(*sections)

                        device.save()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing message: {str(e)}"))

        client.on_connect = on_connect
        client.on_message = on_message

        try:
            self.stdout.write(self.style.WARNING(f"Connecting to {broker}:{port}..."))
            client.connect(broker, port, 60)
            self.stdout.write(self.style.SUCCESS("MQTT Listener is running. Press Ctrl+C to stop."))
            client.loop_forever()

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Stopping MQTT Listener..."))
            client.loop_stop()
            client.disconnect()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Critical Error: {e}"))
            client.loop_stop()
            client.disconnect()
