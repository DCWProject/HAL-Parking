#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "secrets.h"

/* =========================================================
   LOGGING CONFIG
   ========================================================= */
#define DEBUG_ENABLED true

// Helper for formatted logging with timestamp
void debugLog(const char* format, ...) {
  if (DEBUG_ENABLED) {
    char buffer[256];
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    Serial.printf("[%lu] %s\n", millis(), buffer);
  }
}

/* =========================================================
   DEVICE ID (AUTO-GENERATED FROM MAC)
   ========================================================= */
String DEVICE_UID;

/* =========================================================
   HARDWARE CONFIG
   ========================================================= */
const int NUM_SLOTS = SLOT_COUNT;

struct SpotConfig {
  const char* code;
  const char* section;
};

const SpotConfig parkingSpots[NUM_SLOTS] = SPOTS_CONFIG;

const int trigPins[NUM_SLOTS] = TRIG_PINS;
const int echoPins[NUM_SLOTS] = ECHO_PINS;

/* =========================================================
   ULTRASONIC CONFIG (REMOTE CONTROLLABLE)
   ========================================================= */
int MIN_DIST_CM = DEFAULT_MIN_DIST_CM;
int MAX_DIST_CM = DEFAULT_MAX_DIST_CM;

/* =========================================================
   STATE
   ========================================================= */
/* =========================================================
   STATE
   ========================================================= */
// 0=AVAILABLE, 1=OCCUPIED, 2=OFFLINE
int slotStatus[NUM_SLOTS];
int lastSlotStatus[NUM_SLOTS];

/* =========================================================
   MQTT
   ========================================================= */
WiFiClient espClient;
PubSubClient mqttClient(espClient);

/* =========================================================
   UTILS
   ========================================================= */
String getDeviceUID() {
  uint64_t chipId = ESP.getEfuseMac(); // unique per ESP32
  char uid[32];
  sprintf(uid, "ESP32_%04X%08X",
          (uint16_t)(chipId >> 32),
          (uint32_t)chipId);
  return String(uid);
}

const char* mqttErrorReason(int state) {
  switch (state) {
    case -4: return "TIMEOUT";
    case -3: return "LOST_CONNECTION";
    case -2: return "CONNECT_FAILED";
    case -1: return "DISCONNECTED";
    case 0: return "CONNECTED";
    case 1: return "BAD_PROTOCOL";
    case 2: return "BAD_CLIENT_ID";
    case 3: return "UNAVAILABLE";
    case 4: return "BAD_CREDENTIALS";
    case 5: return "UNAUTHORIZED";
    default: return "UNKNOWN";
  }
}

/* =========================================================
   WIFI
   ========================================================= */
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  debugLog("📡 Connecting to WiFi: %s", WIFI_SSID);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  debugLog("✅ WiFi Connected!");
  debugLog("🔹 IP Address: %s", WiFi.localIP().toString().c_str());
  debugLog("🔹 Signal Strength (RSSI): %d dBm", WiFi.RSSI());
}

/* =========================================================
   MQTT COMMAND HANDLER
   ========================================================= */
void onMQTTMessage(char* topic, byte* payload, unsigned int length) {
  payload[length] = '\0';
  String message = String((char*)payload);
  
  debugLog("📩 MQTT Message Received");
  debugLog("   Topic: %s", topic);
  debugLog("   Payload: %s", message.c_str());

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    debugLog("❌ JSON Parse Error: %s", error.c_str());
    return;
  }

  String action = doc["action"];

  if (action == "set_threshold") {
    MIN_DIST_CM = doc["min_dist"];
    MAX_DIST_CM = doc["max_dist"];
    debugLog("✅ Threshold Updated: Min=%dcm, Max=%dcm", MIN_DIST_CM, MAX_DIST_CM);
  }

  if (action == "reboot") {
    debugLog("⚠️ Reboot Command Received. Restarting...");
    delay(100);
    ESP.restart();
  }
}

/* =========================================================
   MQTT CONNECT
   ========================================================= */
void connectMQTT() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMQTTMessage);

  while (!mqttClient.connected()) {
    debugLog("🔄 Connecting to MQTT Broker at %s:%d...", MQTT_BROKER, MQTT_PORT);

    // 🔐 AUTH (enable if defined in secrets.h)
    // if (mqttClient.connect(DEVICE_UID.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
    if (mqttClient.connect(DEVICE_UID.c_str())) {
      debugLog("✅ MQTT Connected");

      // Use Device Topic
      String cmdTopic = "parking/" + String(AREA_CODE) + "/" + DEVICE_UID + "/command";

      if (mqttClient.subscribe(cmdTopic.c_str())) {
        debugLog("✅ Subscribed to: %s", cmdTopic.c_str());
      } else {
        debugLog("❌ Subscription failed for: %s", cmdTopic.c_str());
      }
      
      publishStatus();
      
    } else {
      debugLog("❌ MQTT Connect Failed. State: %d (%s)", mqttClient.state(), mqttErrorReason(mqttClient.state()));
      debugLog("🕒 Retrying in 3 seconds...");
      delay(3000);
    }
  }
}

