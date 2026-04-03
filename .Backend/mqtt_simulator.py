"""
ESP32 MQTT Simulator for InteliPark System

This simulator mimics ESP32 devices with ultrasonic sensors.
Each ESP32 can control up to 8 ultrasonic sensors (one per parking spot).

Usage:
    python mqtt_simulator.py

Features:
- Simulates multiple ESP32 devices
- Each device reports 8 parking spots
- Random occupancy changes
- Auto device registration
- Realistic sensor behavior
"""

import paho.mqtt.client as mqtt
import json
import time
import random
import logging
from datetime import datetime
from typing import List, Dict
from .mqtt_simulation_data import SIMULATION_DATA

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

from mqtt_simulation_data import SIMULATION_DATA

# MQTT Configuration
MQTT_BROKER = "localhost"  # Change to your broker address
MQTT_PORT = 1883
MQTT_KEEPALIVE = 60

# Simulation Configuration from Data
META_DATA = SIMULATION_DATA["META_DATA"][0]
UPDATE_INTERVAL = META_DATA.get("update_interval", 5)
CHANGE_PROBABILITY = META_DATA.get("change_probability", 0.2)


class ESP32Simulator:
    """Simulates a single ESP32 device with ultrasonic sensors"""

    def __init__(self, device_config: Dict):
        self.device_id = device_config["device_id"]
        self.device_uid = f"ESP32_{self.device_id:03d}"
        self.area_code = device_config.get("area_code", "AREA1")

        # Determine primary section from first spot, or default to "A"
        raw_spots = device_config.get("spots", [])
        self.section_code = raw_spots[0]["section_code"] if raw_spots else "A"

        self.ip_address = f"192.168.1.{100 + self.device_id}"

        # Initialize parking spots from config
        self.spots = []
        for spot_cfg in raw_spots:
            self.spots.append(
                {
                    "spot_code": spot_cfg["spot_code"],
                    "section_code": spot_cfg["section_code"],
                    "occupied": random.choice([True, False]),  # Random initial state
                    "distance_cm": random.randint(
                        10, 200
                    ),  # Simulated distance reading
                }
            )

        logger.info(
            f"Initialized {self.device_uid} ({self.area_code}) with IP {self.ip_address}"
        )
        logger.info(f"Managing spots: {[s['spot_code'] for s in self.spots]}")

    def get_topic(self) -> str:
        """Get MQTT topic for this device"""
        # Topic structure: parking/{area}/{device_uid}/status
        return f"parking/{self.area_code}/{self.device_uid}/status"

    # Simulation Config
    TIME_SCALE = 1  # 1 = Real time
    # Dwell time: 20 min to 2 hours
    MIN_DWELL_SECONDS = 20 * 60
    MAX_DWELL_SECONDS = 2 * 60 * 60
    # Vacancy time: 5 min to 30 min
    MIN_VACANT_SECONDS = 5 * 60
    MAX_VACANT_SECONDS = 30 * 60

    def simulate_sensor_reading(self):
        """Simulate ultrasonic sensor readings and update occupancy based on duration"""
        current_time = time.time()

        for spot in self.spots:
            # Initialize state tracking if not present
            if "last_status_change" not in spot:
                spot["last_status_change"] = current_time - random.randint(0, 3600)
                spot["target_duration"] = random.randint(
                    self.MIN_DWELL_SECONDS, self.MAX_DWELL_SECONDS
                )

            elapsed_time = (current_time - spot["last_status_change"]) * self.TIME_SCALE

            should_change = False
            if elapsed_time > spot["target_duration"]:
                # Check random probability for churn if duration met
                # Or just force flip? Random choice + duration seems good.
                # Let's add a small probability check to not flip exactly at duration every time
                # but for simulator responsiveness, flipping is better.
                should_change = True

            if should_change:
                # Toggle status
                spot["occupied"] = not spot["occupied"]
                spot["last_status_change"] = current_time

                if spot["occupied"]:
                    # How long will the car stay?
                    spot["target_duration"] = random.randint(
                        self.MIN_DWELL_SECONDS, self.MAX_DWELL_SECONDS
                    )
                    logger.info(
                        f"🚗 Car PARKED at {spot['spot_code']} (Will stay for {spot['target_duration']/60:.1f} min)"
                    )
                else:
                    # How long will it stay empty?
                    spot["target_duration"] = random.randint(
                        self.MIN_VACANT_SECONDS, self.MAX_VACANT_SECONDS
                    )
                    logger.info(
                        f"💨 Car LEFT {spot['spot_code']} (Vacant for {spot['target_duration']/60:.1f} min)"
                    )

                # Update distance based on new occupancy
                if spot["occupied"]:
                    spot["distance_cm"] = random.randint(10, 50)
                else:
                    spot["distance_cm"] = random.randint(100, 200)

            # Add jitter to reading
            else:
                noise = random.randint(-2, 2)
                if spot["occupied"]:
                    spot["distance_cm"] = max(10, min(50, spot["distance_cm"] + noise))
                else:
                    spot["distance_cm"] = max(
                        100, min(200, spot["distance_cm"] + noise)
                    )

    def get_payload(self) -> Dict:
        """Generate MQTT payload"""
        return {
            "device_uid": self.device_uid,
            "timestamp": datetime.now().isoformat(),
            "ip_address": self.ip_address,
            "spots": [
                {
                    "spot_code": spot["spot_code"],
                    "status": "OCCUPIED" if spot["occupied"] else "AVAILABLE",
                }
                for spot in self.spots
            ],
            "metadata": {
                "wifi_signal": random.randint(-80, -30),
                "uptime_seconds": int(time.time()),
                "sensor_count": len(self.spots),
            },
        }


