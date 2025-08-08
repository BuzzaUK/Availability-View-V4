# ESP32 Asset Logger Setup Guide

## Overview
This guide will help you set up the ESP32 Asset Logger to work with the Asset Availability Dashboard. The ESP32 will monitor digital inputs and send real-time asset state updates to the web dashboard.

## Prerequisites
- ESP32 development board
- Arduino IDE with ESP32 board support
- WiFi network access
- Asset Availability Dashboard running on your computer

## Required Libraries
Install these libraries through Arduino IDE Library Manager:
1. **WiFi** (built-in with ESP32)
2. **HTTPClient** (built-in with ESP32)
3. **ArduinoJson** by Benoit Blanchon (version 6.x)

## Hardware Setup

### Basic Wiring
Connect your asset sensors to the ESP32 digital pins:
- **Pin 2**: Conveyor Belt sensor
- **Pin 4**: Packaging Machine sensor  
- **Pin 5**: Quality Station sensor
- **GND**: Common ground for all sensors
- **3.3V**: Power for active sensors (if needed)

### Sensor Types
- **Active High**: Sensor outputs HIGH when asset is running
- **Active Low**: Sensor outputs LOW when asset is running (use INPUT_PULLUP)
- **Dry Contacts**: Use INPUT_PULLUP mode

## Software Configuration

### 1. Update WiFi Settings
```cpp
const char* WIFI_SSID = "YourWiFiNetwork";
const char* WIFI_PASSWORD = "YourWiFiPassword";
```

### 2. Update Backend URL
Find your computer's IP address and update:
```cpp
const char* WEB_APP_URL = "http://192.168.1.100:5000";
```

**To find your IP address:**
- Windows: Open Command Prompt, type `ipconfig`
- Mac/Linux: Open Terminal, type `ifconfig`

### 3. Configure Logger Identity
```cpp
const char* LOGGER_ID = "ESP32_001";        // Unique ID for this ESP32
const char* LOGGER_NAME = "Production Floor Logger";  // Descriptive name
```

### 4. Configure Assets
Update the assets array to match your setup:
```cpp
Asset assets[] = {
  {"Conveyor Belt", 2, false, 0, 0, 0, 0},      // Pin 2
  {"Packaging Machine", 4, false, 0, 0, 0, 0},  // Pin 4
  {"Quality Station", 5, false, 0, 0, 0, 0}     // Pin 5
};
```

## Dashboard Setup

### 1. Register the Logger
1. Open the Asset Availability Dashboard in your web browser
2. Log in with admin credentials (admin@example.com / admin123)
3. Go to **Config** → **Logger Management**
4. The ESP32 will attempt to auto-register, or you can manually add:
   - **Logger ID**: ESP32_001
   - **Logger Name**: Production Floor Logger

### 2. Create Assets
1. Go to **Config** → **Asset Management**
2. For each asset, create an entry with:
   - **Asset Name**: (e.g., "Conveyor Belt")
   - **Pin Number**: (e.g., 2)
   - **Logger**: Select your registered logger
   - **Description**: Optional description

### 3. Configure Thresholds
Set appropriate stop thresholds for each asset:
- **Short Stop Threshold**: 5-30 seconds (brief interruptions)
- **Long Stop Threshold**: 300+ seconds (significant downtime)

## Upload and Test

### 1. Upload Code
1. Connect ESP32 to your computer via USB
2. Select the correct board and port in Arduino IDE
3. Upload the code

### 2. Monitor Serial Output
Open Serial Monitor (115200 baud) to see:
```
Asset Logger Starting...
Logger ID: ESP32_001
Firmware Version: 1.2.0
Initialized Conveyor Belt on pin 2
Initialized Packaging Machine on pin 4
Initialized Quality Station on pin 5
Connecting to WiFi...
WiFi Connected!
IP address: 192.168.1.150
✓ Dashboard connection successful (HTTP 200)
✓ Logger registered successfully (HTTP 201)
✓ Sent state update for Conveyor Belt: STOPPED (HTTP 200)
Setup complete. Starting monitoring...
```

### 3. Verify Dashboard
1. Check the **Dashboard** page for real-time asset status
2. Verify **Events** page shows state changes
3. Monitor **Analytics** for performance metrics

## Troubleshooting

### Connection Issues
- **WiFi connection failed**: Check SSID and password
- **Dashboard connection failed**: Verify IP address and port 5000
- **Logger registration failed**: Check if dashboard is running and accessible

### Authentication Issues
- **401 Unauthorized**: Make sure you're logged into the dashboard
- **Logger not registered**: Manually register in Logger Management

### Asset Issues
- **Asset not found**: Verify pin numbers match between ESP32 code and dashboard
- **No state changes**: Check sensor wiring and pin configuration
- **Wrong state readings**: Verify sensor type (active high/low)

### Serial Monitor Messages
- **✓ Sent state update**: Normal operation
- **✗ Failed to send state update**: Check network and dashboard
- **✗ Logger not registered**: Registration failed, check dashboard
- **✗ WiFi not connected**: Network connectivity issue

## Advanced Configuration

### Multiple ESP32s
For multiple ESP32 devices:
1. Use unique LOGGER_ID for each device (ESP32_001, ESP32_002, etc.)
2. Register each logger separately in the dashboard
3. Assign different assets to each logger

### Custom Timing
Adjust update intervals:
```cpp
const unsigned long HEARTBEAT_INTERVAL = 30000;     // 30 seconds
const unsigned long STATUS_UPDATE_INTERVAL = 60000; // 1 minute
```

### Sensor Debouncing
For noisy sensors, add debouncing in the main loop:
```cpp
// Add delay or implement proper debouncing logic
if(currentTime - assets[i].lastChangeTime > 1000) { // 1 second debounce
  // Process state change
}
```

## Support
If you encounter issues:
1. Check the Serial Monitor output for error messages
2. Verify all network settings and connections
3. Ensure the dashboard is running and accessible
4. Check that assets are properly configured in the dashboard

The ESP32 will automatically reconnect to WiFi and re-register with the dashboard if connections are lost.