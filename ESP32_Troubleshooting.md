# ESP32 Troubleshooting Guide

## Current Issue: HTTP -1 Connection Errors

### ✅ **SOLUTION APPLIED**
Updated ESP32 code with correct IP address: **192.168.0.63**

### 🔧 **Next Steps:**

1. **Re-upload the ESP32 Code**
   - Open the updated `ESP32_AssetLogger_Patched.ino` file
   - Make sure your WiFi credentials are set:
     ```cpp
     const char* WIFI_SSID = "YOUR_ACTUAL_WIFI_NAME";
     const char* WIFI_PASSWORD = "YOUR_ACTUAL_WIFI_PASSWORD";
     ```
   - Upload the code to your ESP32
   - Open Serial Monitor (115200 baud)

2. **Expected Serial Output After Fix:**
   ```
   ESP32 Asset Logger for Asset Availability Dashboard Starting...
   Asset Production Line A initialized on pin 2
   Asset Production Line B initialized on pin 4
   Asset Packaging Unit initialized on pin 5
   Connecting to WiFi.....
   WiFi Connected!
   IP address: 192.168.0.XXX
   Testing Asset Availability Dashboard connection...
   ✓ Dashboard connection successful (HTTP 200)
   Response: {"status":"ok","message":"Server is running"}
   Sending initial asset states...
   ✓ Sent state update for Production Line A (HTTP 200)
   ✓ Sent state update for Production Line B (HTTP 200)
   ✓ Sent state update for Packaging Unit (HTTP 200)
   ✓ Heartbeat successful (HTTP 200)
   ```

## 🚨 **Common HTTP Error Codes:**

- **HTTP -1**: Connection failed (network/IP issue) ← **Your current issue**
- **HTTP 404**: Endpoint not found
- **HTTP 500**: Server error
- **HTTP 200**: Success ✅

## 🔍 **Troubleshooting Checklist:**

### ✅ Backend Server Status
- [x] Backend running on port 5000
- [x] Health endpoint accessible: http://192.168.0.63:5000/api/health
- [x] Correct IP address identified: 192.168.0.63

### 🔧 ESP32 Configuration
- [ ] WiFi credentials updated in code
- [ ] IP address updated to 192.168.0.63
- [ ] Code re-uploaded to ESP32
- [ ] ESP32 connected to same WiFi network

### 🌐 Network Requirements
- [ ] ESP32 and computer on same WiFi network
- [ ] WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)
- [ ] Windows Firewall allows port 5000

## 🛠️ **Additional Checks:**

### Test Backend Manually
```bash
# Test from command line
curl http://192.168.0.63:5000/api/health

# Expected response:
{"status":"ok","message":"Server is running"}
```

### Windows Firewall Setup
1. Windows Security → Firewall & network protection
2. Allow an app through firewall
3. Add Node.js or allow port 5000

### WiFi Network Check
- Ensure ESP32 connects to same network as computer
- Check router settings for device isolation
- Verify 2.4GHz band is available

## 📊 **Expected Dashboard Behavior:**
Once connected, you should see:
- Real-time asset status updates
- Asset state changes reflected immediately
- System metrics updating from ESP32 data
- No more HTTP -1 errors in Serial Monitor

## 🆘 **If Still Having Issues:**
1. Check Serial Monitor for WiFi connection status
2. Verify IP address hasn't changed: `ipconfig`
3. Test backend accessibility: `curl http://192.168.0.63:5000/api/health`
4. Ensure ESP32 and computer are on same network
5. Check Windows Firewall settings