import paho.mqtt.client as mqtt
import json
import logging
import asyncio
from app.services.sensor_service import process_sensor_data
from app.schemas.device import SensorPayload

logger = logging.getLogger(__name__)

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "parking/#"

# The callbacks must be synchronous for paho-mqtt, but we want to call async code.
# We'll use an event loop helper.


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Connected to MQTT Broker")
        client.subscribe(MQTT_TOPIC)
    else:
        logger.error(f"Failed to connect, return code {rc}")


def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload_str = msg.payload.decode()
        logger.info(f"Received message on {topic}")
        # Topic structure: parking/{area}/{device_uid}/status
        parts = topic.split("/")
        if len(parts) >= 4 and parts[-1] == "status":
            device_uid = parts[2]
            area_code = parts[1]
            data = json.loads(payload_str)
            data["area_code"] = area_code
            # Validate with Pydantic
            sensor_payload = SensorPayload(**data)
            logger.info(f"Processing sensor data for Area {area_code}")
            for sp in sensor_payload.spots:
                logger.info(f"Spot {sp.spot_code} ==>Status: {sp.status}")
            # Fire and forget async task
            asyncio.run_coroutine_threadsafe(
                process_sensor_data(device_uid, sensor_payload), userdata["loop"]
            )

    except Exception as e:
        logger.error(f"Error processing MQTT message: {e}")


def start_mqtt():
    logger.info("🚀 Attempting to start MQTT Client...")
    loop = asyncio.get_running_loop()

    # Specify callback API version for paho-mqtt 2.0+ compatibility
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, userdata={"loop": loop})
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()  # Runs in a separate thread
        logger.info("MQTT Client started")
        return client
    except Exception as e:
        logger.error(f"Could not connect to MQTT Broker: {e}")
        return None
