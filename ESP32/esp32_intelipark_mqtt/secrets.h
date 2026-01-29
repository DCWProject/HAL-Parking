#ifndef SECRETS_H
#define SECRETS_H

/* ===============================
   WIFI
   =============================== */
#define WIFI_SSID     "JioFiber-TcTKk"
#define WIFI_PASSWORD "8455081525"

/* ===============================
   MQTT BROKER
   =============================== */
#define MQTT_BROKER "192.168.29.114"
#define MQTT_PORT   1883

// #define MQTT_USERNAME "esp32"
// #define MQTT_PASSWORD "password"

/* ===============================
   LOCATION CONFIG
   =============================== */
#define AREA_CODE    "BPF2"
#define SLOT_COUNT 8

// Define Spot Code and Section Code pairs
// #define SPOTS_CONFIG { \
//   {"A-01", "A"}, \
//   {"A-02", "A"}, \
//   {"A-03", "A"}, \
//   {"A-04", "A"}, \
//   {"B-01", "B"}, \
//   {"B-02", "B"}, \
//   {"B-03", "B"}, \
//   {"B-04", "B"} \
// }

#define SPOTS_CONFIG { \
  {"C-01", "C"}, \
  {"C-02", "C"}, \
  {"C-03", "C"}, \
  {"C-04", "C"}, \
  {"D-01", "D"}, \
  {"D-02", "D"}, \
  {"D-03", "D"}, \
  {"D-04", "D"} \
}

/* ===============================
   HARDWARE PINS
   =============================== */
#define TRIG_PINS {22,12,27,16,19,32,25,5}
#define ECHO_PINS {21,14,26,4,18,23,33,17}

/* ===============================
   DEFAULT SENSOR THRESHOLDS
   =============================== */
#define DEFAULT_MIN_DIST_CM 50
#define DEFAULT_MAX_DIST_CM 100

#endif
