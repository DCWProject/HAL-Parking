#include "secrets.h"
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <stdarg.h>

/* =========================================================
   LOGGING CONFIG
   ========================================================= */

// Global Debug Flag
bool DEBUG_ENABLED = true;
unsigned long lastLogTime = 0;
const int MIN_LOG_INTERVAL = 200; // 5 logs/sec max

/* =========================================================
   DEVICE ID
   ========================================================= */
String DEVICE_UID;

/* =========================================================
   HARDWARE CONFIG
   ========================================================= */
const int NUM_SLOTS = SLOT_COUNT;

struct SpotConfig {
  const char *code;
  const char *section;
  int minDist;
  int maxDist;
};

SpotConfig parkingSpots[NUM_SLOTS] = SPOTS_CONFIG;
const int trigPins[NUM_SLOTS] = TRIG_PINS;
const int echoPins[NUM_SLOTS] = ECHO_PINS;

/* =========================================================
   SENSOR CONFIG
   ========================================================= */
// Sensor thresholds are now per-spot in SpotConfig

/* =========================================================
   STATE
   ========================================================= */
// 0 = AVAILABLE, 1 = OCCUPIED, 2 = OFFLINE
int slotStatus[NUM_SLOTS] = {0};
int confirmedStatus[NUM_SLOTS] = {0};
int pendingStatus[NUM_SLOTS] = {0};
unsigned long pendingSince[NUM_SLOTS] = {0};

/* =========================================================
   MQTT
   ========================================================= */
WiFiClient espClient;
PubSubClient mqttClient(espClient);

/* =========================================================
   UTILS
   ========================================================= */
String getDeviceUID() {
  uint64_t chipId = ESP.getEfuseMac();
  char uid[32];
  sprintf(uid, "ESP32_%04X%08X", (uint16_t)(chipId >> 32), (uint32_t)chipId);
  return String(uid);
}

const char *statusToStr(int status) {
  switch (status) {
  case 1:
    return "OCCUPIED";
  case 2:
    return "OFFLINE";
  default:
    return "AVAILABLE";
  }
}

/* =========================================================
   WIFI
   ========================================================= */

/* =========================================================
   LOGGING HELPER
   ========================================================= */
void publishLog(const char *message) {
  StaticJsonDocument<512> doc;
  doc["log"] = message;
  
  char payload[512];
  serializeJson(doc, payload);
  
  String topic = "parking/" + String(AREA_CODE) + "/" + DEVICE_UID + "/log";
  mqttClient.publish(topic.c_str(), payload, false);
}

void debugLog(const char *format, ...) {
  if (!DEBUG_ENABLED)
    return;
  char buffer[256];
  va_list args;
  va_start(args, format);
  vsnprintf(buffer, sizeof(buffer), format, args);
  va_end(args);
  Serial.printf("[%lu] %s\n", millis(), buffer);
  
  // Publish to MQTT if connected and enough time passed
  // Publish to MQTT if connected
  if (mqttClient.connected()) {
      publishLog(buffer);
      // lastLogTime = millis(); // Removed throttling
  }
}

// void connectWiFiOld() {
//   WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
//   debugLog("📡 Connecting to WiFi...");

//   while (WiFi.status() != WL_CONNECTED) {
//     delay(500);
//     Serial.print(".");
//   }
//   Serial.println();
//   debugLog("✅ WiFi Connected | IP: %s", WiFi.localIP().toString().c_str());
// }

void connectWiFi() {
  // 1. Force Station Mode
  WiFi.mode(WIFI_STA); 
  // 2. Disconnect any old connections to start fresh
  WiFi.disconnect();
  delay(100);
  debugLog("📡 Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  // 3. Add a timeout so it doesn't loop forever if the router is down
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    debugLog("✅ WiFi Connected | IP: %s", WiFi.localIP().toString().c_str());
  } else {
    debugLog("❌ Connection Failed. Check credentials or router.");
  }
}

/* =========================================================
   MQTT MESSAGE HANDLER
   ========================================================= */
