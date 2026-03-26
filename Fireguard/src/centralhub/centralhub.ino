// ORIGINAL CODE V2.0
#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <TimeLib.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ===================== CONFIGURATION =====================
// WiFi
#define WIFI_SSID "MC_ADMIN"
#define WIFI_PASSWORD ""

// OTA Configuration
#define OTA_HOSTNAME "FireGuard-CentralHub"
#define OTA_PASSWORD "fireguard123"  // Change this to your desired OTA password

// Firebase
#define API_KEY "AIzaSyDBJ5gpJCs-N5-QT0_OfPZrPTRCu4Dv6eg"
#define DATABASE_URL "https://fireguardiot-default-rtdb.asia-southeast1.firebasedatabase.app/"

// LoRa Pins
#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 2

// LCD Configuration
#define LCD_ADDRESS 0x27
#define LCD_COLS 20
#define LCD_ROWS 4

// Button Pins (for silencing alerts - can be expanded)
#define NODE1_BUTTON_PIN 26
#define NODE2_BUTTON_PIN 32

// Hardware Pins
#define BUZZER_PIN 25
#define NODE1_LED_PIN 27
#define NODE2_LED_PIN 33

// Maximum number of nodes supported
#define MAX_NODES 10

// SIM800L
#define SIM800L_RX 16
#define SIM800L_TX 17

// Timing
#define WARNING_DELAY 5000
#define ALERT_DELAY 15000
#define SMS_COOLDOWN 60000
#define FIREBASE_COOLDOWN 1000  // Faster updates for real-time
#define TIME_SYNC_INTERVAL 3600000
#define DISPLAY_CYCLE_INTERVAL 5000  // Cycle between views every 5 seconds
#define BUTTON_DEBOUNCE_DELAY 200
#define ROOM_NAME_SYNC_INTERVAL 300000
#define PHONE_SYNC_INTERVAL 300000
#define THRESHOLD_SYNC_INTERVAL 60000
#define SILENCE_SYNC_INTERVAL 1000
#define NODE_TIMEOUT 60000
#define ALERT_QUEUE_MAX 60
#define ALERT_FLUSH_INTERVAL 5000
#define ALERT_FLUSH_BATCH_SIZE 4

// Display modes
enum DisplayMode {
  BOOT_SCREEN,
  ALL_NODES_SUMMARY,  // Show all nodes summary
  NODE_DETAILS        // Show individual node details (cycles through active nodes)
};

// NTP Settings
const char* ntpServers[] = {
  "pool.ntp.org",
  "time.nist.gov",
  "ph.pool.ntp.org"
};
const long gmtOffset_sec = 28800;
const int daylightOffset_sec = 0;

// Alert Levels
enum AlertLevel {
  NORMAL,
  WARNING,
  ALERT
};

// ===================== THRESHOLD STRUCTURE =====================
struct Thresholds {
  float temp_warning = 40.0;
  float temp_alert = 50.0;
  float humidity_warning = 80.0;
  float humidity_alert = 100.0;
  float gas_warning = 1.5;
  float gas_alert = 3.0;
  float co_warning = 1.5;
  float co_alert = 3.0;
  int flame_threshold = 1;
};

// ===================== GLOBAL VARIABLES =====================
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
HardwareSerial sim800l(1);
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);

// Dynamic phone numbers
String PHONE_NUMBERS[5];
int NUM_PHONE_NUMBERS = 0;

// Dynamic thresholds
Thresholds thresholds;
unsigned long lastThresholdSync = 0;
unsigned long lastSilenceSync = 0;

bool signupOK = false;
bool timeSynced = false;
bool bootComplete = false;
DisplayMode currentDisplayMode = BOOT_SCREEN;
unsigned long lastDisplayChange = 0;
unsigned long lastButtonPress = 0;
unsigned long lastRoomNameSync = 0;
unsigned long bootStartTime = 0;

struct NodeData {
  String nodeID;
  String roomName;
  float temperature = 0;
  float humidity = 0;
  float mq2Value = 0;
  float mq7Value = 0;
  int flameValue = 0;
  unsigned long lastUpdate = 0;
  AlertLevel alertLevel = NORMAL;
  String alertMessage = "Normal";
  String lastAlertMessage = "";
  unsigned long lastFirebaseUpdate = 0;
  bool isActive = false;  // Track if node is currently sending data
};

struct NodeAlert {
  bool buzzerSilenced = false;
  unsigned long warningStartTime = 0;
  unsigned long alertStartTime = 0;
  bool warningActive = false;
  bool alertActive = false;
  unsigned long lastSMSTime = 0;
  unsigned long lastFirebaseTime = 0;
  bool smsSent = false;
  
  unsigned long tempAlertStartTime = 0;
  unsigned long smokeAlertStartTime = 0;
  unsigned long coAlertStartTime = 0;
  unsigned long flameAlertStartTime = 0;
  bool tempAlertPending = false;
  bool smokeAlertPending = false;
  bool coAlertPending = false;
  bool flameAlertPending = false;
  
  String lastSMSAlertMessage = "";
};

// Dynamic node arrays - supports up to MAX_NODES
NodeData nodes[MAX_NODES];
NodeAlert nodeAlerts[MAX_NODES];
int numNodes = 0;  // Current number of active nodes
int currentDisplayNodeIndex = 0;  // For cycling through nodes on LCD

struct QueuedAlertRecord {
  String nodeID;
  String roomName;
  String message;
  String level;
  float temperature = 0;
  float humidity = 0;
  float mq2Value = 0;
  float mq7Value = 0;
  int flameValue = 0;
  String timestamp;
};

QueuedAlertRecord alertQueue[ALERT_QUEUE_MAX];
int alertQueueHead = 0;
int alertQueueTail = 0;
int alertQueueCount = 0;
unsigned long lastAlertFlushAttempt = 0;

// ===================== FUNCTION DECLARATIONS =====================
void syncNTPTime(bool forceSync = false);
String getFormattedDateTime();
String getFormattedTime();
void sendATCommand(String cmd, String expected, unsigned long timeout);
void sendSMS(String number, String message);
void setSMSsenderName();
void checkIncomingSMS();
void checkButtons();
void handleAlerts();
void parseReceivedData(String data);
void evaluateAlertLevel(NodeData* nodeData, NodeAlert* nodeAlert);
void sendAlertToFirebase(NodeData* nodeData, NodeAlert* nodeAlert);
void sendSMSAlert(NodeData* nodeData, NodeAlert* nodeAlert);
void sendToFirebase(NodeData* nodeData, NodeAlert* nodeAlert);
String getAlertLevelString(AlertLevel level);
bool shouldSendAlert(NodeData* nodeData, NodeAlert* nodeAlert);
void updateLCD();
void displayWelcomeScreen();
void displayNodeDataScreen(NodeData* nodeData, NodeAlert* nodeAlert, const char* nodeName);
void displayBothNodesSummary();
void displaySystemStatus();
void syncRoomNamesFromFirebase();
String getRoomDisplayName(NodeData* nodeData);
void checkNodeTimeout();
void resetNodeData(NodeData* nodeData);
void displayBootScreen();
void syncPhoneNumbersFromFirebase();
bool isValidPhoneNumber(String phone);
void sendZeroDataToFirebase(NodeData* nodeData);
void syncThresholdsFromFirebase();
void syncSilenceFromFirebase();
NodeData* findOrCreateNode(String nodeID);
int findNodeIndex(String nodeID);
void initializeNode(NodeData* nodeData, String nodeID);
bool isFirebaseOnline();
bool sendAlertRecordToFirebase(const QueuedAlertRecord& record);
void enqueueAlertRecord(const QueuedAlertRecord& record);
void flushQueuedAlerts();

