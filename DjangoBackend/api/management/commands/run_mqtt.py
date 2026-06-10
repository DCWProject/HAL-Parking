import json
import logging
import time
import random
import sys
import redis
import paho.mqtt.client as mqtt
from django.core.management.base import BaseCommand
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime

# Import the background tasks
from api.tasks import save_spot_state_to_db, update_device_heartbeat
from api.models import Spot

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "High-Speed Redis-First MQTT Router"

    def handle(self, *args, **options):
        broker = getattr(settings, "MQTT_BROKER_HOST", "localhost")
        port = getattr(settings, "MQTT_BROKER_PORT", 1883)
        username = getattr(settings, "MQTT_BROKER_USERNAME", "")
        password = getattr(settings, "MQTT_BROKER_PASSWORD", "")

        redis_client = redis.Redis(
            host="127.0.0.1", port=6379, db=0, decode_responses=True
        )
        channel_layer = get_channel_layer()
        is_grid_view = getattr(settings, "IS_DISPLAY_GRID_VIEW", False)

        # ==========================================
        # INITIAL STARTUP: LOAD DATABASE TO REDIS
        # ==========================================
        self.stdout.write(self.style.WARNING("Caching Topology to Redis..."))
        spots = (
            Spot.objects.select_related("section", "section__parking_area")
            .all()
            .order_by("spot_code")
        )
        for spot in spots:
            sc = spot.spot_code
            sec_id = spot.section.id

            redis_client.hset(
                f"spot:{sc}:meta",
                mapping={
                    "id": spot.id,
                    "section_id": sec_id,
                    "area_code": spot.section.parking_area.area_code,
                },
            )
            redis_client.set(f"spot:{sc}:status", spot.status)
            redis_client.set(f"spot:{sc}:offline_last", spot.offline_last_status)
            redis_client.sadd(f"section:{sec_id}:spots", sc)

        self.stdout.write(
            self.style.SUCCESS("Topology Cached! Zero-Latency MQTT Routing Active.")
        )

        # ==========================================
        # MQTT CLIENT SETUP
        # ==========================================
        unique_client_id = f"inteli-park-fast-router_{random.randint(10000, 99999)}"

        try:
            from paho.mqtt.enums import CallbackAPIVersion

            client = mqtt.Client(
                CallbackAPIVersion.VERSION2, client_id=unique_client_id
            )
        except:
            client = mqtt.Client(client_id=unique_client_id)

        if username and password:
            client.username_pw_set(username, password)

        # --- CALLBACKS ---

        def on_connect(client, userdata, flags, rc, properties=None):
            if rc == 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"CONNECTED: MQTT Router [{unique_client_id}] Active"
                    )
                )
                client.subscribe("parking/+/+/status")
            else:
                self.stdout.write(
                    self.style.ERROR(f"Connection Failed with Code: {rc}")
                )

        def on_disconnect(client, userdata, *args):
            """
            Catches unexpected drops and graceful shutdowns.
            Using *args handles the signature difference between Paho MQTT v1 and v2.
            """
            rc = args[0] if len(args) == 1 else args[1]
            if rc == 0:
                self.stdout.write(
                    self.style.WARNING(
                        f"\n[{unique_client_id}] Disconnected gracefully from broker."
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"\n[{unique_client_id}] Unexpected disconnection (Code {rc}). Auto-reconnecting..."
                    )
                )
                logger.warning(f"Unexpected MQTT disconnection. Code: {rc}")

        def on_message(client, userdata, msg):
            try:
                topic_parts = msg.topic.split("/")
                if len(topic_parts) != 4:
                    return

                device_uid = topic_parts[2]
                payload = json.loads(msg.payload.decode())

                if topic_parts[3] == "status" and "spots" in payload:
                    now = time.time()

                    # --- DEVICE HEARTBEAT (Throttled to 10s) ---
                    device_key = f"device:{device_uid}:heartbeat"
                    if (now - float(redis_client.get(device_key) or 0)) > 10.0:
                        update_device_heartbeat(
                            device_uid,
                            payload.get("ip"),
                            payload.get("mac"),
                            [s.get("spot") for s in payload["spots"] if "spot" in s],
                            sum(
                                1
                                for s in payload["spots"]
                                if s.get("status", "") != "OFFLINE"
                            ),
                        )
                        redis_client.set(device_key, now)
                    spot_codes = [
                        f"{s.get('spot')}- {s.get('status')} [{s.get('dist')} cm] "
                        for s in payload["spots"]
                    ]
                    print(
                        f"RCV Time {datetime.now().strftime('%H:%M:%S')}  - {spot_codes}"
                    )
                    # --- SPOT ROUTING ---
                    is_sent_socket = False
                    sent_time = None
                    for spot_data in payload["spots"]:
                        spot_code = spot_data.get("spot")
                        new_status = spot_data.get("status", "").upper()

                        if not spot_code or not new_status:
                            continue

                        if not redis_client.exists(f"spot:{spot_code}:meta"):
                            continue

                        threshold = getattr(
                            settings, f"{new_status}_STABLE_SECONDS", 0.5
                        )
                        cache_key = f"spot:{spot_code}:state"
                        cached = redis_client.hgetall(cache_key)
                        last_raw = cached.get("last_raw", "")
                        started_at = float(cached.get("started_at", now))
                        is_synced = cached.get("is_synced", "0")

                        if new_status != last_raw:
                            redis_client.hset(
                                cache_key,
                                mapping={
                                    "last_raw": new_status,
                                    "started_at": now,
                                    "is_synced": "0",
                                },
                            )
                        else:
                            # Check if it has been stable long enough to pass the threshold
                            # AND ensure we haven't already synced this exact event.
                            if (now - started_at) >= float(
                                threshold
                            ) and is_synced == "0":

                                # 1. Update Local Redis State instantly
                                redis_client.set(f"spot:{spot_code}:status", new_status)
                                if new_status != "OFFLINE":
                                    redis_client.set(
                                        f"spot:{spot_code}:offline_last", new_status
                                    )

                                meta = redis_client.hgetall(f"spot:{spot_code}:meta")

                                sec_id = int(meta["section_id"])
                                area_code = meta["area_code"]

                                # 2. Calculate Section Display instantly from Redis Memory
                                sec_spot_codes = redis_client.smembers(
                                    f"section:{sec_id}:spots"
                                )
                                all_section_data = []

                                for sc in sec_spot_codes:
                                    s_meta = redis_client.hgetall(f"spot:{sc}:meta")
                                    s_stat = redis_client.get(f"spot:{sc}:status")
                                    s_off = redis_client.get(f"spot:{sc}:offline_last")

                                    all_section_data.append(
                                        {
                                            "id": int(s_meta["id"]),
                                            "spot_code": sc,
                                            "status": s_stat,
                                            "offline_last": s_off,
                                            "section_id": int(s_meta["section_id"]),
                                        }
                                    )

                                # Sort Alphabetically by spot code
                                all_section_data.sort(key=lambda x: x["spot_code"])

                                # Apply UI Logic (Grid vs Top 6)
                                display_payload = []
                                if is_grid_view:
                                    display_payload = all_section_data
                                else:
                                    avail = [
                                        s
                                        for s in all_section_data
                                        if s["status"] == "AVAILABLE"
                                    ][:6]
                                    display_payload.extend(avail)
                                    if len(display_payload) < 6:
                                        needed = 6 - len(display_payload)
                                        others = [
                                            s
                                            for s in all_section_data
                                            if s["status"] in ["OFFLINE", "OCCUPIED"]
                                        ][:needed]
                                        display_payload.extend(others)

                                # Map the OFFLINE status strictly for the UI boards
                                final_payload = [
                                    {
                                        "id": s["id"],
                                        "spot_code": s["spot_code"],
                                        "section_id": s["section_id"],
                                        "current_status": s["status"],
                                        "status": (
                                            s["status"]
                                            if s["status"] != "OFFLINE"
                                            else s["offline_last"]
                                        ),
                                    }
                                    for s in display_payload
                                ]

                                # 3. Broadcast VIP Display Array instantly (To the LED Boards)
                                async_to_sync(channel_layer.group_send)(
                                    f"live_display_{area_code}",
                                    {
                                        "type": "live_slots_update",
                                        "area_code": area_code,
                                        "section_id": sec_id,
                                        "data": final_payload,
                                        "from": "live_display",
                                    },
                                )
                                is_sent_socket = True
                                sent_time = datetime.now().strftime("%H:%M:%S")
                                # 4. Trigger Huey to save DB and broadcast to Admin Dashboard
                                save_spot_state_to_db(spot_code, new_status, device_uid)

                                # 5. Lock it out so it doesn't fire again until the state actually changes
                                redis_client.hset(cache_key, "is_synced", "1")

                    if is_sent_socket:
                        print(f"SENT TIME {sent_time}  - {spot_codes}")
            except Exception as e:
                logger.error(f"MQTT Router Error: {e}")

        # Attach callbacks
        client.on_connect = on_connect
        client.on_disconnect = on_disconnect
        client.on_message = on_message

        # ==========================================
        # EXECUTION BLOCK & GRACEFUL SHUTDOWN
        # ==========================================
        try:
            self.stdout.write(self.style.WARNING(f"Connecting to {broker}:{port}..."))
            client.connect(broker, port, 60)

            # Starts a background thread to handle network traffic safely
            client.loop_forever()

        except KeyboardInterrupt:
            # Handle Ctrl+C cleanly
            self.stdout.write(self.style.WARNING("\nInitiating graceful shutdown..."))

            client.loop_stop()  # Stop the background network loop
            client.disconnect()  # Fire the graceful disconnect to the broker

            self.stdout.write(
                self.style.SUCCESS("MQTT Listener completely stopped. Safe to exit.")
            )
            sys.exit(0)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\nCritical Execution Error: {e}"))
            client.loop_stop()
            client.disconnect()
            sys.exit(1)