void onMQTTMessage(char *topic, byte *payload, unsigned int length) {
  payload[length] = '\0';

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload))
    return;

  String action = doc["action"];

  if (action == "reboot") {
    debugLog("🔄 Rebooting...");
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
  mqttClient.setBufferSize(2048);

  while (!mqttClient.connected()) {
    debugLog("🔄 Connecting to MQTT...");
    if (mqttClient.connect(DEVICE_UID.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      debugLog("✅ MQTT Connected");

      String cmdTopic =
          "parking/" + String(AREA_CODE) + "/" + DEVICE_UID + "/command";
      mqttClient.subscribe(cmdTopic.c_str());

      publishStatus();
    } else {
      delay(3000);
    }
  }
}

/* =========================================================
   PUBLISH STATUS
   ========================================================= */
void publishStatus() {
  StaticJsonDocument<1024> doc;

  doc["device_uid"] = DEVICE_UID;
  doc["area"] = AREA_CODE;

  String ip = WiFi.localIP().toString().c_str();
  String mac = WiFi.macAddress().c_str();
  doc["ip"] = ip;
  doc["mac"] = mac;

  JsonArray spots = doc.createNestedArray("spots");

  for (int i = 0; i < NUM_SLOTS; i++) {
    JsonObject s = spots.createNestedObject();
    s["spot"] = parkingSpots[i].code;
    s["section"] = parkingSpots[i].section;
    s["status"] = statusToStr(slotStatus[i]);
  }

  char payload[1024];
  serializeJson(doc, payload);

  String topic = "parking/" + String(AREA_CODE) + "/" + DEVICE_UID + "/status";
  mqttClient.publish(topic.c_str(), payload, true);

  debugLog("📤 Status Published");
}

/* =========================================================
   ULTRASONIC READ
   ========================================================= */
int readUltrasonic(int index) {
  const int SAMPLES = 5;
  int validReads = 0;
  int status = 2; // 0 = AVAILABLE, 1 = OCCUPIED, 2 = OFFLINE
  float totalDist = 0;

  for (int i = 0; i < SAMPLES; i++) {
    digitalWrite(trigPins[index], LOW);
    delayMicroseconds(5);
    digitalWrite(trigPins[index], HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPins[index], LOW);

    long duration = pulseIn(echoPins[index], HIGH, 40000);

    if (duration > 0) {
      float distance = (duration * 0.0343) / 2.0;
      if (distance > 2 && distance < 400) {
        totalDist += distance;
        validReads++;
        debugLog("📏 %s → %.1f cm", parkingSpots[index].code, distance);
      }
    }
    delay(60);
  }

  if (validReads == 0) {
    debugLog("📴 %s | OFFLINE", parkingSpots[index].code);
    return status;
  }

  float avg = totalDist / validReads;

  // Occupied if within range [minDist/2, maxDist]
  // This filters out very small noise (distance < minDist/2) and keeps "bumper"
  // detection
  float lowerBound = parkingSpots[index].minDist / 2.0;
  if (avg >= lowerBound && avg <= parkingSpots[index].maxDist) {
    status = 1;
  } else if (avg > parkingSpots[index].maxDist) {
    status = 0;
  } else {
    // get previous state
    status = slotStatus[index];
  }

  debugLog("📍 %s | %s | AVG %.1f cm | %d Reads | Range [%.1f - %d]",
           parkingSpots[index].code, statusToStr(status), avg, validReads,
           lowerBound, parkingSpots[index].maxDist);

  return status;
}

/* =========================================================
   SETUP
   ========================================================= */
void setup() {
  Serial.begin(115200);
  delay(1000);

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
   LOOP (WITH DEBOUNCE)
   ========================================================= */
unsigned long lastHeartbeat = 0;

void loop() {
  if (!mqttClient.connected())
    connectMQTT();
  mqttClient.loop();

  bool changed = false;

  for (int i = 0; i < NUM_SLOTS; i++) {
    int sensed = readUltrasonic(i);

    if (pendingSince[i] == 0) {
      confirmedStatus[i] = sensed;
      pendingStatus[i] = sensed;
      pendingSince[i] = millis();
      slotStatus[i] = sensed;
      continue;
    }

    if (sensed == confirmedStatus[i]) {
      pendingStatus[i] = sensed;
      pendingSince[i] = millis();
      slotStatus[i] = confirmedStatus[i];
      continue;
    }

    if (sensed != pendingStatus[i]) {
      pendingStatus[i] = sensed;
      pendingSince[i] = millis();
      debugLog("⏳ %s → Pending %s", parkingSpots[i].code, statusToStr(sensed));
    }

    if (millis() - pendingSince[i] >= DEBOUNCE_TIME) {
      confirmedStatus[i] = pendingStatus[i];
      slotStatus[i] = confirmedStatus[i];
      debugLog("✅ %s → CONFIRMED %s", parkingSpots[i].code,
               statusToStr(confirmedStatus[i]));
      changed = true;
    }
  }

  if (changed || millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    publishStatus();
    lastHeartbeat = millis();
  }
}
