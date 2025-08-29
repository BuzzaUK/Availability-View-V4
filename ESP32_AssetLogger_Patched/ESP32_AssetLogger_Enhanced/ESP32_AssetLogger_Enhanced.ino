/*
 * Enhanced ESP32 Asset Logger with Real-time Server Integration
 * 
 * This code combines the robust standalone functionality of V26 with
 * real-time server communication for centralized analytics and monitoring.
 * 
 * Features:
 * - Standalone operation (works without server)
 * - Real-time asset state updates to server
 * - Automatic logger registration
 * - OLED display for local monitoring
 * - WiFi configuration portal
 * - Local data logging with SPIFFS
 * - Heartbeat monitoring
 * - Asset availability calculations
 */

#include <WiFi.h>
#include <WebServer.h>
#include <SPIFFS.h>
#include <Preferences.h>
#include <time.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ===== CONFIGURATION =====
#define LOGGER_ID "ESP32_001" 
#define LOGGER_NAME "Production Floor Logger" 
#define FIRMWARE_VERSION "2.0.0" 
#define WEB_APP_URL "http://192.168.0.63:5000"  // Replace with your actual IP   

// OLED Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

// Asset Configuration
#define MAX_INPUTS 8  // Hardcoded input limit variable
#define MAX_ASSETS MAX_INPUTS
const int ASSET_PINS[MAX_ASSETS] = {15, 2, 4, 16, 17, 5, 18, 19};  // GPIO pins for I/P 1-8
const char* ASSET_NAMES[MAX_ASSETS] = {
  "I/P 1",
  "I/P 2", 
  "I/P 3",
  "I/P 4",
  "I/P 5",
  "I/P 6",
  "I/P 7",
  "I/P 8"
};

// Timing Configuration
#define HEARTBEAT_INTERVAL 30000      // 30 seconds
#define STATE_UPDATE_INTERVAL 1000    // 1 second
#define DISPLAY_UPDATE_INTERVAL 2000  // 2 seconds
#define SHORT_STOP_THRESHOLD 300      // 5 minutes in seconds
#define LONG_STOP_THRESHOLD 1800      // 30 minutes in seconds
#define NETWORK_TIMEOUT 120000        // 2 minutes network timeout
#define WIFI_RETRY_INTERVAL 10000     // 10 seconds between WiFi retry attempts

// ===== GLOBAL OBJECTS =====
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
WebServer server(80);
Preferences preferences;
WiFiManager wifiManager;

// ===== DATA STRUCTURES =====
struct AssetState {
  String name;
  int pin;
  bool isRunning;
  bool lastState;
  unsigned long lastStateChange;
  unsigned long totalRuntime;
  unsigned long totalDowntime;
  int totalStops;
  bool isShortStop;
  float availabilityPercentage;
};

struct SystemState {
  bool wifiConnected;
  bool serverConnected;
  unsigned long lastHeartbeat;
  unsigned long lastServerUpdate;
  bool registeredWithServer;
  String ipAddress;
  int wifiRSSI;
};

// ===== GLOBAL VARIABLES =====
AssetState assets[MAX_ASSETS];
SystemState systemState;
unsigned long lastDisplayUpdate = 0;
unsigned long lastStateCheck = 0;
int currentDisplayAsset = 0;
bool displayInitialized = false;
unsigned long lastNetworkCheck = 0;
unsigned long networkFailureStart = 0;
bool networkFailureDetected = false;
int wifiRetryCount = 0;

// ===== SETUP FUNCTIONS =====
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Enhanced Asset Logger Starting ===");
  
  // Initialize SPIFFS
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS Mount Failed");
    return;
  }
  
  // Initialize preferences
  preferences.begin("assetlogger", false);
  
  // Initialize OLED display
  initializeDisplay();
  
  // Initialize asset pins and states
  initializeAssets();
  
  // Setup WiFi connection
  setupWiFi();
  
  // Initialize time
  setupTime();
  
  // Setup web server for local access
  setupWebServer();
  
  // Register with server
  registerWithServer();
  
  Serial.println("=== Setup Complete ===");
  updateDisplay("System Ready", "All systems online");
}

