# Complete Asset Availability System Setup Guide

## 🎯 **System Overview**

This system provides **real-time asset monitoring** with both **standalone ESP32 functionality** and **centralized server analytics**. You get the best of both worlds:

- ✅ **Robust standalone operation** (works without server)
- ✅ **Real-time server integration** (live updates, analytics)
- ✅ **User-specific databases** (multi-tenant support)
- ✅ **Asset availability reports** (comprehensive analytics)
- ✅ **Local and remote monitoring** (OLED + web dashboard)

---

## 🚀 **Quick Start (5 Minutes)**

### **Step 1: Start the Server**
```bash
# Backend (Terminal 1)
cd "c:\Users\Simon\OneDrive\Desktop\Trea Demo\src\backend"
npm start

# Frontend (Terminal 2) 
cd "c:\Users\Simon\OneDrive\Desktop\Trea Demo\src\frontend"
npm start
```

### **Step 2: Access the System**
- **Web Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:5000

### **Step 3: Configure ESP32**
1. Update `WEB_APP_URL` in `ESP32_AssetLogger_Enhanced.ino` with your server IP
2. Flash the code to your ESP32
3. Connect to "ESP32-AssetLogger" WiFi network for initial setup

---

## 📋 **Detailed Setup Instructions**

### **Backend Server Setup**

1. **Install Dependencies**:
   ```bash
   cd src/backend
   npm install
   ```

2. **Start Backend**:
   ```bash
   npm start
   ```
   - Server runs on port 5000
   - Listens on all interfaces (0.0.0.0)
   - Memory-based database (no external DB required)

### **Frontend Dashboard Setup**

1. **Install Dependencies**:
   ```bash
   cd src/frontend  
   npm install
   ```

2. **Start Frontend**:
   ```bash
   npm start
   ```
   - Dashboard runs on port 3000
   - Automatically opens in browser

### **ESP32 Hardware Setup**

1. **Required Components**:
   - ESP32 development board
   - OLED display (128x64, I2C, SSD1306)
   - Asset sensors (digital inputs)
   - Breadboard and jumper wires

2. **Wiring Connections**:
   ```
   OLED Display:
   - VCC → 3.3V
   - GND → GND  
   - SDA → GPIO 21
   - SCL → GPIO 22
   
   Asset Sensors (Digital Inputs):
   - Pin 2  → Production Line A
   - Pin 4  → Production Line B
   - Pin 5  → Packaging Unit
   - Pin 18 → Quality Control
   - Pin 19 → Conveyor Belt 1
   - Pin 21 → Conveyor Belt 2
   - Pin 22 → Robotic Arm
   - Pin 23 → Inspection Station
   ```

3. **Arduino IDE Setup**:
   ```
   Required Libraries:
   - WiFi (ESP32 Core)
   - WebServer (ESP32 Core)
   - SPIFFS (ESP32 Core)
   - Preferences (ESP32 Core)
   - WiFiManager by tzapu
   - ArduinoJson by Benoit Blanchon
   - Adafruit GFX Library
   - Adafruit SSD1306
   ```

4. **Configuration**:
   - Update `LOGGER_ID` (unique identifier)
   - Update `LOGGER_NAME` (descriptive name)
   - Update `WEB_APP_URL` (your server IP:5000)
   - Modify `ASSET_NAMES` array for your equipment

---

## 🔧 **System Configuration**

### **Device Registration (Automatic)**

The ESP32 automatically registers with the server on startup:

```cpp
// Registration happens automatically in setup()
registerWithServer();
```

**Registration Data**:
- Logger ID and Name
- Firmware Version
- IP Address
- Asset Configuration
- Heartbeat Interval

### **Manual Device Management**

You can also manage devices through the web interface:

1. **Access Configuration**: http://localhost:3000/config
2. **Add New Logger**: Click "Register New Logger"
3. **Fill Details**:
   - Logger ID (must match ESP32)
   - Name and Description
   - Location
   - WiFi Credentials (optional)
   - Server URL

### **Asset Configuration**

Assets are automatically configured based on the ESP32 code:

```cpp
const char* ASSET_NAMES[MAX_ASSETS] = {
  "Production Line A",    // Pin 2
  "Production Line B",    // Pin 4
  "Packaging Unit",       // Pin 5
  // ... add your assets
};
```

---

## 📊 **Real-time Data Flow**

### **Asset State Updates**

```mermaid
ESP32 → Server → Frontend → Users
```