class MQTTSimulator:
    """Main simulator managing multiple ESP32 devices"""

    def __init__(self):
        self.client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION1, client_id="ESP32_Simulator"
        )
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_publish = self.on_publish

        # Create ESP32 devices from Data
        self.devices: List[ESP32Simulator] = []

        device_configs = SIMULATION_DATA.get("PARKING_DEVICES_ESP32", [])
        for config in device_configs:
            device = ESP32Simulator(config)
            self.devices.append(device)

        self.running = False

    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            logger.info(f"✅ Connected to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}")
            logger.info(f"Simulating {len(self.devices)} ESP32 devices")
        else:
            logger.error(f"❌ Failed to connect, return code {rc}")

    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        if rc != 0:
            logger.warning(f"Unexpected disconnection. Return code: {rc}")

    def on_publish(self, client, userdata, mid):
        """Callback when message is published"""
        logger.debug(f"Message {mid} published")

    def connect(self):
        """Connect to MQTT broker"""
        try:
            logger.info(f"Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}...")
            self.client.connect(MQTT_BROKER, MQTT_PORT, MQTT_KEEPALIVE)
            self.client.loop_start()
            time.sleep(1)  # Wait for connection
            return True
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            return False

    def publish_device_data(self, device: ESP32Simulator):
        """Publish data from a single device"""
        topic = device.get_topic()
        payload = device.get_payload()
        payload_json = json.dumps(payload)

        result = self.client.publish(topic, payload_json, qos=1)

        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"📤 Published data from {device.device_uid} to {topic}")
        else:
            logger.error(f"Failed to publish data from {device.device_uid}")

    def run(self):
        """Main simulation loop"""
        if not self.connect():
            return

        self.running = True
        logger.info("🚀 Starting simulation...")
        logger.info(f"Update interval: {UPDATE_INTERVAL} seconds")
        logger.info("Press Ctrl+C to stop\n")

        try:
            iteration = 0
            while self.running:
                iteration += 1
                logger.info(f"\n{'='*60}")
                logger.info(
                    f"Iteration #{iteration} - {datetime.now().strftime('%H:%M:%S')}"
                )
                logger.info(f"{'='*60}")

                # Update and publish data from all devices
                for device in self.devices:
                    device.simulate_sensor_reading()
                    self.publish_device_data(device)
                    time.sleep(0.5)  # Small delay between devices

                logger.info(
                    f"\n⏳ Waiting {UPDATE_INTERVAL} seconds until next update..."
                )
                time.sleep(UPDATE_INTERVAL)

        except KeyboardInterrupt:
            logger.info("\n\n🛑 Stopping simulation...")
        finally:
            self.stop()

    def stop(self):
        """Stop the simulator"""
        self.running = False
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("✅ Simulator stopped")


def main():
    """Main entry point"""
    print(
        """
    ╔══════════════════════════════════════════════════════════╗
    ║         ESP32 MQTT Simulator for InteliPark              ║
    ║                                                          ║
    ║  Simulating IoT parking sensors with MQTT protocol       ║
    ╚══════════════════════════════════════════════════════════╝
    """
    )

    simulator = MQTTSimulator()
    simulator.run()


if __name__ == "__main__":
    main()