void initializeDisplay() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("SSD1306 allocation failed");
    return;
  }
  
  displayInitialized = true;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("ESP32 Asset Logger");
  display.println("Initializing...");
  display.display();
  delay(2000);
}

void initializeAssets() {
  // Validate input limit
  if (MAX_INPUTS > 8) {
    Serial.println("ERROR: Maximum inputs exceeded! Limited to 8 inputs.");
    updateDisplay("Input Error", "Max 8 inputs only");
    delay(5000);
  }
  
  for (int i = 0; i < MAX_ASSETS && i < MAX_INPUTS; i++) {
    pinMode(ASSET_PINS[i], INPUT_PULLUP);
    
    assets[i].name = ASSET_NAMES[i];
    assets[i].pin = ASSET_PINS[i];
    assets[i].isRunning = false;
    assets[i].lastState = false;
    assets[i].lastStateChange = millis();
    assets[i].totalRuntime = 0;
    assets[i].totalDowntime = 0;
    assets[i].totalStops = 0;
    assets[i].isShortStop = false;
    assets[i].availabilityPercentage = 0.0;
  }
  
  Serial.printf("Assets initialized: %d inputs configured\n", MAX_INPUTS);
}

void setupWiFi() {
  updateDisplay("WiFi Setup", "Connecting...");
  
  // Enhanced WiFi configuration for factory floor reliability
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  
  // Set custom parameters for WiFiManager - optimized for factory environment
  wifiManager.setConfigPortalTimeout(600); // 10 minutes timeout for initial setup
  wifiManager.setConnectTimeout(60);       // 60 seconds connect timeout
  wifiManager.setAPCallback(configModeCallback);
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  
  // Set stronger signal requirements
  wifiManager.setMinimumSignalQuality(20); // Minimum 20% signal quality
  
  // Try to connect to WiFi with enhanced error handling
  if (!wifiManager.autoConnect("ESP32-AssetLogger-Setup")) {
    Serial.println("Failed to connect to WiFi after timeout");
    updateDisplay("WiFi Timeout", "Restarting...");
    delay(3000);
    ESP.restart();
  }
  
  systemState.wifiConnected = true;
  systemState.ipAddress = WiFi.localIP().toString();
  systemState.wifiRSSI = WiFi.RSSI();
  
  Serial.println("WiFi connected!");
  Serial.printf("IP address: %s\n", systemState.ipAddress.c_str());
  Serial.printf("Signal strength: %d dBm\n", systemState.wifiRSSI);
  
  updateDisplay("WiFi Connected", systemState.ipAddress.c_str());
  delay(2000);
}

void setupTime() {
  updateDisplay("Time Sync", "Setting up NTP...");
  
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  // Wait for time to be set
  int attempts = 0;
  while (time(nullptr) < 8 * 3600 * 2 && attempts < 20) {
    delay(500);
    attempts++;
  }
  
  if (time(nullptr) < 8 * 3600 * 2) {
    Serial.println("Failed to obtain time");
    updateDisplay("Time Sync Failed", "Using local time");
  } else {
    Serial.println("Time synchronized");
    updateDisplay("Time Synced", "NTP successful");
  }
  
  delay(1000);
}

void setupWebServer() {
  // Local web interface endpoints
  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/assets", HTTP_GET, handleAssets);
  server.on("/config", HTTP_GET, handleConfig);
  server.on("/reset", HTTP_POST, handleReset);
  
  server.begin();
  Serial.println("Local web server started on port 80");
}