// ===================== THRESHOLD SYNC FUNCTION =====================
void syncThresholdsFromFirebase() {
  if (!Firebase.ready() || !signupOK) return;
  
  unsigned long now = millis();
  if (now - lastThresholdSync < THRESHOLD_SYNC_INTERVAL && lastThresholdSync != 0) {
    return;
  }
  
  Serial.println("Syncing thresholds from Firebase...");
  
  String thresholdPath = "thresholds";
  
  if (Firebase.RTDB.getJSON(&fbdo, thresholdPath.c_str())) {
    FirebaseJson *json = fbdo.to<FirebaseJson *>();
    FirebaseJsonData data;
    
    if (json->get(data, "temperature/warning")) {
      thresholds.temp_warning = data.floatValue;
      Serial.println("Temp Warning: " + String(thresholds.temp_warning));
    }
    if (json->get(data, "temperature/alert")) {
      thresholds.temp_alert = data.floatValue;
      Serial.println("Temp Alert: " + String(thresholds.temp_alert));
    }
    
    if (json->get(data, "humidity/warning")) {
      thresholds.humidity_warning = data.floatValue;
      Serial.println("Humidity Warning: " + String(thresholds.humidity_warning));
    }
    if (json->get(data, "humidity/alert")) {
      thresholds.humidity_alert = data.floatValue;
      Serial.println("Humidity Alert: " + String(thresholds.humidity_alert));
    }
    
    if (json->get(data, "gas/warning")) {
      thresholds.gas_warning = data.floatValue;
      Serial.println("Gas Warning: " + String(thresholds.gas_warning));
    }
    if (json->get(data, "gas/alert")) {
      thresholds.gas_alert = data.floatValue;
      Serial.println("Gas Alert: " + String(thresholds.gas_alert));
    }
    
    if (json->get(data, "co/warning")) {
      thresholds.co_warning = data.floatValue;
      Serial.println("CO Warning: " + String(thresholds.co_warning));
    }
    if (json->get(data, "co/alert")) {
      thresholds.co_alert = data.floatValue;
      Serial.println("CO Alert: " + String(thresholds.co_alert));
    }
    
    if (json->get(data, "flame/threshold")) {
      thresholds.flame_threshold = data.intValue;
      Serial.println("Flame Threshold: " + String(thresholds.flame_threshold));
    }
    
    Serial.println("✓ Thresholds synced successfully");
  } else {
    Serial.println("Failed to fetch thresholds: " + fbdo.errorReason());
    Serial.println("Using default thresholds");
  }
  
  lastThresholdSync = now;
}

void syncSilenceFromFirebase() {
  if (!Firebase.ready() || !signupOK || numNodes == 0) return;

  unsigned long now = millis();
  if (now - lastSilenceSync < SILENCE_SYNC_INTERVAL && lastSilenceSync != 0) {
    return;
  }
  lastSilenceSync = now;

  for (int i = 0; i < numNodes; i++) {
    String path = "sensor_data/" + nodes[i].nodeID + "/silenced";
    if (!Firebase.RTDB.getBool(&fbdo, path.c_str())) {
      continue;
    }

    bool remoteSilenced = fbdo.boolData();
    if (nodeAlerts[i].buzzerSilenced == remoteSilenced) {
      continue;
    }

    nodeAlerts[i].buzzerSilenced = remoteSilenced;

    int ledPin = (i == 0) ? NODE1_LED_PIN : ((i == 1) ? NODE2_LED_PIN : -1);
    if (ledPin >= 0) {
      digitalWrite(ledPin, remoteSilenced ? LOW : HIGH);
    }

    Serial.println(
      "Remote silence updated for " + getRoomDisplayName(&nodes[i]) + ": " +
      String(remoteSilenced ? "Silenced" : "Active")
    );
  }
}

// ===================== PHONE NUMBER FUNCTIONS =====================
bool isValidPhoneNumber(String phone) {
  if (phone.length() < 10 || phone.charAt(0) != '+') {
    return false;
  }
  
  for (int i = 1; i < phone.length(); i++) {
    if (!isDigit(phone.charAt(i))) {
      return false;
    }
  }
  
  return true;
}

void syncPhoneNumbersFromFirebase() {
  if (!Firebase.ready() || !signupOK) return;
  
  static unsigned long lastPhoneSync = 0;
  unsigned long now = millis();
  
  if (now - lastPhoneSync < PHONE_SYNC_INTERVAL && lastPhoneSync != 0) {
    return;
  }
  
  Serial.println("Syncing phone numbers from Firebase...");
  
  NUM_PHONE_NUMBERS = 0;
  
  String phonePath = "phone_numbers";
  
  if (Firebase.RTDB.getJSON(&fbdo, phonePath.c_str())) {
    FirebaseJson *json = fbdo.to<FirebaseJson *>();
    
    size_t len = json->iteratorBegin();
    String key, path;
    int type = 0;
    
    Serial.println("Found " + String(len) + " phone entries in database");
    
    for (size_t i = 0; i < len && NUM_PHONE_NUMBERS < 5; i++) {
      json->iteratorGet(i, type, key, path);
      
      FirebaseJsonData phoneData;
      if (json->get(phoneData, key + "/number")) {
        if (phoneData.type == "string" && phoneData.stringValue.length() > 0) {
          String phone = phoneData.stringValue;
          
          FirebaseJsonData labelData;
          String label = "";
          if (json->get(labelData, key + "/label")) {
            if (labelData.type == "string") {
              label = labelData.stringValue;
            }
          }
          
          if (isValidPhoneNumber(phone)) {
            PHONE_NUMBERS[NUM_PHONE_NUMBERS] = phone;
            NUM_PHONE_NUMBERS++;
            Serial.println("Phone loaded: " + phone + " (Label: " + label + ")");
          } else {
            Serial.println("Invalid phone number format: " + phone);
          }
        }
      }
    }
    json->iteratorEnd();
    
    Serial.println("Phone numbers synced: " + String(NUM_PHONE_NUMBERS) + " numbers loaded");
    
    if (NUM_PHONE_NUMBERS == 0) {
      Serial.println("WARNING: No phone numbers configured in Firebase!");
    }
  } else {
    Serial.println("Failed to fetch phone numbers: " + fbdo.errorReason());
  }
  
  lastPhoneSync = now;
}

// ===================== NODE MANAGEMENT FUNCTIONS =====================
NodeData* findOrCreateNode(String nodeID) {
  // First, try to find existing node
  int index = findNodeIndex(nodeID);
  if (index >= 0) {
    return &nodes[index];
  }
  
  // Node doesn't exist, create new one if we have space
  if (numNodes >= MAX_NODES) {
    Serial.println("WARNING: Maximum nodes reached! Cannot add: " + nodeID);
    return nullptr;
  }
  
  // Initialize new node
  initializeNode(&nodes[numNodes], nodeID);
  numNodes++;
  Serial.println("New node registered: " + nodeID + " (Total: " + String(numNodes) + ")");
  return &nodes[numNodes - 1];
}

int findNodeIndex(String nodeID) {
  for (int i = 0; i < numNodes; i++) {
    if (nodes[i].nodeID == nodeID) {
      return i;
    }
  }
  return -1;  // Not found
}

void initializeNode(NodeData* nodeData, String nodeID) {
  nodeData->nodeID = nodeID;
  nodeData->roomName = nodeID;  // Default to nodeID, will be updated from Firebase
  nodeData->temperature = 0;
  nodeData->humidity = 0;
  nodeData->mq2Value = 0;
  nodeData->mq7Value = 0;
  nodeData->flameValue = 0;
  nodeData->lastUpdate = 0;
  nodeData->alertLevel = NORMAL;
  nodeData->alertMessage = "Normal";
  nodeData->lastAlertMessage = "";
  nodeData->lastFirebaseUpdate = 0;
  nodeData->isActive = false;
}

