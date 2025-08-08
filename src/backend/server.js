const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Using in-memory database for development
console.log('Using in-memory database for development - server starting...');

// Import routes
const assetRoutes = require('./routes/assetRoutes');
const authRoutes = require('./routes/authRoutes');
const configRoutes = require('./routes/configRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const archiveRoutes = require('./routes/archiveRoutes');
const eventRoutes = require('./routes/eventRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes = require('./routes/userRoutes');
const backupRoutes = require('./routes/backupRoutes');
const loggerRoutes = require('./routes/loggerRoutes');

// Import middleware
const { authenticateJWT } = require('./middleware/authMiddleware');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/assets', assetRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/config', authenticateJWT, configRoutes);
app.use('/api/analytics', authenticateJWT, analyticsRoutes);
app.use('/api/archives', authenticateJWT, archiveRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', authenticateJWT, reportRoutes);
app.use('/api/settings', authenticateJWT, settingsRoutes);
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/users', authenticateJWT, userRoutes);
app.use('/api/backups', authenticateJWT, backupRoutes);
// Device endpoints (ESP32) - No authentication required

// Public endpoint to list all devices (for device management)
app.get('/api/device/list', (req, res) => {
  try {
    const memoryDB = require('./utils/memoryDB');
    const loggers = memoryDB.getAllLoggers();
    
    // Format loggers for frontend compatibility
    const formattedLoggers = loggers.map(logger => ({
      ...logger,
      name: logger.logger_name,
      description: logger.description || '',
      location: logger.location || '',
      wifi_ssid: logger.wifi_ssid || '',
      wifi_password: logger.wifi_password || '',
      server_url: logger.server_url || 'http://localhost:5000',
      heartbeat_interval: logger.heartbeat_interval || 30
    }));
    
    res.json(formattedLoggers);
  } catch (error) {
    console.error('Error fetching device list:', error);
    res.status(500).json({ error: 'Failed to fetch device list' });
  }
});

app.post('/api/device/register', (req, res) => {
  try {
    const { logger_id, logger_name, firmware_version, ip_address } = req.body;
    const memoryDB = require('./utils/memoryDB');

    if (!logger_id) {
      return res.status(400).json({ error: 'Logger ID is required' });
    }

    // Check if logger ID already exists
    const existingLogger = memoryDB.findLoggerByLoggerId(logger_id);
    if (existingLogger) {
      // Update existing logger with new info
      const updatedLogger = memoryDB.updateLogger(existingLogger._id, {
        firmware_version: firmware_version || existingLogger.firmware_version,
        ip_address: ip_address || existingLogger.ip_address,
        status: 'online',
        last_seen: new Date()
      });
      return res.status(200).json({ 
        message: 'Logger updated successfully',
        logger: updatedLogger 
      });
    }

    // For new loggers, we need to assign them to a default user
    // In a real system, you'd have a proper device registration flow
    // For now, we'll assign to the first available user or create a default one
    const users = memoryDB.getAllUsers();
    let defaultUser = users.find(u => u.email === 'admin@example.com');
    
    if (!defaultUser) {
      // Create a default admin user for device registration
      defaultUser = memoryDB.createUser({
        name: 'System Admin',
        email: 'admin@example.com',
        password: 'hashed_password', // This would be properly hashed
        role: 'admin'
      });
    }

    const loggerData = {
      logger_id,
      user_account_id: defaultUser._id,
      logger_name: logger_name || `Logger ${logger_id}`,
      firmware_version: firmware_version || '1.0.0',
      ip_address: ip_address || 'unknown',
      status: 'online',
      last_seen: new Date()
    };

    const newLogger = memoryDB.createLogger(loggerData);
    console.log(`Device registered: ${logger_id} (${logger_name})`);
    
    res.status(201).json({ 
      message: 'Logger registered successfully',
      logger: newLogger 
    });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Public endpoint to update device (for device management)
app.put('/api/device/update/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const memoryDB = require('./utils/memoryDB');
    
    // Map frontend fields to backend fields
    if (updateData.name) {
      updateData.logger_name = updateData.name;
    }
    
    const updatedLogger = memoryDB.updateLogger(id, updateData);
    if (!updatedLogger) {
      return res.status(404).json({ error: 'Logger not found' });
    }
    
    res.json({ 
      message: 'Logger updated successfully',
      logger: updatedLogger 
    });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// Public endpoint to delete device (for device management)
app.delete('/api/device/delete/:id', (req, res) => {
  try {
    const { id } = req.params;
    const memoryDB = require('./utils/memoryDB');
    
    const deleted = memoryDB.deleteLogger(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Logger not found' });
    }
    
    res.json({ message: 'Logger deleted successfully' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

app.post('/api/device/heartbeat', (req, res) => {
  try {
    const { logger_id, status, firmware_version, wifi_rssi, free_heap, uptime } = req.body;
    const memoryDB = require('./utils/memoryDB');
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!logger_id) {
      return res.status(400).json({ error: 'Logger ID is required' });
    }

    const logger = memoryDB.findLoggerByLoggerId(logger_id);
    if (!logger) {
      return res.status(404).json({ error: 'Logger not registered. Please register first.' });
    }

    // Update logger status and metadata
    const updateData = {
      status: status || 'online',
      last_seen: new Date(),
      ip_address: clientIP
    };

    if (firmware_version && firmware_version !== logger.firmware_version) {
      updateData.firmware_version = firmware_version;
    }

    const updatedLogger = memoryDB.updateLogger(logger._id, updateData);
    
    console.log(`Heartbeat from ${logger_id}: ${status || 'online'} (RSSI: ${wifi_rssi}, Heap: ${free_heap})`);

    res.json({ 
      message: 'Heartbeat received',
      logger_id: logger.logger_id,
      status: updatedLogger.status,
      last_seen: updatedLogger.last_seen
    });
  } catch (error) {
    console.error('Error processing device heartbeat:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

app.get('/api/device/config/:logger_id', (req, res) => {
  try {
    const { logger_id } = req.params;
    const memoryDB = require('./utils/memoryDB');
    
    const logger = memoryDB.findLoggerByLoggerId(logger_id);
    if (!logger) {
      return res.status(404).json({ error: 'Logger not registered' });
    }

    // Get assets for this logger
    const assets = memoryDB.getAssetsByLoggerId(logger._id);
    
    // Format configuration for ESP32
    const config = {
      logger_id: logger.logger_id,
      logger_name: logger.logger_name,
      assets: assets.map(asset => ({
        pin_number: asset.pin_number,
        asset_name: asset.name,
        short_stop_threshold: asset.short_stop_threshold,
        long_stop_threshold: asset.long_stop_threshold
      })),
      heartbeat_interval: 30000, // 30 seconds
      server_url: `${req.protocol}://${req.get('host')}`
    };

    res.json(config);
  } catch (error) {
    console.error('Error fetching device config:', error);
    res.status(500).json({ error: 'Failed to fetch device configuration' });
  }
});

// Debug endpoint to check database state
app.get('/api/debug/database', (req, res) => {
  try {
    const memoryDB = require('./utils/memoryDB');
    const debug = {
      users: memoryDB.users,
      loggers: memoryDB.getAllLoggers(),
      assets: memoryDB.getAllAssets()
    };
    res.json(debug);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check current user
app.get('/api/debug/user', authenticateJWT, (req, res) => {
  try {
    res.json({
      currentUser: req.user,
      token: req.headers.authorization
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to clear all events
app.post('/api/debug/clear-events', (req, res) => {
  try {
    const memoryDB = require('./utils/memoryDB');
    const count = memoryDB.clearAllEvents();
    res.json({ 
      success: true, 
      message: `Cleared ${count} events from database` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Authenticated logger routes (for web dashboard)
app.use('/api/loggers', authenticateJWT, loggerRoutes);

// ESP32 asset state update endpoint
app.post('/api/asset-state', (req, res) => {
  const { logger_id, pin_number, is_running, timestamp } = req.body;
  
  if (!logger_id || pin_number === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: 'logger_id and pin_number are required' 
    });
  }

  try {
    const memoryDB = require('./utils/memoryDB');
    
    // Find the logger
    const logger = memoryDB.findLoggerByLoggerId(logger_id);
    if (!logger) {
      return res.status(404).json({ 
        success: false, 
        error: 'Logger not registered' 
      });
    }

    // Update logger status
    memoryDB.updateLoggerStatus(logger_id, 'online');

    // Find the asset by logger and pin
    const assets = memoryDB.getAssetsByLoggerId(logger._id);
    const asset = assets.find(a => a.pin_number == pin_number);
    
    if (!asset) {
      console.log(`No asset found for logger ${logger_id} pin ${pin_number}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Asset not found for this logger and pin' 
      });
    }

    const newState = is_running ? 'RUNNING' : 'STOPPED';
    const eventTimestamp = timestamp ? new Date(timestamp) : new Date();
    
    console.log(`Received update from Logger ${logger_id} - ${asset.name}: ${newState}`);

    // Calculate duration since last state change
    const lastStateChange = new Date(asset.last_state_change);
    const duration = Math.floor((eventTimestamp - lastStateChange) / 1000); // seconds

    // Calculate updated runtime/downtime based on previous state
    let updatedRuntime = asset.runtime || 0;
    let updatedDowntime = asset.downtime || 0;
    let updatedTotalStops = asset.total_stops || 0;

    // Always accumulate time based on the PREVIOUS state (what the asset was doing since last update)
    if (duration > 0) {
      if (asset.current_state === 'RUNNING') {
        updatedRuntime += duration * 1000; // Convert to milliseconds for consistency
      } else if (asset.current_state === 'STOPPED') {
        updatedDowntime += duration * 1000; // Convert to milliseconds for consistency
      }
    }

    // If transitioning to STOPPED, increment stop count
    if (newState === 'STOPPED' && asset.current_state === 'RUNNING') {
      updatedTotalStops += 1;
    }

    // Calculate availability percentage
    const totalTime = updatedRuntime + updatedDowntime;
    const availabilityPercentage = totalTime > 0 ? (updatedRuntime / totalTime) * 100 : 0;

    // Update asset state with new runtime/downtime values
    console.log(`📊 Before update - ${asset.name}: runtime=${asset.runtime}ms, downtime=${asset.downtime}ms, stops=${asset.total_stops}`);
    console.log(`📊 Updating with: runtime=${updatedRuntime}ms, downtime=${updatedDowntime}ms, stops=${updatedTotalStops}`);
    
    const updatedAsset = memoryDB.updateAsset(asset._id, {
      current_state: newState,
      last_state_change: eventTimestamp,
      runtime: updatedRuntime,
      downtime: updatedDowntime,
      total_stops: updatedTotalStops,
      availability_percentage: availabilityPercentage
    });
    
    console.log(`📊 After update - ${updatedAsset.name}: runtime=${updatedAsset.runtime}ms, downtime=${updatedAsset.downtime}ms, stops=${updatedAsset.total_stops}`);

    if (newState !== asset.current_state) {
      // Create event record only on state change
      const eventData = {
        asset: asset._id,
        asset_name: asset.name,
        logger_id: logger._id,
        event_type: newState === 'RUNNING' ? 'START' : 'STOP',
        state: newState,
        duration: duration,
        runtime: asset.current_state === 'RUNNING' ? duration : 0,
        downtime: asset.current_state === 'STOPPED' ? duration : 0,
        timestamp: eventTimestamp
      };

      // Determine if it's a short stop
      if (newState === 'STOPPED') {
        eventData.is_short_stop = duration <= (asset.short_stop_threshold || 300);
      }

      const event = memoryDB.createEvent(eventData);
      
      // Emit the state change to all connected clients only on actual change
      io.emit('asset_state_change', {
        asset_id: asset._id,
        asset_name: asset.name,
        logger_id: logger.logger_id,
        logger_name: logger.logger_name,
        pin_number: asset.pin_number,
        state: newState,
        duration: duration,
        is_short_stop: eventData.is_short_stop || false,
        timestamp: eventTimestamp.toISOString(),
        raw_timestamp: timestamp
      });
    }

    // Note: asset_update events are only for configuration changes, not state changes
    // Real-time state changes are handled by asset_state_change events
    
    res.status(200).json({ 
      success: true,
      asset_name: asset.name,
      state: newState,
      duration: duration
    });
  } catch (error) {
    console.error('Error processing asset state update:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../frontend', 'build', 'index.html'));
  });
}


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// --- BEGIN: Periodic Asset Runtime/Downtime Update ---
// REMOVE the previous setInterval block that creates events and updates runtime/downtime on every interval
// --- END: Periodic Asset Runtime/Downtime Update ---

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and listening on all interfaces`);
});