// ===== MAIN LOOP =====
void loop() {
  // Handle web server requests
  server.handleClient();
  
  // Check asset states
  if (millis() - lastStateCheck >= STATE_UPDATE_INTERVAL) {
    checkAssetStates();
    lastStateCheck = millis();
  }
  
  // Update display
  if (millis() - lastDisplayUpdate >= DISPLAY_UPDATE_INTERVAL) {
    updateDisplayCycle();
    lastDisplayUpdate = millis();
  }
  
  // Send heartbeat to server
  if (millis() - systemState.lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    systemState.lastHeartbeat = millis();
  }
  
  // Enhanced network monitoring and failure detection
  checkNetworkHealth();
  
  // Check WiFi connection with enhanced retry logic
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiDisconnection();
  } else if (!systemState.wifiConnected) {
    systemState.wifiConnected = true;
    systemState.ipAddress = WiFi.localIP().toString();
    systemState.wifiRSSI = WiFi.RSSI();
    networkFailureDetected = false;
    networkFailureStart = 0;
    wifiRetryCount = 0;
    Serial.println("WiFi reconnected successfully");
    updateDisplay("WiFi Restored", systemState.ipAddress.c_str());
  }
  
  delay(100); // Small delay to prevent watchdog issues
}

// ===== ASSET MONITORING =====
void checkAssetStates() {
  for (int i = 0; i < MAX_ASSETS; i++) {
    bool currentState = digitalRead(assets[i].pin) == HIGH; // Assuming HIGH = running
    
    if (currentState != assets[i].lastState) {
      // State change detected
      unsigned long now = millis();
      unsigned long duration = (now - assets[i].lastStateChange) / 1000; // Convert to seconds
      
      // Update runtime/downtime based on previous state
      if (assets[i].lastState) {
        assets[i].totalRuntime += duration;
      } else {
        assets[i].totalDowntime += duration;
        if (currentState) { // Transitioning from stopped to running
          assets[i].totalStops++;
          assets[i].isShortStop = duration <= SHORT_STOP_THRESHOLD;
        }
      }
      
      // Calculate availability
      unsigned long totalTime = assets[i].totalRuntime + assets[i].totalDowntime;
      if (totalTime > 0) {
        assets[i].availabilityPercentage = (float)assets[i].totalRuntime / totalTime * 100.0;
      }
      
      // Update state
      assets[i].lastState = currentState;
      assets[i].isRunning = currentState;
      assets[i].lastStateChange = now;
      
      // Log the change
      String stateStr = currentState ? "RUNNING" : "STOPPED";
      Serial.printf("Asset %s changed to %s (duration: %lu seconds)\n", 
                   assets[i].name.c_str(), stateStr.c_str(), duration);
      
      // Send update to server
      sendAssetStateUpdate(i, duration);
      
      // Log to local storage
      logEventToSPIFFS(i, stateStr, duration);
    }
  }
}