1. **ESP32 Detection**: Monitors digital pins every second
2. **State Change**: Detects RUNNING ↔ STOPPED transitions  
3. **Server Update**: Sends real-time update via HTTP POST
4. **Database Storage**: Stores event with timestamp and duration
5. **Live Broadcast**: WebSocket pushes to all connected clients
6. **Dashboard Update**: Frontend updates in real-time

### **Data Persistence**

- **Server Database**: All events stored with user association
- **Local Logging**: ESP32 logs to SPIFFS as backup
- **Analytics Ready**: Data structured for availability reports

---

## 📈 **Analytics & Reporting**

### **Available Metrics**

- **Asset Availability %**: Runtime / (Runtime + Downtime) × 100
- **Total Runtime**: Cumulative running time
- **Total Downtime**: Cumulative stopped time  
- **Stop Count**: Number of stop events
- **MTBF**: Mean Time Between Failures
- **MTTR**: Mean Time To Repair
- **Short vs Long Stops**: Configurable thresholds

### **Real-time Dashboard**

- **Live Asset Status**: Current state of all assets
- **Availability Gauges**: Real-time availability percentages
- **Event Timeline**: Recent start/stop events
- **Performance Charts**: Historical trends
- **Alert System**: Notifications for extended downtime

---

## 🔍 **Monitoring & Troubleshooting**

### **System Health Checks**

1. **ESP32 Status**:
   - Local web interface: http://[ESP32_IP]
   - OLED display shows system status
   - Serial monitor for debug output

2. **Server Status**:
   - Backend logs show device connections
   - Debug endpoints: `/api/debug/database`
   - WebSocket connection status

3. **Frontend Status**:
   - Browser console for errors
   - Network tab for API calls
   - Real-time connection indicator

### **Common Issues & Solutions**

**ESP32 Won't Connect to WiFi**:
- Connect to "ESP32-AssetLogger" network
- Configure WiFi through captive portal
- Check WiFi credentials and signal strength

**Server Registration Fails**:
- Verify server IP in `WEB_APP_URL`
- Check firewall settings (port 5000)
- Ensure server is running and accessible

**No Real-time Updates**:
- Check WebSocket connection in browser
- Verify ESP32 is sending heartbeats
- Check server logs for errors

**Frontend 500 Errors**:
- ✅ **FIXED**: Now uses hybrid authentication
- Works with or without user login
- Fallback to public device endpoints

---

## 🔐 **Security & Authentication**

### **Hybrid Authentication System**

The system now supports both authenticated and unauthenticated access:

- **Logged-in Users**: Full access with user-specific data
- **Device Management**: Public endpoints for device registration
- **ESP32 Communication**: No authentication required
- **Data Isolation**: User-specific databases when authenticated

### **Production Considerations**

For production deployment:

1. **Enable HTTPS**: Use SSL certificates
2. **API Authentication**: Implement API keys for ESP32
3. **User Management**: Set up proper user registration
4. **Database**: Migrate to persistent database (PostgreSQL/MongoDB)
5. **Monitoring**: Add system monitoring and alerting

---

## 🎯 **Success Verification**

### **Complete System Test**

1. **Start Services**: Backend + Frontend running
2. **ESP32 Online**: Shows "WiFi Srv" on OLED
3. **Device Registered**: Appears in web dashboard
4. **Asset Monitoring**: Pin state changes trigger updates
5. **Real-time Updates**: Dashboard shows live state changes
6. **Data Persistence**: Events stored and retrievable
7. **Analytics Working**: Availability calculations updating

### **Expected Behavior**

- **ESP32 OLED**: Cycles through asset status every 2 seconds
- **Web Dashboard**: Shows real-time asset states
- **Server Logs**: Shows heartbeats and state updates
- **Local Interface**: ESP32 web interface accessible
- **Data Flow**: Events flow from ESP32 → Server → Dashboard

---

## 🚀 **Next Steps**

1. **Customize Assets**: Update asset names and pin assignments
2. **Add More Loggers**: Deploy multiple ESP32s with unique IDs
3. **Configure Alerts**: Set up notifications for downtime
4. **Historical Reports**: Generate availability reports
5. **Scale Up**: Add more assets and production lines

---

## 📞 **Support**

If you encounter issues:

1. **Check Logs**: Backend console and ESP32 serial monitor
2. **Verify Network**: Ensure all devices can communicate
3. **Test Endpoints**: Use browser/Postman to test API
4. **Debug Mode**: Enable verbose logging in ESP32 code

The system is designed to be robust and self-healing. ESP32 devices work standalone and automatically reconnect to the server when available.

---

**🎉 You now have a complete real-time asset monitoring system with both standalone reliability and centralized analytics!**