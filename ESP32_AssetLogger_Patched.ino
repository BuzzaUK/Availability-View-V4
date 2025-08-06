#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration - UPDATE THESE WITH YOUR WIFI DETAILS
const char* WIFI_SSID = "YOUR_WIFI_SSID";           // Replace with your WiFi network name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// Asset Availability Dashboard Backend URL
// Update this with your computer's IP address where the backend is running
const char* WEB_APP_URL = "http://192.168.0.63:5000";  // Replace 192.168.0.63 with your computer's IP

// Asset structure
struct Asset {
  String name;
  int pin;
  bool lastState;
  unsigned long lastChangeTime;
  unsigned long totalRuntime;
  unsigned long totalDowntime;
  unsigned long lastStateChangeTime;
};

// Configure your assets here - matching the dashboard assets
Asset assets[] = {
  {"Production Line A", 2, false, 0, 0, 0, 0},
  {"Production Line B", 4, false, 0, 0, 0, 0},
  {"Packaging Unit", 5, false, 0, 0, 0, 0}
};

const int assetCount = sizeof(assets) / sizeof(assets[0]);

// Timing variables
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // Send heartbeat every 30 seconds
unsigned long lastStatusUpdate = 0;
const unsigned long STATUS_UPDATE_INTERVAL = 5000; // Update status every 5 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Asset Logger for Asset Availability Dashboard Starting...");
  
  // Initialize GPIO pins
  for(int i = 0; i < assetCount; i++) {
    pinMode(assets[i].pin, INPUT_PULLUP); // Using pullup for better noise immunity
    assets[i].lastState = digitalRead(assets[i].pin) == HIGH; // Active high sensors
    assets[i].lastChangeTime = millis();
    assets[i].lastStateChangeTime = millis();
    Serial.printf("Asset %s initialized on pin %d\n", assets[i].name.c_str(), assets[i].pin);
  }
  
  // Connect to WiFi
  connectToWiFi();
  
  // Test connection to dashboard backend
  testConnection();
  
  // Send initial asset states
  sendInitialStates();
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectToWiFi();
  }
  
  unsigned long currentTime = millis();
  
  // Monitor asset states
  for(int i = 0; i < assetCount; i++) {
    bool currentState = digitalRead(assets[i].pin) == HIGH; // Active high
    
    // Update runtime/downtime tracking
    unsigned long timeDelta = currentTime - assets[i].lastStateChangeTime;
    if(assets[i].lastState) {
      assets[i].totalRuntime += timeDelta;
    } else {
      assets[i].totalDowntime += timeDelta;
    }
    assets[i].lastStateChangeTime = currentTime;
    
    // Check for state change
    if(currentState != assets[i].lastState) {
      Serial.printf("Asset %s changed to %s\n", 
        assets[i].name.c_str(), 
        currentState ? "RUNNING" : "STOPPED");
      
      // Send state update to dashboard
      sendStateUpdate(assets[i].name, assets[i].pin, currentState);
      
      assets[i].lastState = currentState;
      assets[i].lastChangeTime = currentTime;
    }
  }
  
  // Send periodic heartbeat
  if(currentTime - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = currentTime;
  }
  
  // Send periodic status updates
  if(currentTime - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
    sendPeriodicStatusUpdate();
    lastStatusUpdate = currentTime;
  }
  
  delay(100);
}

void connectToWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi Connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}

void sendStateUpdate(String assetName, int pin, bool isRunning) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(WEB_APP_URL) + "/api/asset-state");
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload matching the expected format
    StaticJsonDocument<300> doc;
    doc["asset_name"] = assetName;
    doc["pin_number"] = pin;
    doc["is_running"] = isRunning;
    doc["timestamp"] = String(millis());
    doc["esp32_time"] = String(millis());
    doc["wifi_rssi"] = WiFi.RSSI();
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode == 200) {
      Serial.printf("✓ Sent state update for %s (HTTP %d)\n", assetName.c_str(), httpResponseCode);
    } else {
      Serial.printf("✗ Failed to send state update for %s (HTTP %d)\n", assetName.c_str(), httpResponseCode);
      String response = http.getString();
      Serial.printf("Response: %s\n", response.c_str());
    }
    
    http.end();
  } else {
    Serial.println("✗ WiFi not connected, cannot send state update");
  }
}

void sendInitialStates() {
  Serial.println("Sending initial asset states...");
  for(int i = 0; i < assetCount; i++) {
    sendStateUpdate(assets[i].name, assets[i].pin, assets[i].lastState);
    delay(500); // Small delay between requests
  }
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(WEB_APP_URL) + "/api/health");
    
    int httpResponseCode = http.GET();
    
    if (httpResponseCode == 200) {
      Serial.printf("✓ Heartbeat successful (HTTP %d)\n", httpResponseCode);
    } else {
      Serial.printf("✗ Heartbeat failed (HTTP %d)\n", httpResponseCode);
    }
    
    http.end();
  }
}

void sendPeriodicStatusUpdate() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(WEB_APP_URL) + "/api/asset-state");
    http.addHeader("Content-Type", "application/json");
    
    // Send status for all assets with runtime/downtime data
    for(int i = 0; i < assetCount; i++) {
      StaticJsonDocument<400> doc;
      doc["asset_name"] = assets[i].name;
      doc["pin_number"] = assets[i].pin;
      doc["is_running"] = assets[i].lastState;
      doc["timestamp"] = String(millis());
      doc["total_runtime"] = assets[i].totalRuntime;
      doc["total_downtime"] = assets[i].totalDowntime;
      doc["wifi_rssi"] = WiFi.RSSI();
      doc["free_heap"] = ESP.getFreeHeap();
      doc["uptime"] = millis();
      
      String jsonString;
      serializeJson(doc, jsonString);
      
      int httpResponseCode = http.POST(jsonString);
      
      if (httpResponseCode == 200) {
        Serial.printf("✓ Status update sent for %s\n", assets[i].name.c_str());
      } else {
        Serial.printf("✗ Status update failed for %s (HTTP %d)\n", assets[i].name.c_str(), httpResponseCode);
      }
      
      delay(200); // Small delay between asset updates
    }
    
    http.end();
  }
}

void testConnection() {
  Serial.println("Testing Asset Availability Dashboard connection...");
  
  HTTPClient http;
  http.begin(String(WEB_APP_URL) + "/api/health");
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    Serial.printf("✓ Dashboard connection successful (HTTP %d)\n", httpResponseCode);
    String response = http.getString();
    Serial.printf("Response: %s\n", response.c_str());
  } else {
    Serial.printf("✗ Dashboard connection failed (HTTP %d)\n", httpResponseCode);
    Serial.println("Please check:");
    Serial.println("1. Backend server is running on port 5000");
    Serial.println("2. WEB_APP_URL points to correct IP address");
    Serial.println("3. Firewall allows connections on port 5000");
  }
  
  http.end();
}

// Utility function to print asset statistics
void printAssetStats() {
  Serial.println("\n=== Asset Statistics ===");
  for(int i = 0; i < assetCount; i++) {
    float availability = 0;
    unsigned long totalTime = assets[i].totalRuntime + assets[i].totalDowntime;
    if(totalTime > 0) {
      availability = (float)assets[i].totalRuntime / totalTime * 100;
    }
    
    Serial.printf("%s: Runtime=%lums, Downtime=%lums, Availability=%.1f%%\n",
      assets[i].name.c_str(),
      assets[i].totalRuntime,
      assets[i].totalDowntime,
      availability);
  }
  Serial.println("========================\n");
}