// ===================== ROOM NAME FUNCTIONS =====================
void syncRoomNamesFromFirebase() {
  if (!Firebase.ready() || !signupOK) return;
  
  unsigned long now = millis();
  if (now - lastRoomNameSync < ROOM_NAME_SYNC_INTERVAL && lastRoomNameSync != 0) {
    return;
  }
  
  // Sync room names for all registered nodes
  for (int i = 0; i < numNodes; i++) {
    String path = "room_names/" + nodes[i].nodeID;
    if (Firebase.RTDB.getString(&fbdo, path.c_str())) {
      if (fbdo.dataType() == "string") {
        String roomName = fbdo.stringData();
        if (roomName.length() > 0) {
          nodes[i].roomName = roomName;
          Serial.println(nodes[i].nodeID + " room name updated: " + roomName);
        }
      }
    }
  }
  
  // Also try to sync for common node naming patterns (NODE1-NODE10, NODE01-NODE10)
  // This helps discover nodes that haven't sent data yet
  for (int i = 1; i <= MAX_NODES; i++) {
    String nodeID1 = "NODE" + String(i);
    String nodeID2 = "NODE0" + String(i);
    if (i < 10) {
      nodeID2 = "NODE0" + String(i);
    } else {
      nodeID2 = "NODE" + String(i);
    }
    
    // Check both naming patterns
    String paths[] = {"room_names/" + nodeID1, "room_names/" + nodeID2};
    for (int j = 0; j < 2; j++) {
      if (Firebase.RTDB.getString(&fbdo, paths[j].c_str())) {
        if (fbdo.dataType() == "string") {
          String roomName = fbdo.stringData();
          if (roomName.length() > 0) {
            // Find or create node for this room name
            String nodeID = (j == 0) ? nodeID1 : nodeID2;
            NodeData* nodeData = findOrCreateNode(nodeID);
            if (nodeData) {
              nodeData->roomName = roomName;
            }
          }
        }
      }
    }
  }
  
  lastRoomNameSync = now;
}

String getRoomDisplayName(NodeData* nodeData) {
  if (nodeData->roomName.length() > 0) {
    return nodeData->roomName;
  }
  return nodeData->nodeID;
}

// ===================== NODE TIMEOUT FUNCTIONS =====================
void checkNodeTimeout() {
  unsigned long now = millis();
  
  // Check all nodes for timeout
  for (int i = 0; i < numNodes; i++) {
    if (nodes[i].lastUpdate > 0 && (now - nodes[i].lastUpdate > NODE_TIMEOUT)) {
      if (nodes[i].isActive) {  // Only send zero data if it was previously active
        Serial.println(nodes[i].nodeID + " timeout - resetting data and sending to Firebase");
        nodes[i].isActive = false;
        resetNodeData(&nodes[i]);
        sendZeroDataToFirebase(&nodes[i]);
      }
    }
  }
}

void resetNodeData(NodeData* nodeData) {
  nodeData->temperature = 0;
  nodeData->humidity = 0;
  nodeData->mq2Value = 0;
  nodeData->mq7Value = 0;
  nodeData->flameValue = 0;
  nodeData->alertLevel = NORMAL;
  nodeData->alertMessage = "No data";
  // Don't reset lastUpdate to 0 - keep it for timeout tracking
}

void sendZeroDataToFirebase(NodeData* nodeData) {
  if (Firebase.ready() && signupOK) {
    FirebaseJson json;
    String path = "sensor_data/" + nodeData->nodeID;
    
    json.set("temperature", 0);
    json.set("humidity", 0);
    json.set("Gas_and_Smoke", 0);
    json.set("carbon_monoxide", 0);
    json.set("flame", 0);
    json.set("timestamp", getFormattedDateTime());
    json.set("alert_level", "Normal");
    json.set("alert_message", "No data - Node timeout");
    json.set("silenced", false);
    json.set("active", false);
    
    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      Serial.println("Firebase updated with zero values for " + getRoomDisplayName(nodeData));
    } else {
      Serial.println("Firebase zero update failed: " + fbdo.errorReason());
    }
  }
}

// ===================== SETUP =====================
void setup() {
  Serial.begin(115200);
  while (!Serial);
  randomSeed(micros());

  Wire.begin();
  lcd.begin(LCD_COLS, LCD_ROWS);
  lcd.backlight();
  displayWelcomeScreen();

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(NODE1_LED_PIN, OUTPUT);
  pinMode(NODE2_LED_PIN, OUTPUT);
  pinMode(NODE1_BUTTON_PIN, INPUT_PULLUP);
  pinMode(NODE2_BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(NODE1_LED_PIN, LOW);
  digitalWrite(NODE2_LED_PIN, LOW);

  sim800l.begin(9600, SERIAL_8N1, SIM800L_RX, SIM800L_TX);
  delay(3000);

  sendATCommand("AT", "OK", 2000);
  sendATCommand("ATE0", "OK", 2000);
  sendATCommand("AT+CMGF=1", "OK", 2000);
  sendATCommand("AT+CNMI=1,2,0,0,0", "OK", 2000);
  sendATCommand("AT+CSQ", "OK", 2000);
  sendATCommand("AT+CREG?", "OK", 2000);

  lcd.setCursor(0, 1);
  lcd.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    lcd.print(".");
    delay(300);
  }
  
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());
  lcd.setCursor(0, 2);
  lcd.print("IP: ");
  lcd.print(WiFi.localIP().toString());

  // Initialize OTA
  lcd.setCursor(0, 3);
  lcd.print("Setting up OTA...  ");
  ArduinoOTA.setHostname(OTA_HOSTNAME);
  ArduinoOTA.setPassword(OTA_PASSWORD);
  ArduinoOTA.setPort(3232);  // Explicitly set OTA port (default is 3232)
  
  // OTA callbacks for LCD display
  ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH) {
      type = "sketch";
    } else { // U_SPIFFS
      type = "filesystem";
    }
    Serial.println("Start updating " + type);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA UPDATE START");
    lcd.setCursor(0, 1);
    lcd.print("Type: " + type);
    lcd.setCursor(0, 2);
    lcd.print("Progress: 0%");
    lcd.setCursor(0, 3);
    lcd.print("Please wait...");
  });
  
  ArduinoOTA.onEnd([]() {
    Serial.println("\nEnd");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA UPDATE");
    lcd.setCursor(0, 1);
    lcd.print("COMPLETE!");
    lcd.setCursor(0, 2);
    lcd.print("Rebooting...");
    lcd.setCursor(0, 3);
    lcd.print("Please wait");
  });
  
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    int percent = (progress / (total / 100));
    Serial.printf("Progress: %u%%\r", percent);
    lcd.setCursor(0, 2);
    lcd.print("Progress: " + String(percent) + "%");
    lcd.setCursor(0, 3);
    // Create a progress bar
    int barLength = (percent * 20) / 100;
    String bar = "";
    for (int i = 0; i < barLength; i++) {
      bar += "=";
    }
    lcd.print(bar);
    for (int i = bar.length(); i < 20; i++) {
      lcd.print(" ");
    }
  });
  
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA ERROR!");
    lcd.setCursor(0, 1);
    if (error == OTA_AUTH_ERROR) {
      Serial.println("Auth Failed");
      lcd.print("Auth Failed");
    } else if (error == OTA_BEGIN_ERROR) {
      Serial.println("Begin Failed");
      lcd.print("Begin Failed");
    } else if (error == OTA_CONNECT_ERROR) {
      Serial.println("Connect Failed");
      lcd.print("Connect Failed");
    } else if (error == OTA_RECEIVE_ERROR) {
      Serial.println("Receive Failed");
      lcd.print("Receive Failed");
    } else if (error == OTA_END_ERROR) {
      Serial.println("End Failed");
      lcd.print("End Failed");
    }
    lcd.setCursor(0, 2);
    lcd.print("Check Serial");
    lcd.setCursor(0, 3);
    lcd.print("for details");
  });
  
  ArduinoOTA.begin();
  Serial.println("OTA Ready");
  Serial.println("Hostname: " + String(OTA_HOSTNAME));
  Serial.println("IP address: " + WiFi.localIP().toString());
  lcd.setCursor(0, 3);
  lcd.print("OTA Ready        ");

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  lcd.setCursor(0, 3);
  lcd.print("Initializing Firebase");
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase: OK");
    lcd.setCursor(0, 3);
    lcd.print("Firebase: OK        ");
    signupOK = true;
  } else {
    Serial.println("Firebase: Failed - " + String(config.signer.signupError.message.c_str()));
    lcd.setCursor(0, 3);
    lcd.print("Firebase: Failed    ");
  }
  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  lcd.setCursor(0, 3);
  lcd.print("Initializing LoRa   ");
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa init failed!");
    lcd.setCursor(0, 3);
    lcd.print("LoRa init failed!   ");
    while (1);
  }
  LoRa.setSignalBandwidth(62.5E3);
  LoRa.setSpreadingFactor(12);
  LoRa.setCodingRate4(8);
  LoRa.setPreambleLength(12);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();
  LoRa.setTxPower(20, PA_OUTPUT_PA_BOOST_PIN);
  Serial.println("LoRa initialized!");
  lcd.setCursor(0, 3);
  lcd.print("LoRa initialized!   ");

  syncNTPTime(true);
  
  delay(1000);
  syncRoomNamesFromFirebase();
  
  delay(1000);
  syncPhoneNumbersFromFirebase();
  
  delay(1000);
  syncThresholdsFromFirebase();
  
  bootStartTime = millis();
  currentDisplayMode = BOOT_SCREEN;
  bootComplete = false;
  
  // Initialize node alerts array
  for (int i = 0; i < MAX_NODES; i++) {
    nodeAlerts[i].buzzerSilenced = false;
    nodeAlerts[i].warningStartTime = 0;
    nodeAlerts[i].alertStartTime = 0;
    nodeAlerts[i].warningActive = false;
    nodeAlerts[i].alertActive = false;
    nodeAlerts[i].lastSMSTime = 0;
    nodeAlerts[i].lastFirebaseTime = 0;
    nodeAlerts[i].smsSent = false;
    nodeAlerts[i].tempAlertStartTime = 0;
    nodeAlerts[i].smokeAlertStartTime = 0;
    nodeAlerts[i].coAlertStartTime = 0;
    nodeAlerts[i].flameAlertStartTime = 0;
    nodeAlerts[i].tempAlertPending = false;
    nodeAlerts[i].smokeAlertPending = false;
    nodeAlerts[i].coAlertPending = false;
    nodeAlerts[i].flameAlertPending = false;
    nodeAlerts[i].lastSMSAlertMessage = "";
  }
  
  numNodes = 0;  // Start with no nodes registered
  currentDisplayNodeIndex = 0;
  
  delay(2000);
}