void sendAssetStateUpdate(int assetIndex, unsigned long duration) {
  if (!systemState.wifiConnected) return;
  
  HTTPClient http;
  http.begin(String(WEB_APP_URL) + "/api/asset-state");
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<300> doc;
  doc["logger_id"] = LOGGER_ID;
  doc["pin_number"] = assets[assetIndex].pin;
  doc["is_running"] = assets[assetIndex].isRunning;
  doc["timestamp"] = getISOTimestamp();
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    if (httpResponseCode == 200) {
      systemState.serverConnected = true;
      systemState.lastServerUpdate = millis();
      Serial.printf("Asset state update sent successfully for %s\n", assets[assetIndex].name.c_str());
    } else {
      Serial.printf("Server responded with code: %d\n", httpResponseCode);
    }
  } else {
    systemState.serverConnected = false;
    Serial.printf("Error sending asset state update: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}

// ===== SERVER COMMUNICATION =====
void registerWithServer() {
  if (!systemState.wifiConnected) return;
  
  updateDisplay("Server Reg", "Registering...");
  
  HTTPClient http;
  http.begin(String(WEB_APP_URL) + "/api/device/register");
  http.addHeader("Content-Type", "application/json");
  
  // Create registration payload
  StaticJsonDocument<400> doc;
  doc["logger_id"] = LOGGER_ID;
  doc["logger_name"] = LOGGER_NAME;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["ip_address"] = systemState.ipAddress;
  doc["description"] = "Enhanced Asset Logger with real-time monitoring";
  doc["location"] = "Production Floor";
  doc["heartbeat_interval"] = HEARTBEAT_INTERVAL / 1000;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    if (httpResponseCode == 200 || httpResponseCode == 201) {
      systemState.registeredWithServer = true;
      Serial.println("Successfully registered with server");
      updateDisplay("Registered", "Server connected");
    } else {
      Serial.printf("Registration failed with code: %d\n", httpResponseCode);
      Serial.println("Response: " + response);
      updateDisplay("Reg Failed", "Check server");
    }
  } else {
    Serial.printf("Registration error: %s\n", http.errorToString(httpResponseCode).c_str());
    updateDisplay("Reg Error", "Network issue");
  }
  
  http.end();
  delay(2000);
}

void sendHeartbeat() {
  if (!systemState.wifiConnected || !systemState.registeredWithServer) return;
  
  HTTPClient http;
  http.begin(String(WEB_APP_URL) + "/api/device/heartbeat");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<300> doc;
  doc["logger_id"] = LOGGER_ID;
  doc["status"] = "online";
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["uptime"] = millis() / 1000;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    systemState.serverConnected = true;
    Serial.println("Heartbeat sent successfully");
  } else {
    systemState.serverConnected = false;
    Serial.printf("Heartbeat failed with code: %d\n", httpResponseCode);
  }
  
  http.end();
}

// ===== DISPLAY FUNCTIONS =====
void updateDisplay(const char* title, const char* message) {
  if (!displayInitialized) return;
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  // Title
  display.setCursor(0, 0);
  display.println(title);
  display.drawLine(0, 10, SCREEN_WIDTH, 10, SSD1306_WHITE);
  
  // Message
  display.setCursor(0, 15);
  display.println(message);
  
  display.display();
}

void updateDisplayCycle() {
  if (!displayInitialized) return;
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  // Header with system status
  display.setCursor(0, 0);
  display.print("Logger: ");
  display.print(systemState.wifiConnected ? "WiFi" : "NoWiFi");
  display.print(" ");
  display.println(systemState.serverConnected ? "Srv" : "NoSrv");
  display.drawLine(0, 10, SCREEN_WIDTH, 10, SSD1306_WHITE);
  
  // Show current asset
  if (currentDisplayAsset < MAX_ASSETS) {
    AssetState& asset = assets[currentDisplayAsset];
    
    display.setCursor(0, 15);
    display.println(asset.name);
    
    display.setCursor(0, 25);
    display.print("State: ");
    display.println(asset.isRunning ? "RUNNING" : "STOPPED");
    
    display.setCursor(0, 35);
    display.print("Avail: ");
    display.print(asset.availabilityPercentage, 1);
    display.println("%");
    
    display.setCursor(0, 45);
    display.print("Stops: ");
    display.println(asset.totalStops);
    
    display.setCursor(0, 55);
    display.print("Runtime: ");
    display.print(asset.totalRuntime / 3600);
    display.println("h");
  }
  
  display.display();
  
  // Cycle to next asset
  currentDisplayAsset = (currentDisplayAsset + 1) % MAX_ASSETS;
}

