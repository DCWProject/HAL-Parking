import json
import time
import sys
import paho.mqtt.client as mqtt

# MQTT settings
BROKER_HOST = "localhost"
PORT = 1883

# Device mappings matching section setup in database
DEVICES = {
    "A": {
        "uid": "ESP32_7821846BF254",
        "mac": "78:21:84:6B:F2:54",
        "ip": "192.168.1.150",
    },
    "B": {
        "uid": "ESP32_307B6B842178",
        "mac": "30:7B:6B:84:21:78",
        "ip": "192.168.1.151",
    },
    "C": {
        "uid": "ESP32_B8E26B842178",
        "mac": "B8:E2:6B:84:21:78",
        "ip": "192.168.1.152",
    },
    "D": {
        "uid": "ESP32_DCDF6B842178",
        "mac": "DC:DF:6B:84:21:78",
        "ip": "192.168.1.153",
    },
}


def get_spots_payload(section_code, status="AVAILABLE"):
    spots = []
    # Section spots are A-01 to A-18, B-01 to B-18, etc.
    for i in range(1, 19):
        spot_code = f"{section_code}-{i:02d}"
        spot_status = status
        if status == "LIVE":
            import random

            spot_status = random.choice(["OCCUPIED", "AVAILABLE", "OFFLINE"])

        spots.append(
            {
                "spot": spot_code,
                "status": spot_status,
                "dist": 40 if spot_status == "OCCUPIED" else 150,
            }
        )

    device_info = DEVICES[section_code]
    return {"ip": device_info["ip"], "mac": device_info["mac"], "spots": spots}


def publish_section(client, section_code, status):
    topic = f"parking/EP01/{DEVICES[section_code]['uid']}/status"
    payload = get_spots_payload(section_code, status)
    preview = [f"{s['spot']}: {s['status']}" for s in payload["spots"][:3]]
    print(f"Publishing {section_code} status {status} to {topic}: {preview}...")
    client.publish(topic, json.dumps(payload))


def main():
    if len(sys.argv) < 3:
        print(
            "Usage: python simulate_esp32.py [A|B|C|D|ALL] [live|available|occupied|offline|loop]"
        )
        sys.exit(1)

    section = sys.argv[1].upper()
    mode = sys.argv[2].upper()

    if section not in ["A", "B", "C", "D", "ALL"]:
        print("Invalid section! Must be A, B, C, D, or ALL.")
        sys.exit(1)

    client = mqtt.Client(client_id="simulate_esp32_script")
    client.connect(BROKER_HOST, PORT, 60)
    client.loop_start()

    sections_to_run = ["A", "B", "C", "D"] if section == "ALL" else [section]

    try:
        if mode == "LOOP":
            print(
                f"Simulating ESP32 heartbeats every 10 seconds for section(s) {sections_to_run}. Press Ctrl+C to stop."
            )
            while True:
                for sec in sections_to_run:
                    publish_section(client, sec, "LIVE")
                time.sleep(10)
        else:
            status_map = {
                "LIVE": "LIVE",
                "AVAILABLE": "AVAILABLE",
                "OCCUPIED": "OCCUPIED",
                "OFFLINE": "OFFLINE",
            }
            status = status_map.get(mode, "AVAILABLE")
            for sec in sections_to_run:
                publish_section(client, sec, status)
            time.sleep(1)  # Let the publish complete
            print("Done.")

    except KeyboardInterrupt:
        print("Stopping simulation.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