// ===================== TIME FUNCTIONS =====================
void syncNTPTime(bool forceSync) {
  static unsigned long lastSync = 0;
  static uint8_t currentServer = 0;
  
  if (forceSync || millis() - lastSync >= TIME_SYNC_INTERVAL) {
    Serial.print("Syncing time with ");
    Serial.println(ntpServers[currentServer]);
    
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServers[currentServer]);
    
    Serial.print("Waiting for sync");
    time_t now = 0;
    for (int i = 0; i < 10; i++) {
      now = time(nullptr);
      if (now > 86400) break;
      delay(1000);
      Serial.print(".");
    }
    
    if (now > 86400) {
      timeSynced = true;
      Serial.println(" Success: " + getFormattedDateTime());
    } else {
      Serial.println(" Failed!");
      currentServer = (currentServer + 1) % (sizeof(ntpServers)/sizeof(ntpServers[0]));
    }
    lastSync = millis();
  }
}

String getFormattedDateTime() {
  time_t now = time(nullptr);
  if (now < 86400) {
    syncNTPTime(true);
    now = time(nullptr);
    if (now < 86400) return "1970-01-01 00:00:00";
  }

  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  char buffer[80];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buffer);
}

String getFormattedTime() {
  time_t now = time(nullptr);
  if (now < 86400) {
    syncNTPTime(true);
    now = time(nullptr);
    if (now < 86400) return "00:00:00";
  }

  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  char buffer[20];
  strftime(buffer, sizeof(buffer), "%H:%M:%S", &timeinfo);
  return String(buffer);
}

// ===================== LCD FUNCTIONS =====================
void displayBootScreen() {
  unsigned long now = millis();
  unsigned long elapsed = now - bootStartTime;
  
  if (elapsed < 3000) {
    lcd.setCursor(0, 0);
    lcd.print("   FIREGUARD IOT   ");
    lcd.setCursor(0, 1);
    lcd.print("  Fire Detection   ");
    lcd.setCursor(0, 2);
    lcd.print("       &           ");
    lcd.setCursor(0, 3);
    lcd.print(" Monitoring System ");
  }
  else if (elapsed < 8000) {
    static bool statusScreenCleared = false;
    if (!statusScreenCleared) {
      lcd.clear();
      statusScreenCleared = true;
    }
    
    lcd.setCursor(0, 0);
    lcd.print("  System Status    ");
    lcd.setCursor(0, 1);
    
    if (WiFi.status() == WL_CONNECTED) {
      lcd.print("WiFi: Connected     ");
    } else {
      lcd.print("WiFi: Connecting... ");
    }
    
    lcd.setCursor(0, 2);
    if (Firebase.ready() && signupOK) {
      lcd.print("Firebase: Connected ");
    } else {
      lcd.print("Firebase: Connecting");
    }
    
    lcd.setCursor(0, 3);
    lcd.print("LoRa: Ready         ");
  }
  else {
    bootComplete = true;
    currentDisplayMode = ALL_NODES_SUMMARY;  // Start with summary view
    lastDisplayChange = now;
    lcd.clear();
  }
}

void displayWelcomeScreen() {
  lcd.setCursor(0, 0);
  lcd.print("   FIREGUARD IOT   ");
  lcd.setCursor(0, 1);
  lcd.print(" Fire Detection &  ");
  lcd.setCursor(0, 2);
  lcd.print("Monitoring System  ");
  lcd.setCursor(0, 3);
  lcd.print("  Initializing...  ");
}

