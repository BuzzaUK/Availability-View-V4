# ESP32 Asset Logger Setup Guide

## Overview
This guide will help you set up the ESP32 to work with your Asset Availability Dashboard. The ESP32 will monitor asset states and send real-time updates to your dashboard.

## Prerequisites
- ESP32 development board
- Arduino IDE with ESP32 board support
- ArduinoJson library installed
- Your Asset Availability Dashboard backend running

## Required Libraries
Install these libraries in Arduino IDE:
1. **ArduinoJson** by Benoit Blanchon (version 6.x)
2. **WiFi** (built-in with ESP32)
3. **HTTPClient** (built-in with ESP32)

## Hardware Setup

### Pin Configuration
The code is configured for these assets and pins:
- **Production Line A**: GPIO Pin 2
- **Production Line B**: GPIO Pin 4  
- **Packaging Unit**: GPIO Pin 5

### Sensor Connections
```
ESP32 Pin    Asset Sensor    Connection
GPIO 2   →   Prod Line A  →  Sensor Output + Pull-up resistor
GPIO 4   →   Prod Line B  →  Sensor Output + Pull-up resistor
GPIO 5   →   Packaging    →  Sensor Output + Pull-up resistor
GND      →   All Sensors  →  Common Ground
3.3V     →   Sensors      →  Power (if needed)
```

### Sensor Logic
- **HIGH (3.3V)**: Asset is RUNNING
- **LOW (0V)**: Asset is STOPPED
- Built-in pull-up resistors are enabled

## Software Configuration

### 1. Update WiFi Credentials
```cpp
const char* WIFI_SSID = "YOUR_WIFI_NETWORK_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

### 2. Update Backend URL
Find your computer's IP address and update:
```cpp
const char* WEB_APP_URL = "http://YOUR_COMPUTER_IP:5000";
```

#### Finding Your Computer's IP Address:
**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

**Example:**
```cpp
const char* WEB_APP_URL = "http://192.168.1.100:5000";
```

### 3. Customize Assets (Optional)
Modify the assets array to match your setup:
```cpp
Asset assets[] = {
  {"Your Asset Name", GPIO_PIN, false, 0, 0, 0, 0},
  // Add more assets as needed
};
```

## Installation Steps

1. **Open Arduino IDE**
2. **Install ESP32 Board Support** (if not already done)
   - File → Preferences
   - Add to Additional Board Manager URLs: 
     `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools → Board → Boards Manager → Search "ESP32" → Install

3. **Install Required Libraries**
   - Tools → Manage Libraries
   - Search and install "ArduinoJson" by Benoit Blanchon

4. **Load the Code**
   - Open `ESP32_AssetLogger_Patched.ino`
   - Update WiFi credentials and backend URL
   - Select your ESP32 board: Tools → Board → ESP32 Dev Module
   - Select correct COM port: Tools → Port

5. **Upload and Test**
   - Click Upload button
   - Open Serial Monitor (115200 baud)
   - Watch for connection messages

## Expected Serial Output

```
ESP32 Asset Logger for Asset Availability Dashboard Starting...
Asset Production Line A initialized on pin 2
Asset Production Line B initialized on pin 4
Asset Packaging Unit initialized on pin 5
Connecting to WiFi.....
WiFi Connected!
IP address: 192.168.1.150
Testing Asset Availability Dashboard connection...
✓ Dashboard connection successful (HTTP 200)
Response: {"status":"ok","message":"Server is running"}
Sending initial asset states...
✓ Sent state update for Production Line A (HTTP 200)
✓ Sent state update for Production Line B (HTTP 200)
✓ Sent state update for Packaging Unit (HTTP 200)
✓ Heartbeat successful (HTTP 200)
```

## Dashboard Integration

### Real-time Updates
The ESP32 sends data to your dashboard via:
- **State Changes**: Immediate updates when assets start/stop
- **Periodic Updates**: Status every 5 seconds with runtime data
- **Heartbeat**: Health check every 30 seconds

### Data Sent to Dashboard
```json
{
  "asset_name": "Production Line A",
  "pin_number": 2,
  "is_running": true,
  "timestamp": "12345678",
  "total_runtime": 150000,
  "total_downtime": 50000,
  "wifi_rssi": -45,
  "free_heap": 200000,
  "uptime": 300000
}
```

## Troubleshooting

### WiFi Connection Issues
- Verify SSID and password are correct
- Check if WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)
- Ensure network allows new device connections

### Backend Connection Issues
- Verify backend server is running on port 5000
- Check computer's IP address hasn't changed
- Ensure Windows Firewall allows connections on port 5000
- Try accessing `http://YOUR_IP:5000/api/health` in browser

### Dashboard Not Updating
- Check Serial Monitor for HTTP response codes
- Verify asset names match between ESP32 and dashboard
- Ensure backend server is receiving requests (check backend logs)

### Adding Firewall Exception (Windows)
1. Windows Security → Firewall & network protection
2. Allow an app through firewall
3. Add Node.js or allow port 5000

## Monitoring and Debugging

### Serial Monitor Commands
The ESP32 provides detailed logging:
- Connection status
- Asset state changes
- HTTP response codes
- Runtime statistics

### Dashboard Verification
Check your dashboard at `http://localhost:3000` to see:
- Real-time asset status updates
- Asset state changes reflected immediately
- System metrics updating based on ESP32 data

## Advanced Configuration

### Adding More Assets
1. Add new entry to assets array
2. Configure GPIO pin
3. Update pin configuration in setup()
4. Ensure dashboard recognizes the new asset name

### Adjusting Update Intervals
```cpp
const unsigned long HEARTBEAT_INTERVAL = 30000;      // 30 seconds
const unsigned long STATUS_UPDATE_INTERVAL = 5000;   // 5 seconds
```

### Custom Sensor Logic
Modify the sensor reading logic if using different sensor types:
```cpp
bool currentState = digitalRead(assets[i].pin) == HIGH; // Active high
// or
bool currentState = digitalRead(assets[i].pin) == LOW;  // Active low
```

## Support
If you encounter issues:
1. Check Serial Monitor output
2. Verify all connections
3. Test backend connectivity manually
4. Check dashboard logs for incoming data