# ESP32 Logger Registration Fix

## Issue Resolved
The ESP32 was getting HTTP 401 authentication errors when trying to register with the backend because it was using authenticated endpoints that require user login credentials.

## Root Cause
- ESP32 was calling `/api/loggers/register` (requires authentication)
- ESP32 was calling `/api/loggers/heartbeat` (requires authentication)
- ESP32 devices don't have user credentials for authentication

## Solution Applied
Updated the ESP32 code to use the correct unauthenticated device endpoints:

### Changes Made to `ESP32_AssetLogger_Patched.ino`:

1. **Registration Endpoint Fixed**:
   ```cpp
   // OLD (requires authentication):
   http.begin(String(WEB_APP_URL) + "/api/loggers/register");
   
   // NEW (no authentication required):
   http.begin(String(WEB_APP_URL) + "/api/device/register");
   ```

2. **Heartbeat Endpoint Fixed**:
   ```cpp
   // OLD (requires authentication):
   http.begin(String(WEB_APP_URL) + "/api/loggers/heartbeat");
   
   // NEW (no authentication required):
   http.begin(String(WEB_APP_URL) + "/api/device/heartbeat");
   ```

## Expected Behavior After Fix

When you upload the updated ESP32 code, you should see:

```
Connecting to WiFi...
WiFi Connected!
IP address: 192.168.x.x
Setting up NTP time synchronization...
NTP time sync successful!
Current local time (GMT/BST): [current time]
Testing Asset Availability Dashboard connection...
✓ Dashboard connection successful (HTTP 200)
Registering logger with dashboard...
✓ Logger registered successfully (HTTP 200 or 201)
Sending initial asset states...
✓ Sent state update for Production Line A: STOPPED (HTTP 200)
✓ Sent state update for Production Line B: STOPPED (HTTP 200)
✓ Sent state update for Packaging Unit: STOPPED (HTTP 200)
Setup complete. Starting monitoring...
```

## Verification Steps

1. **Check ESP32 Serial Monitor**: Should show successful registration without HTTP 401 errors
2. **Check Backend Logs**: Should show "Device registered: ESP32_001 (Production Floor Logger)"
3. **Check Web Dashboard**: Go to Config → Logger Management to see the registered ESP32
4. **Test Heartbeat**: ESP32 should send heartbeats every 30 seconds successfully

## Backend Endpoints Used

- **Device Registration**: `POST /api/device/register` (no auth required)
- **Device Heartbeat**: `POST /api/device/heartbeat` (no auth required)
- **Asset State Updates**: `POST /api/asset-state` (no auth required)

## Next Steps

1. Upload the updated `ESP32_AssetLogger_Patched.ino` to your ESP32
2. Update the WiFi credentials and backend URL in the code
3. Monitor the serial output to confirm successful registration
4. Check the web dashboard to see your ESP32 logger listed

The ESP32 should now register successfully and start sending asset state updates to the dashboard!