// Display all nodes summary on one screen (formatted like the image)
void displayBothNodesSummary() {
  unsigned long now = millis();
  
  // Count active nodes
  int activeCount = 0;
  for (int i = 0; i < numNodes; i++) {
    if (nodes[i].isActive && (now - nodes[i].lastUpdate <= NODE_TIMEOUT)) {
      activeCount++;
    }
  }
  
  // If no nodes registered yet
  if (numNodes == 0) {
    lcd.setCursor(0, 0);
    lcd.print("NODES: 0");
    lcd.setCursor(12, 0);
    lcd.print("---");
    lcd.setCursor(0, 1);
    lcd.print("STATUS: WAITING");
    lcd.setCursor(12, 1);
    lcd.print("-NORMAL-");
    lcd.setCursor(0, 2);
    lcd.print("                    ");
    lcd.setCursor(0, 3);
    lcd.print("INFO: NO_NODES!");
    return;
  }
  
  // Find first active node for display
  int firstActiveIndex = -1;
  for (int i = 0; i < numNodes; i++) {
    if (nodes[i].isActive && (now - nodes[i].lastUpdate <= NODE_TIMEOUT)) {
      firstActiveIndex = i;
      break;
    }
  }
  
  // If no active nodes, show first registered node
  if (firstActiveIndex < 0 && numNodes > 0) {
    firstActiveIndex = 0;
  }
  
  if (firstActiveIndex >= 0) {
    NodeData* node = &nodes[firstActiveIndex];
    bool nodeActive = node->isActive && (now - node->lastUpdate <= NODE_TIMEOUT);
    
    // Line 1: Node name on left, Temperature on right
    lcd.setCursor(0, 0);
    String room = getRoomDisplayName(node);
    if (room.length() > 8) room = room.substring(0, 8);
    lcd.print(room);
    lcd.print(": ");
    if (nodeActive) {
      char humStr[4];
      dtostrf(node->humidity, 3, 0, humStr);
      lcd.print(humStr);
      lcd.print("%");
    } else {
      lcd.print("OFF");
    }
    
    // Right side: Temperature value (prominent display)
    lcd.setCursor(12, 0);
    if (nodeActive) {
      char tempStr[7];
      dtostrf(node->temperature, 5, 1, tempStr);
      lcd.print(tempStr);
      lcd.print("C");
    } else {
      lcd.print("--- C");
    }
    
    // Line 2: Active count on left, Status on right
    lcd.setCursor(0, 1);
    lcd.print("ACTIVE: ");
    lcd.print(activeCount);
    lcd.print("/");
    lcd.print(numNodes);
    
    // Right side: Overall status
    lcd.setCursor(12, 1);
    if (activeCount == 0) {
      lcd.print("-OFFLINE-");
    } else {
      // Check if any node has alert
      bool hasAlert = false;
      bool hasWarning = false;
      for (int i = 0; i < numNodes; i++) {
        if (nodes[i].isActive && (now - nodes[i].lastUpdate <= NODE_TIMEOUT)) {
          if (nodes[i].alertLevel == ALERT) {
            hasAlert = true;
            break;
          } else if (nodes[i].alertLevel == WARNING) {
            hasWarning = true;
          }
        }
      }
      if (hasAlert) {
        lcd.print("-ALERT-");
      } else if (hasWarning) {
        lcd.print("-WARNING-");
      } else {
        lcd.print("-NORMAL-");
      }
    }
    
    // Line 3: Total nodes info
    lcd.setCursor(0, 2);
    lcd.print("TOTAL: ");
    lcd.print(numNodes);
    lcd.print(" NODES");
    
    // Line 4: Info message
    lcd.setCursor(0, 3);
    lcd.print("INFO: ");
    if (activeCount == 0) {
      lcd.print("ALL_OFFLINE!");
    } else if (activeCount == numNodes) {
      lcd.print("ALL_ACTIVE!");
    } else {
      lcd.print("SOME_ACTIVE!");
    }
  }
}

void updateLCD() {
  static unsigned long lastChange = 0;
  unsigned long now = millis();
  
  if (!bootComplete) {
    displayBootScreen();
    return;
  }
  
  // Auto-cycle between views every 3 seconds
  if (now - lastChange >= DISPLAY_CYCLE_INTERVAL) {
    if (currentDisplayMode == ALL_NODES_SUMMARY) {
      // Switch to node details view
      currentDisplayMode = NODE_DETAILS;
      // Find first active node to display
      currentDisplayNodeIndex = 0;
      for (int i = 0; i < numNodes; i++) {
        if (nodes[i].isActive && (now - nodes[i].lastUpdate <= NODE_TIMEOUT)) {
          currentDisplayNodeIndex = i;
          break;
        }
      }
    } else if (currentDisplayMode == NODE_DETAILS) {
      // Cycle to next active node
      bool foundNext = false;
      int startIndex = currentDisplayNodeIndex;
      for (int i = 0; i < numNodes; i++) {
        currentDisplayNodeIndex = (currentDisplayNodeIndex + 1) % numNodes;
        if (nodes[currentDisplayNodeIndex].isActive && 
            (now - nodes[currentDisplayNodeIndex].lastUpdate <= NODE_TIMEOUT)) {
          foundNext = true;
          break;
        }
      }
      
      // If no more active nodes, go back to summary
      if (!foundNext || currentDisplayNodeIndex == startIndex) {
        currentDisplayMode = ALL_NODES_SUMMARY;
      }
    } else {
      currentDisplayMode = ALL_NODES_SUMMARY;
    }
    lastChange = now;
    lcd.clear();
  }

  if (currentDisplayMode == ALL_NODES_SUMMARY) {
    displayBothNodesSummary();
  } else if (currentDisplayMode == NODE_DETAILS && currentDisplayNodeIndex < numNodes) {
    int nodeIndex = currentDisplayNodeIndex;
    displayNodeDataScreen(&nodes[nodeIndex], &nodeAlerts[nodeIndex], 
                         getRoomDisplayName(&nodes[nodeIndex]).c_str());
  }
}

void displayNodeDataScreen(NodeData* nodeData, NodeAlert* nodeAlert, const char* nodeName) {
  unsigned long now = millis();
  bool hasData = nodeData->isActive && (now - nodeData->lastUpdate <= NODE_TIMEOUT);
  
  // Line 1: Node name/ID on left with humidity, Temperature on right (similar to "TANK: 69%" and "229 V")
  lcd.setCursor(0, 0);
  String displayName = String(nodeName);
  if (displayName.length() > 6) displayName = displayName.substring(0, 6);
  lcd.print(displayName);
  lcd.print(": ");
  if (hasData) {
    char humStr[4];
    dtostrf(nodeData->humidity, 3, 0, humStr);
    lcd.print(humStr);
    lcd.print("%");
  } else {
    lcd.print("OFF");
  }
  
  // Right side: Temperature value (prominent display)
  lcd.setCursor(12, 0);
  if (hasData) {
    char tempStr[7];
    dtostrf(nodeData->temperature, 5, 1, tempStr);
    lcd.print(tempStr);
    lcd.print("C");
  } else {
    lcd.print("--- C");
  }
  
  // Line 2: Humidity on left, Status on right (similar to "SUMP: 70%" and "-NORMAL-")
  lcd.setCursor(0, 1);
  lcd.print("HUMID: ");
  if (hasData) {
    char humStr[4];
    dtostrf(nodeData->humidity, 3, 0, humStr);
    lcd.print(humStr);
    lcd.print("%");
  } else {
    lcd.print("--%");
  }
  
  // Right side: Status indicator
  lcd.setCursor(12, 1);
  if (!hasData) {
    lcd.print("-OFFLINE-");
  } else {
    String statusStr = getAlertLevelString(nodeData->alertLevel);
    if (statusStr == "Normal") {
      lcd.print("-NORMAL-");
    } else if (statusStr == "Warning") {
      lcd.print("-WARNING-");
    } else {
      lcd.print("-ALERT-");
    }
  }
  
  // Line 3: Gas/Smoke on left (similar to "PUMP: OFF")
  lcd.setCursor(0, 2);
  lcd.print("GAS: ");
  if (hasData) {
    char gasStr[6];
    dtostrf(nodeData->mq2Value, 4, 2, gasStr);
    lcd.print(gasStr);
  } else {
    lcd.print("-.--");
  }
  lcd.print("  CO: ");
  if (hasData) {
    char coStr[5];
    dtostrf(nodeData->mq7Value, 4, 2, coStr);
    lcd.print(coStr);
  } else {
    lcd.print("-.--");
  }
  
  // Line 4: Info/Status message (similar to "INFO: SYSTEM_STANDBY!")
  lcd.setCursor(0, 3);
  lcd.print("INFO: ");
  if (!hasData) {
    lcd.print("NODE_OFFLINE!");
  } else {
    String infoMsg = nodeData->alertMessage;
    // Remove emojis and truncate if needed
    infoMsg.replace("🔥", "");
    infoMsg.replace("🚨", "");
    infoMsg.replace("⚠️", "");
    infoMsg.replace("ℹ️", "");
    if (infoMsg.length() > 14) {
      infoMsg = infoMsg.substring(0, 14);
    }
    lcd.print(infoMsg);
    // Fill remaining space
    for (int i = infoMsg.length(); i < 14; i++) {
      lcd.print(" ");
    }
  }
}