/* =========================================================
   PUBLISH STATUS
   ========================================================= */
void publishStatus() {
  StaticJsonDocument<1024> doc; // Increased buffer for larger payload

  doc["device_uid"] = DEVICE_UID;
  doc["area"] = AREA_CODE;
  doc["ip_address"] = WiFi.localIP().toString();

  JsonArray spots = doc.createNestedArray("spots");

  for (int i = 0; i < NUM_SLOTS; i++) {
    JsonObject s = spots.createNestedObject();
    s["spot_code"] = parkingSpots[i].code;
    s["section_code"] = parkingSpots[i].section; 
    
    // Convert int state to string
    switch(slotStatus[i]) {
      case 1: s["status"] = "OCCUPIED"; break;
      case 2: s["status"] = "OFFLINE"; break;
      default: s["status"] = "AVAILABLE"; break;
    }
  }

  char payload[1024];
  size_t n = serializeJson(doc, payload);

  // Topic: parking/AREA/DEVICE/status
  String topic = "parking/" + String(AREA_CODE) + "/" + DEVICE_UID + "/status";

  if (mqttClient.publish(topic.c_str(), payload, true)) {
    debugLog("📤 Status Published (%d bytes)", n);
    debugLog("   Topic: %s", topic.c_str());
  } else {
    debugLog("❌ Publish Failed! (Payload size: %d)", n);
  }
}

/* =========================================================
   SENSOR READ
   ========================================================= */
/* =========================================================
   SENSOR READ
   ========================================================= */
int readUltrasonic(int index) {
  // HC-SR04 requires ~60ms measurement cycle to prevent echo overlap
  // Retry 5 times to be very sure before declaring OFFLINE
  for (int retry = 0; retry < 5; retry++) {
    digitalWrite(trigPins[index], LOW);
    delayMicroseconds(2);
    digitalWrite(trigPins[index], HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPins[index], LOW);
  
    // 30ms timeout ~ 5 meters
    long duration = pulseIn(echoPins[index], HIGH, 30000);
    
    if (duration > 0) {
      float dist = (duration / 2.0) * 0.0343;
      if (dist >= MIN_DIST_CM && dist <= MAX_DIST_CM) {
        return 1; // OCCUPIED
      } else {
        return 0; // AVAILABLE (Valid reading, just out of occupy range)
      }
    }
    
    // Valid reading not found (0 returned).
    // Wait before retrying to let echoes die down.
    delay(30); 
  }

  // Consistent failure to read -> Sensor likely disconnected
  return 2; // OFFLINE
}

/* =========================================================
   SETUP
   ========================================================= */
void setup() {
  Serial.begin(115200);
  // Wait a bit for serial to stabilize
  delay(1000); 

  debugLog("🚀 Starting System...");

  // 🛠️ FIX: Increase buffer size for large JSON payloads
  // Default is often 256 bytes, but our payload is ~560+ bytes
  mqttClient.setBufferSize(2048);

  DEVICE_UID = getDeviceUID();
  debugLog("🆔 Device UID: %s", DEVICE_UID.c_str());

  for (int i = 0; i < NUM_SLOTS; i++) {
    pinMode(trigPins[i], OUTPUT);
    pinMode(echoPins[i], INPUT);
  }

  connectWiFi();
  connectMQTT();
}

/* =========================================================
   LOOP
   ========================================================= */
unsigned long lastHeartbeat = 0;
const long HEARTBEAT_INTERVAL = 5000; // 5 seconds

void loop() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  bool changed = false;

  for (int i = 0; i < NUM_SLOTS; i++) {
    slotStatus[i] = readUltrasonic(i);
    if (slotStatus[i] != lastSlotStatus[i]) {
      const char* statusStr = (slotStatus[i] == 1) ? "OCCUPIED" : (slotStatus[i] == 2 ? "OFFLINE" : "AVAILABLE");
      
      debugLog("🔄 Spot Update: %s (%s) -> %s", 
               parkingSpots[i].code, 
               parkingSpots[i].section, 
               statusStr);
               
      lastSlotStatus[i] = slotStatus[i];
      changed = true;
    }
    delay(40);
  }

  // Publish if changed OR if heartbeat time has passed
  unsigned long now = millis();
  if (changed || (now - lastHeartbeat > HEARTBEAT_INTERVAL)) {
    if (changed) debugLog("⚡ Status Changed. Triggering Publish...");
    else debugLog("💓 Heartbeat Publish...");
    
    publishStatus();
    lastHeartbeat = now;
  }
}
