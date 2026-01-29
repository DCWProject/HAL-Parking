# MQTT Simulator - ESP32 Parking Sensors

## Overview

This simulator mimics ESP32 devices with ultrasonic sensors for the InteliPark system.

### System Architecture

```
ESP32 Device (Simulated)
├── WiFi Connection → Gets IP Address
├── 8 Ultrasonic Sensors
│   ├── Sensor 1 → Spot A-01
│   ├── Sensor 2 → Spot A-02
│   ├── ...
│   └── Sensor 8 → Spot A-08
└── MQTT Client → Publishes to Server
```

## Prerequisites

1. **Install MQTT Broker** (if not already running):

   ```bash
   # Windows (using Chocolatey)
   choco install mosquitto

   # Or download from: https://mosquitto.org/download/
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install paho-mqtt
   ```

## Configuration

Edit `mqtt_simulator.py` to configure:

```python
# MQTT Broker
MQTT_BROKER = "localhost"  # Change to your broker IP
MQTT_PORT = 1883

# Simulation
NUM_DEVICES = 2  # Number of ESP32 devices
SENSORS_PER_DEVICE = 8  # Sensors per device
UPDATE_INTERVAL = 5  # Seconds between updates
```

## Running the Simulator

### Step 1: Start the Backend Server

```bash
cd Backend
uvicorn app.main:app --reload
```

### Step 2: Create Parking Areas and Spots

Before running the simulator, ensure you have:

- Created a parking area
- Created sections (e.g., Section A, Section B)
- Created spots matching the simulator codes (e.g., A-01, A-02, ..., A-08)

### Step 3: Start MQTT Broker

```bash
# Start Mosquitto broker
mosquitto -v
```

### Step 4: Run the Simulator

```bash
cd Backend
python mqtt_simulator.py
```

## Expected Output

```
╔══════════════════════════════════════════════════════════╗
║         ESP32 MQTT Simulator for InteliPark             ║
║                                                          ║
║  Simulating IoT parking sensors with MQTT protocol      ║
╚══════════════════════════════════════════════════════════╝

2026-01-07 18:00:00 - INFO - Initialized ESP32_001 with IP 192.168.1.101
2026-01-07 18:00:00 - INFO - Managing spots: ['A-01', 'A-02', 'A-03', 'A-04', 'A-05', 'A-06', 'A-07', 'A-08']
2026-01-07 18:00:00 - INFO - ✅ Connected to MQTT Broker at localhost:1883
2026-01-07 18:00:00 - INFO - 🚀 Starting simulation...

============================================================
Iteration #1 - 18:00:05
============================================================
2026-01-07 18:00:05 - INFO - ESP32_001 - A-01: OCCUPIED (distance: 35cm)
2026-01-07 18:00:05 - INFO - ESP32_001 - A-03: AVAILABLE (distance: 150cm)
2026-01-07 18:00:05 - INFO - 📤 Published data from ESP32_001 to parking/area1/A/ESP32_001/status
```

## MQTT Topic Structure

```
parking/{area}/{section}/{device_uid}/status
```

Example: `parking/area1/A/ESP32_001/status`

## Payload Format

```json
{
  "device_uid": "ESP32_001",
  "timestamp": "2026-01-07T18:00:05.123456",
  "ip_address": "192.168.1.101",
  "spots": [
    {
      "spot_code": "A-01",
      "occupied": true
    },
    {
      "spot_code": "A-02",
      "occupied": false
    }
  ],
  "metadata": {
    "wifi_signal": -45,
    "uptime_seconds": 1234567,
    "sensor_count": 8
  }
}
```

## Viewing Results

### 1. Backend Logs

Watch the backend console for:

- Device auto-creation
- Spot status updates
- WebSocket broadcasts

### 2. Frontend Dashboard

- Open the ParkingDetail page
- Watch spots change from Available (green) to Occupied (red)
- See real-time updates via WebSocket

### 3. Database

Query devices and spots:

```sql
SELECT * FROM devices;
SELECT * FROM spots WHERE section_id = 1;
```

## Troubleshooting

### Simulator can't connect to MQTT broker

- Ensure Mosquitto is running: `mosquitto -v`
- Check firewall settings
- Verify MQTT_BROKER address in simulator

### Spots not updating

- Ensure spot codes in database match simulator codes
- Check backend logs for errors
- Verify WebSocket connection in browser console

### Device not auto-created

- Check backend logs for errors
- Ensure at least one parking area exists
- Verify database connection

## Customization

### Add More Devices

```python
NUM_DEVICES = 5  # Simulate 5 ESP32 devices
```

### Change Update Frequency

```python
UPDATE_INTERVAL = 10  # Update every 10 seconds
```

### Adjust Occupancy Change Rate

```python
CHANGE_PROBABILITY = 0.3  # 30% chance of change per update
```

## Real ESP32 Integration

To integrate real ESP32 devices:

1. **Flash ESP32** with MQTT client code
2. **Configure WiFi** credentials
3. **Set MQTT broker** address
4. **Implement ultrasonic sensor** reading logic
5. **Publish to same topic structure**

Example ESP32 code structure:

```cpp
// Connect to WiFi
WiFi.begin(ssid, password);

// Connect to MQTT
client.connect(mqtt_server, 1883);

// Read sensors and publish
for (int i = 0; i < 8; i++) {
    int distance = readUltrasonic(i);
    bool occupied = (distance < 50);
    // Add to payload
}
client.publish(topic, payload);
```

## Support

For issues or questions, check:

- Backend logs: `app.log`
- MQTT broker logs: `mosquitto -v`
- Simulator output

with custom condfig file  
"C:\Program Files\mosquitto\mosquitto" -c "e:\INTELISPARKZ\InteliPark\my_config.conf" -v