// ===================== SIM800L FUNCTIONS =====================
void setSMSsenderName() {
  sendATCommand("AT+CPBS=\"ON\"", "OK", 2000);
  if (NUM_PHONE_NUMBERS > 0) {
    sendATCommand("AT+CPBW=1,\"" + PHONE_NUMBERS[0] + "\",129,\"FireGuard\"", "OK", 2000);
  }
  sendATCommand("AT+CPBS=\"SM\"", "OK", 2000);
}

void sendATCommand(String cmd, String expected, unsigned long timeout) {
  Serial.println("AT CMD: " + cmd);
  sim800l.println(cmd);
  
  unsigned long start = millis();
  String response;
  bool found = false;
  
  while (millis() - start < timeout) {
    while (sim800l.available()) {
      char c = sim800l.read();
      response += c;
      Serial.write(c);
      
      if (response.indexOf(expected) != -1) {
        found = true;
        break;
      }
    }
    if (found) break;
  }
  
  if (!found) {
    Serial.println("Timeout waiting for: " + expected);
  }
}

void sendSMS(String number, String message) {
  Serial.println("\n=== SENDING SMS ===");
  Serial.println("To: " + number);
  Serial.println("Message Preview: " + message.substring(0, 50) + "...");
  
  message = "[FireGuard] " + message;
  
  sim800l.print("AT+CMGS=\"");
  sim800l.print(number);
  sim800l.println("\"");
  delay(500);
  
  unsigned long timeout = millis();
  bool promptReceived = false;
  while (millis() - timeout < 3000) {
    if (sim800l.available()) {
      String response = sim800l.readString();
      Serial.print("SIM Response: " + response);
      if (response.indexOf(">") != -1) {
        promptReceived = true;
        break;
      }
    }
  }
  
  if (!promptReceived) {
    Serial.println("ERROR: No prompt received from SIM800L!");
    return;
  }
  
  sim800l.print(message);
  sim800l.write(26);
  delay(2000);
  
  timeout = millis();
  while (millis() - timeout < 5000) {
    if (sim800l.available()) {
      String response = sim800l.readString();
      Serial.print("Send Response: " + response);
      if (response.indexOf("OK") != -1 || response.indexOf("+CMGS") != -1) {
        Serial.println("✓ SMS sent successfully to " + number);
        return;
      }
      if (response.indexOf("ERROR") != -1) {
        Serial.println("✗ SMS send failed!");
        return;
      }
    }
  }
  
  Serial.println("SMS status unknown (timeout)");
}

void checkIncomingSMS() {
  if (sim800l.available()) {
    String response = sim800l.readString();
    Serial.println("SIM800L: " + response);
    
    if (response.indexOf("+CMT:") != -1) {
      Serial.println("New SMS received!");
    }
  }
}

// ===================== BUTTON FUNCTIONS =====================
void checkButtons() {
  static unsigned long lastSilencePress = 0;
  unsigned long now = millis();
  
  // Button 1 - silence first active node or NODE1
  if (digitalRead(NODE1_BUTTON_PIN) == LOW && now - lastSilencePress > BUTTON_DEBOUNCE_DELAY) {
    int nodeIndex = findNodeIndex("NODE1");
    if (nodeIndex < 0 && numNodes > 0) {
      nodeIndex = 0;  // Use first node if NODE1 not found
    }
    if (nodeIndex >= 0) {
      nodeAlerts[nodeIndex].buzzerSilenced = !nodeAlerts[nodeIndex].buzzerSilenced;
      digitalWrite(NODE1_LED_PIN, nodeAlerts[nodeIndex].buzzerSilenced ? LOW : HIGH);
      lastSilencePress = now;
      Serial.println(nodes[nodeIndex].nodeID + " " + 
                     String(nodeAlerts[nodeIndex].buzzerSilenced ? "Silenced" : "Active"));
      sendToFirebase(&nodes[nodeIndex], &nodeAlerts[nodeIndex]);
    }
  }
  
  // Button 2 - silence second active node or NODE2
  if (digitalRead(NODE2_BUTTON_PIN) == LOW && now - lastSilencePress > BUTTON_DEBOUNCE_DELAY) {
    int nodeIndex = findNodeIndex("NODE2");
    if (nodeIndex < 0 && numNodes > 1) {
      nodeIndex = 1;  // Use second node if NODE2 not found
    }
    if (nodeIndex >= 0) {
      nodeAlerts[nodeIndex].buzzerSilenced = !nodeAlerts[nodeIndex].buzzerSilenced;
      digitalWrite(NODE2_LED_PIN, nodeAlerts[nodeIndex].buzzerSilenced ? LOW : HIGH);
      lastSilencePress = now;
      Serial.println(nodes[nodeIndex].nodeID + " " + 
                     String(nodeAlerts[nodeIndex].buzzerSilenced ? "Silenced" : "Active"));
      sendToFirebase(&nodes[nodeIndex], &nodeAlerts[nodeIndex]);
    }
  }
}

// ===================== ALERT FUNCTIONS =====================
String getAlertLevelString(AlertLevel level) {
  switch(level) {
    case NORMAL: return "Normal";
    case WARNING: return "Warning";
    case ALERT: return "Alert";
    default: return "Unknown";
  }
}

bool isFirebaseOnline() {
  return signupOK && WiFi.status() == WL_CONNECTED && Firebase.ready();
}

bool sendAlertRecordToFirebase(const QueuedAlertRecord& record) {
  if (!isFirebaseOnline()) {
    return false;
  }

  FirebaseJson json;
  String path = "alerts/" + String(millis()) + "_" + String(random(1000, 9999));

  json.set("node", record.nodeID);
  json.set("room", record.roomName);
  json.set("message", record.message);
  json.set("level", record.level);
  json.set("temperature", record.temperature);
  json.set("humidity", record.humidity);
  json.set("Gas_and_Smoke", record.mq2Value);
  json.set("carbon_monoxide", record.mq7Value);
  json.set("flame", record.flameValue);
  json.set("timestamp", record.timestamp);

  return Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json);
}

void enqueueAlertRecord(const QueuedAlertRecord& record) {
  if (alertQueueCount >= ALERT_QUEUE_MAX) {
    alertQueueHead = (alertQueueHead + 1) % ALERT_QUEUE_MAX;
    alertQueueCount--;
    Serial.println("⚠ Alert queue full. Dropping oldest queued alert.");
  }

  alertQueue[alertQueueTail] = record;
  alertQueueTail = (alertQueueTail + 1) % ALERT_QUEUE_MAX;
  alertQueueCount++;

  Serial.println("Queued alert. Pending queued alerts: " + String(alertQueueCount));
}

void flushQueuedAlerts() {
  if (alertQueueCount == 0) {
    return;
  }

  unsigned long now = millis();
  if (now - lastAlertFlushAttempt < ALERT_FLUSH_INTERVAL) {
    return;
  }
  lastAlertFlushAttempt = now;

  if (!isFirebaseOnline()) {
    return;
  }

  int flushed = 0;
  while (alertQueueCount > 0 && flushed < ALERT_FLUSH_BATCH_SIZE) {
    const QueuedAlertRecord& queued = alertQueue[alertQueueHead];

    if (sendAlertRecordToFirebase(queued)) {
      alertQueueHead = (alertQueueHead + 1) % ALERT_QUEUE_MAX;
      alertQueueCount--;
      flushed++;
    } else {
      Serial.println("✗ Failed to flush queued alert: " + fbdo.errorReason());
      break;
    }
  }

  if (flushed > 0) {
    Serial.println("✓ Flushed " + String(flushed) + " queued alert(s). Remaining: " + String(alertQueueCount));
  }
}

