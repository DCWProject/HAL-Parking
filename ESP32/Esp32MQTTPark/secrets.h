#ifndef SECRETS_H
#define SECRETS_H

/* ===============================
   DEBUG
   =============================== */
// #define DEBUG_ENABLED false

/* ===============================
   WIFI
   =============================== */
// #define WIFI_SSID "JioFiber-TcTKk"
// #define WIFI_PASSWORD "8455081525"

#define WIFI_SSID "HAL-PARKING1-IOT"
#define WIFI_PASSWORD "Hal@Parking123"

/* ===============================
   MQTT BROKER
   =============================== */
#define MQTT_BROKER "192.168.0.101"
#define MQTT_PORT 1883

#define MQTT_USERNAME "inteliParking"
#define MQTT_PASSWORD "nopassword"

/* ===============================
   LOCATION CONFIG
   =============================== */
#define AREA_CODE "EP01"

// 4 or 8 based on sensor count
#define SLOT_COUNT 4 

/* ===============================
   DEFAULT SENSOR THRESHOLDS
   =============================== */
#define DEFAULT_MIN_DIST_CM 5
#define DEFAULT_MAX_DIST_CM 250

// Define Spot Code and Section Code pairs
#define SPOTS_CONFIG                                                      \
  {                                                                       \
   {"A-16", "A", DEFAULT_MIN_DIST_CM, DEFAULT_MAX_DIST_CM},               \
   {"B-16", "B", DEFAULT_MIN_DIST_CM, DEFAULT_MAX_DIST_CM},               \
   {"B-15", "B", DEFAULT_MIN_DIST_CM, DEFAULT_MAX_DIST_CM},               \
   {"A-15", "A", DEFAULT_MIN_DIST_CM, DEFAULT_MAX_DIST_CM},               \
}
/* ===============================
   HARDWARE PINS
   =============================== */
//8 sensorbaord Config [1,2,3,4,5,6,7,8]
// #define TRIG_PINS {22, 12, 27, 16, 19, 32, 25, 5}
// #define ECHO_PINS {21, 14, 26, 4, 18, 23, 33, 17}

// 4 sensorbaord Config [1,4,5,8]
#define TRIG_PINS {22, 16, 19, 5}
#define ECHO_PINS {21, 4, 18, 17}


/* ===============================
   TIMING CONFIG
   =============================== */
// Heartbeat publish interval (milliseconds)
#define HEARTBEAT_INTERVAL 5000 // 5 seconds
// Debounce time for slot state change (milliseconds)
#define DEBOUNCE_TIME 3000 // 3 seconds

#endif