// ===== WEB SERVER HANDLERS =====
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>ESP32 Asset Logger</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:20px;} .asset{border:1px solid #ccc;margin:10px;padding:10px;} .running{background:#d4edda;} .stopped{background:#f8d7da;}</style>";
  html += "</head><body>";
  html += "<h1>ESP32 Asset Logger</h1>";
  html += "<h2>System Status</h2>";
  html += "<p>WiFi: " + String(systemState.wifiConnected ? "Connected" : "Disconnected") + "</p>";
  html += "<p>Server: " + String(systemState.serverConnected ? "Connected" : "Disconnected") + "</p>";
  html += "<p>IP: " + systemState.ipAddress + "</p>";
  html += "<p>RSSI: " + String(WiFi.RSSI()) + " dBm</p>";
  html += "<h2>Assets</h2>";
  
  for (int i = 0; i < MAX_ASSETS; i++) {
    String cssClass = assets[i].isRunning ? "asset running" : "asset stopped";
    html += "<div class='" + cssClass + "'>";
    html += "<h3>" + assets[i].name + "</h3>";
    html += "<p>State: " + String(assets[i].isRunning ? "RUNNING" : "STOPPED") + "</p>";
    html += "<p>Availability: " + String(assets[i].availabilityPercentage, 1) + "%</p>";
    html += "<p>Total Stops: " + String(assets[i].totalStops) + "</p>";
    html += "<p>Runtime: " + String(assets[i].totalRuntime / 3600) + " hours</p>";
    html += "<p>Downtime: " + String(assets[i].totalDowntime / 3600) + " hours</p>";
    html += "</div>";
  }
  
  html += "<p><a href='/config'>Configuration</a> | <a href='/status'>Status</a></p>";
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

void handleStatus() {
  StaticJsonDocument<1000> doc;
  
  doc["system"]["wifi_connected"] = systemState.wifiConnected;
  doc["system"]["server_connected"] = systemState.serverConnected;
  doc["system"]["ip_address"] = systemState.ipAddress;
  doc["system"]["wifi_rssi"] = WiFi.RSSI();
  doc["system"]["free_heap"] = ESP.getFreeHeap();
  doc["system"]["uptime"] = millis() / 1000;
  
  JsonArray assetsArray = doc.createNestedArray("assets");
  for (int i = 0; i < MAX_ASSETS; i++) {
    JsonObject asset = assetsArray.createNestedObject();
    asset["name"] = assets[i].name;
    asset["pin"] = assets[i].pin;
    asset["is_running"] = assets[i].isRunning;
    asset["availability_percentage"] = assets[i].availabilityPercentage;
    asset["total_runtime"] = assets[i].totalRuntime;
    asset["total_downtime"] = assets[i].totalDowntime;
    asset["total_stops"] = assets[i].totalStops;
  }
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleAssets() {
  handleStatus(); // Same as status for now
}

void handleConfig() {
  String html = "<!DOCTYPE html><html><head><title>Configuration</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:20px;} .config-item{margin:10px 0;padding:5px;background:#f5f5f5;}</style>";
  html += "</head><body>";
  html += "<h1>ESP32 Asset Logger Configuration</h1>";
  html += "<div class='config-item'><strong>Logger ID:</strong> " + String(LOGGER_ID) + "</div>";
  html += "<div class='config-item'><strong>Logger Name:</strong> " + String(LOGGER_NAME) + "</div>";
  html += "<div class='config-item'><strong>Firmware Version:</strong> " + String(FIRMWARE_VERSION) + "</div>";
  html += "<div class='config-item'><strong>Server URL:</strong> " + String(WEB_APP_URL) + "</div>";
  html += "<div class='config-item'><strong>Max Inputs:</strong> " + String(MAX_INPUTS) + " (Hardcoded)</div>";
  html += "<div class='config-item'><strong>Network Timeout:</strong> " + String(NETWORK_TIMEOUT/1000) + " seconds</div>";
  html += "<div class='config-item'><strong>WiFi Retry Interval:</strong> " + String(WIFI_RETRY_INTERVAL/1000) + " seconds</div>";
  html += "<h2>Network Status</h2>";
  html += "<div class='config-item'><strong>WiFi Status:</strong> " + String(systemState.wifiConnected ? "Connected" : "Disconnected") + "</div>";
  html += "<div class='config-item'><strong>Network Failure Detected:</strong> " + String(networkFailureDetected ? "Yes" : "No") + "</div>";
  html += "<div class='config-item'><strong>WiFi Retry Count:</strong> " + String(wifiRetryCount) + "</div>";
  html += "<h2>Input Pin Configuration</h2>";
  for (int i = 0; i < MAX_ASSETS; i++) {
    html += "<div class='config-item'><strong>" + assets[i].name + ":</strong> GPIO " + String(assets[i].pin) + "</div>";
  }
  html += "<h2>Actions</h2>";
  html += "<form action='/reset' method='post'>";
  html += "<button type='submit' style='background:#dc3545;color:white;padding:10px;border:none;cursor:pointer;'>Reset WiFi Settings</button>";
  html += "</form>";
  html += "<p><a href='/'>Back to Home</a></p>";
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

void handleReset() {
  wifiManager.resetSettings();
  server.send(200, "text/html", "WiFi settings reset. Device will restart.");
  delay(1000);
  ESP.restart();
}

// ===== NETWORK RELIABILITY FUNCTIONS =====
void checkNetworkHealth() {
  unsigned long now = millis();
  
  // Check network health every 30 seconds
  if (now - lastNetworkCheck >= 30000) {
    lastNetworkCheck = now;
    
    if (WiFi.status() != WL_CONNECTED || !systemState.serverConnected) {
      if (!networkFailureDetected) {
        networkFailureDetected = true;
        networkFailureStart = now;
        Serial.println("Network failure detected");
        updateDisplay("Network Issue", "Monitoring...");
      } else {
        // Check if network has been down for more than 2 minutes
        if (now - networkFailureStart >= NETWORK_TIMEOUT) {
          Serial.println("Network timeout exceeded - restarting device");
          updateDisplay("Network Timeout", "Restarting...");
          delay(3000);
          ESP.restart();
        }
      }
    } else {
      if (networkFailureDetected) {
        networkFailureDetected = false;
        networkFailureStart = 0;
        Serial.println("Network health restored");
      }
    }
  }
}

void handleWiFiDisconnection() {
  systemState.wifiConnected = false;
  unsigned long now = millis();
  
  // Display network failure warning
  updateDisplay("WiFi Lost", "Reconnecting...");
  
  // Attempt reconnection with retry logic
  if (now - lastNetworkCheck >= WIFI_RETRY_INTERVAL) {
    wifiRetryCount++;
    Serial.printf("WiFi disconnected, retry attempt %d\n", wifiRetryCount);
    
    // Try different reconnection strategies
    if (wifiRetryCount <= 3) {
      WiFi.reconnect();
    } else if (wifiRetryCount <= 6) {
      WiFi.disconnect();
      delay(1000);
      WiFi.begin();
    } else {
      // Reset WiFi and restart if too many failures
      Serial.println("Too many WiFi failures - restarting");
      updateDisplay("WiFi Failed", "Restarting...");
      delay(3000);
      ESP.restart();
    }
    
    lastNetworkCheck = now;
  }
}

void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println("Entered config mode");
  Serial.println(WiFi.softAPIP());
  Serial.println(myWiFiManager->getConfigPortalSSID());
  updateDisplay("Config Mode", "Connect to setup");
}

void saveConfigCallback() {
  Serial.println("Should save config");
  updateDisplay("Config Saved", "Restarting...");
}

// ===== UTILITY FUNCTIONS =====
String getISOTimestamp() {
  time_t now;
  time(&now);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S.000Z", &timeinfo);
  return String(buffer);
}

void logEventToSPIFFS(int assetIndex, String state, unsigned long duration) {
  File file = SPIFFS.open("/events.log", FILE_APPEND);
  if (file) {
    String logEntry = getISOTimestamp() + "," + assets[assetIndex].name + "," + state + "," + String(duration) + "\n";
    file.print(logEntry);
    file.close();
  }
}