void handleAlerts() {
  unsigned long now = millis();
  bool anyAlert = false;
  
  // Handle alerts for all nodes
  for (int i = 0; i < numNodes; i++) {
    int ledPin = (i == 0) ? NODE1_LED_PIN : ((i == 1) ? NODE2_LED_PIN : -1);
    
    if (nodes[i].alertLevel == WARNING && !nodeAlerts[i].buzzerSilenced) {
      anyAlert = true;
      if (now % 1000 < 500) {
        tone(BUZZER_PIN, 800 + (i * 100), 100);
        if (ledPin >= 0) digitalWrite(ledPin, HIGH);
      } else {
        if (ledPin >= 0) digitalWrite(ledPin, LOW);
      }
    } 
    else if (nodes[i].alertLevel == ALERT && !nodeAlerts[i].buzzerSilenced) {
      anyAlert = true;
      if (now % 500 < 250) {
        tone(BUZZER_PIN, 1000 + (i * 100), 100);
        if (ledPin >= 0) digitalWrite(ledPin, HIGH);
      } else {
        if (ledPin >= 0) digitalWrite(ledPin, LOW);
      }
    }
    else {
      if (ledPin >= 0) digitalWrite(ledPin, LOW);
    }
  }

  // Stop buzzer if no alerts
  if (!anyAlert) {
    noTone(BUZZER_PIN);
  }
}

void parseReceivedData(String data) {
  int commas[5];
  commas[0] = data.indexOf(',');
  if (commas[0] == -1) return;
  
  for (int i = 1; i < 5; i++) {
    commas[i] = data.indexOf(',', commas[i-1]+1);
    if (commas[i] == -1) return;
  }

  String receivedNodeID = data.substring(0, commas[0]);
  float receivedTemp = data.substring(commas[0]+1, commas[1]).toFloat();
  float receivedHumidity = data.substring(commas[1]+1, commas[2]).toFloat();
  float receivedMQ2 = data.substring(commas[2]+1, commas[3]).toFloat();
  float receivedMQ7 = data.substring(commas[3]+1, commas[4]).toFloat();
  int receivedFlame = data.substring(commas[4]+1).toInt();

  // Normalize node ID (handle NODE01 vs NODE1, NODE02 vs NODE2, etc.)
  String normalizedNodeID = receivedNodeID;
  if (receivedNodeID.startsWith("NODE0")) {
    // Convert NODE01, NODE02, etc. to NODE1, NODE2, etc.
    String numStr = receivedNodeID.substring(5);
    normalizedNodeID = "NODE" + numStr;
  }

  // Find or create node dynamically
  NodeData* nodeData = findOrCreateNode(normalizedNodeID);
  if (nodeData == nullptr) {
    Serial.println("ERROR: Cannot create node: " + normalizedNodeID);
    return;
  }
  
  int nodeIndex = findNodeIndex(normalizedNodeID);
  if (nodeIndex < 0) {
    Serial.println("ERROR: Node index not found: " + normalizedNodeID);
    return;
  }
  NodeAlert* nodeAlert = &nodeAlerts[nodeIndex];

  // Update node data
  nodeData->nodeID = normalizedNodeID;
  nodeData->temperature = receivedTemp;
  nodeData->humidity = receivedHumidity;
  nodeData->mq2Value = receivedMQ2;
  nodeData->mq7Value = receivedMQ7;
  nodeData->flameValue = receivedFlame;
  nodeData->lastUpdate = millis();
  nodeData->isActive = true;  // Mark node as active

  Serial.println("\n=== " + getRoomDisplayName(nodeData) + " DATA RECEIVED ===");
  Serial.println("Temperature: " + String(nodeData->temperature) + "°C");
  Serial.println("Humidity: " + String(nodeData->humidity) + "%");
  Serial.println("Gas and Smoke (MQ2): " + String(nodeData->mq2Value, 2) + " ratio");
  Serial.println("CO (MQ7): " + String(nodeData->mq7Value, 2) + " ratio");
  Serial.println("Flame: " + String(nodeData->flameValue ? "DETECTED" : "None"));

  evaluateAlertLevel(nodeData, nodeAlert);
  sendToFirebase(nodeData, nodeAlert);
}

void evaluateAlertLevel(NodeData* nodeData, NodeAlert* nodeAlert) {
  unsigned long now = millis();
  AlertLevel newLevel = NORMAL;
  String alertMsg = "Normal conditions";

  // Check against dynamic thresholds
  bool flameDetected = (nodeData->flameValue >= thresholds.flame_threshold);
  bool tempWarning = (nodeData->temperature > thresholds.temp_warning);
  bool tempAlert = (nodeData->temperature > thresholds.temp_alert);
  bool humidityWarning = (nodeData->humidity > thresholds.humidity_warning);
  bool humidityAlert = (nodeData->humidity > thresholds.humidity_alert);
  bool gasWarning = (nodeData->mq2Value > thresholds.gas_warning);
  bool gasAlert = (nodeData->mq2Value > thresholds.gas_alert);
  bool coWarning = (nodeData->mq7Value > thresholds.co_warning);
  bool coAlert = (nodeData->mq7Value > thresholds.co_alert);

  // Temperature alert timing
  if (tempWarning && !nodeAlert->tempAlertPending) {
    nodeAlert->tempAlertStartTime = now;
    nodeAlert->tempAlertPending = true;
  } else if (tempWarning && now - nodeAlert->tempAlertStartTime >= ALERT_DELAY) {
    tempAlert = true;
  } else if (!tempWarning) {
    nodeAlert->tempAlertPending = false;
  }

  // Gas alert timing
  if (gasWarning && !nodeAlert->smokeAlertPending) {
    nodeAlert->smokeAlertStartTime = now;
    nodeAlert->smokeAlertPending = true;
  } else if (gasWarning && now - nodeAlert->smokeAlertStartTime >= ALERT_DELAY) {
    gasAlert = true;
  } else if (!gasWarning) {
    nodeAlert->smokeAlertPending = false;
  }

  // CO alert timing
  if (coWarning && !nodeAlert->coAlertPending) {
    nodeAlert->coAlertStartTime = now;
    nodeAlert->coAlertPending = true;
  } else if (coWarning && now - nodeAlert->coAlertStartTime >= ALERT_DELAY) {
    coAlert = true;
  } else if (!coWarning) {
    nodeAlert->coAlertPending = false;
  }

  if (flameDetected) {
    nodeAlert->flameAlertStartTime = now;
  }

  // Determine alert level and message
  if (flameDetected) {
    newLevel = ALERT;
    alertMsg = "🔥 FLAME DETECTED!";
  }
  else if (tempAlert || gasAlert || coAlert || humidityAlert) {
    newLevel = ALERT;
    alertMsg = "🚨 ALERT: ";
    if (tempAlert) alertMsg += "High temp(" + String(nodeData->temperature, 1) + "°C) ";
    if (gasAlert) alertMsg += "High Gas(" + String(nodeData->mq2Value, 2) + ") ";
    if (coAlert) alertMsg += "High CO(" + String(nodeData->mq7Value, 2) + ") ";
    if (humidityAlert) alertMsg += "High humidity(" + String(nodeData->humidity, 0) + "%) ";
  }
  else if (tempWarning || gasWarning || coWarning || humidityWarning) {
    newLevel = WARNING;
    alertMsg = "⚠️ Warning: ";
    if (tempWarning) alertMsg += "Elevated temp(" + String(nodeData->temperature, 1) + "°C) ";
    if (gasWarning) alertMsg += "Gas detected(" + String(nodeData->mq2Value, 2) + ") ";
    if (coWarning) alertMsg += "CO detected(" + String(nodeData->mq7Value, 2) + ") ";
    if (humidityWarning) alertMsg += "High humidity(" + String(nodeData->humidity, 0) + "%) ";
  }

  AlertLevel previousLevel = nodeData->alertLevel;
  nodeData->alertLevel = newLevel;
  nodeData->alertMessage = alertMsg;

  // Handle level changes
  if (newLevel != previousLevel) {
    Serial.println("⚡ Alert level changed from " + getAlertLevelString(previousLevel) + 
                  " to " + getAlertLevelString(newLevel));
    
    if (newLevel == WARNING) {
      nodeAlert->warningStartTime = now;
      nodeAlert->warningActive = true;
      nodeAlert->smsSent = false;
    }
    else if (newLevel == ALERT) {
      nodeAlert->alertStartTime = now;
      nodeAlert->alertActive = true;
      nodeAlert->smsSent = false;
    }
    else if (newLevel == NORMAL) {
      nodeAlert->warningActive = false;
      nodeAlert->alertActive = false;
      nodeAlert->smsSent = false;
      nodeAlert->lastSMSAlertMessage = "";
    }
    
    // Send alerts for WARNING and ALERT
    if (newLevel != NORMAL) {
      sendAlertToFirebase(nodeData, nodeAlert);
      
      // Send SMS only if message changed or cooldown passed
      if (nodeAlert->lastSMSAlertMessage != alertMsg || 
          (now - nodeAlert->lastSMSTime > SMS_COOLDOWN)) {
        Serial.println("📱 Sending SMS alert for " + getRoomDisplayName(nodeData));
        sendSMSAlert(nodeData, nodeAlert);
        nodeAlert->smsSent = true;
        nodeAlert->lastSMSTime = now;
        nodeAlert->lastSMSAlertMessage = alertMsg;
      }
    }
  }

  // Warning escalation to Alert after delay
  if (nodeData->alertLevel == WARNING && nodeAlert->warningActive) {
    if (now - nodeAlert->warningStartTime >= WARNING_DELAY) {
      if (tempWarning || gasWarning || coWarning || humidityWarning) {
        nodeData->alertLevel = ALERT;
        nodeData->alertMessage = "🚨 Escalated Alert: " + alertMsg;
        nodeAlert->alertStartTime = now;
        nodeAlert->alertActive = true;
        nodeAlert->warningActive = false;
        nodeAlert->smsSent = false;
        
        Serial.println("⚡ Warning escalated to Alert after " + String(WARNING_DELAY/1000) + "s delay");
        sendAlertToFirebase(nodeData, nodeAlert);
        
        if (nodeAlert->lastSMSAlertMessage != nodeData->alertMessage &&
            now - nodeAlert->lastSMSTime > SMS_COOLDOWN) {
          Serial.println("📱 Sending SMS for escalated alert: " + getRoomDisplayName(nodeData));
          sendSMSAlert(nodeData, nodeAlert);
          nodeAlert->smsSent = true;
          nodeAlert->lastSMSTime = now;
          nodeAlert->lastSMSAlertMessage = nodeData->alertMessage;
        }
      }
    }
  }

  Serial.println("Status: " + alertMsg);
  Serial.println("Level: " + getAlertLevelString(nodeData->alertLevel));
}

void sendAlertToFirebase(NodeData* nodeData, NodeAlert* nodeAlert) {
  (void)nodeAlert;

  QueuedAlertRecord record;
  record.nodeID = nodeData->nodeID;
  record.roomName = getRoomDisplayName(nodeData);
  record.message = nodeData->alertMessage;
  record.level = getAlertLevelString(nodeData->alertLevel);
  record.temperature = nodeData->temperature;
  record.humidity = nodeData->humidity;
  record.mq2Value = nodeData->mq2Value;
  record.mq7Value = nodeData->mq7Value;
  record.flameValue = nodeData->flameValue;
  record.timestamp = getFormattedDateTime();

  if (sendAlertRecordToFirebase(record)) {
    Serial.println("✓ Firebase alert logged: " + nodeData->alertMessage);
    return;
  }

  if (isFirebaseOnline()) {
    Serial.println("✗ Firebase alert error: " + fbdo.errorReason());
  } else {
    Serial.println("⚠ Firebase offline. Queuing alert for retry.");
  }

  enqueueAlertRecord(record);
}

void sendSMSAlert(NodeData* nodeData, NodeAlert* nodeAlert) {
  if (NUM_PHONE_NUMBERS == 0) {
    Serial.println("⚠️ WARNING: No phone numbers configured. Cannot send SMS!");
    return;
  }
  
  if (!nodeAlert->buzzerSilenced) {
    String emoji = "";
    String prefix = "";
    
    if (nodeData->alertLevel == ALERT) {
      emoji = "🚨";
      prefix = "ALERT";
    } else if (nodeData->alertLevel == WARNING) {
      emoji = "⚠️";
      prefix = "WARNING";
    } else {
      emoji = "ℹ️";
      prefix = "INFO";
    }
    
    String displayName = getRoomDisplayName(nodeData);
    
    String msg = emoji + " " + prefix + ": " + nodeData->alertMessage + "\n" +
                 "Room: " + displayName + "\n" +
                 "Temp: " + String(nodeData->temperature, 1) + "C\n" +
                 "Humidity: " + String(nodeData->humidity, 0) + "%\n" +
                 "Gas: " + String(nodeData->mq2Value, 2) + "\n" +
                 "CO: " + String(nodeData->mq7Value, 2) + "\n" +
                 "Flame: " + (nodeData->flameValue ? "DETECTED" : "None") + "\n" +
                 "Time: " + getFormattedDateTime();
    
    // Send SMS to all configured phone numbers
    for (int i = 0; i < NUM_PHONE_NUMBERS; i++) {
      Serial.println("📱 Sending SMS to " + PHONE_NUMBERS[i]);
      sendSMS(PHONE_NUMBERS[i], msg);
      delay(2000); // Delay between SMS sends
    }
    nodeAlert->smsSent = true;
    nodeAlert->lastSMSTime = millis();
  }
}

void sendToFirebase(NodeData* nodeData, NodeAlert* nodeAlert) {
  if (Firebase.ready() && signupOK) {
    unsigned long now = millis();
    
    // Real-time updates: send every time data is received
    if (now - nodeData->lastFirebaseUpdate < FIREBASE_COOLDOWN) {
      return; // Too soon, skip this update
    }
    
    FirebaseJson json;
    String path = "sensor_data/" + nodeData->nodeID;
    
    json.set("temperature", nodeData->temperature);
    json.set("humidity", nodeData->humidity);
    json.set("Gas_and_Smoke", nodeData->mq2Value);
    json.set("carbon_monoxide", nodeData->mq7Value);
    json.set("flame", nodeData->flameValue);
    json.set("timestamp", getFormattedDateTime());
    json.set("alert_level", getAlertLevelString(nodeData->alertLevel));
    json.set("alert_message", nodeData->alertMessage);
    json.set("silenced", nodeAlert->buzzerSilenced);
    json.set("active", nodeData->isActive);
    json.set("room_name", getRoomDisplayName(nodeData));
    
    if (!Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      Serial.println("✗ Firebase update failed: " + fbdo.errorReason());
    } else {
      Serial.println("✓ Firebase updated for " + getRoomDisplayName(nodeData));
      nodeData->lastFirebaseUpdate = now;
    }
  }
}

// ===================== MAIN LOOP =====================
void loop() {
  // Handle OTA updates (must be called frequently)
  ArduinoOTA.handle();
  
  // Sync configurations periodically
  syncNTPTime();
  syncRoomNamesFromFirebase();
  syncPhoneNumbersFromFirebase();
  syncThresholdsFromFirebase();
  syncSilenceFromFirebase();
  flushQueuedAlerts();
  
  // Check for node timeouts
  checkNodeTimeout();
  
  // Handle user input
  checkButtons();
  checkIncomingSMS();
  
  // Real-time LoRa data reception - NON-BLOCKING
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = "";
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    
    if (data.length() > 0) {
      Serial.println("📡 LoRa data received: " + data);
      parseReceivedData(data);
    }
  }
  
  // Handle alerts and display
  handleAlerts();
  updateLCD();
  
  // Handle SIM800L responses
  while (sim800l.available()) {
    Serial.write(sim800l.read());
  }
  
  delay(10);  // Small delay for stability
}
