const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config({ path: __dirname + '/.env' });

// Import services and middleware
const databaseService = require('./services/databaseService');
const shiftScheduler = require('./services/shiftScheduler');
const csvEnhancementService = require('./services/csvEnhancementService');
const { authenticateJWT } = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const assetRoutes = require('./routes/assetRoutes');
const eventRoutes = require('./routes/eventRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const configRoutes = require('./routes/configRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const archiveRoutes = require('./routes/archiveRoutes');
const backupRoutes = require('./routes/backupRoutes');
const csvRoutes = require('./routes/csvRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const loggerRoutes = require('./routes/loggerRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const naturalLanguageReportRoutes = require('./routes/naturalLanguageReportRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateJWT, userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/events', authenticateJWT, eventRoutes);
app.use('/api/reports', authenticateJWT, reportRoutes);
app.use('/api/analytics', authenticateJWT, analyticsRoutes);
app.use('/api/settings', authenticateJWT, settingsRoutes);
app.use('/api/config', authenticateJWT, configRoutes);
app.use('/api/notifications', authenticateJWT, notificationRoutes);
app.use('/api/archives', authenticateJWT, archiveRoutes);
app.use('/api/backup', authenticateJWT, backupRoutes);
app.use('/api/csv', authenticateJWT, csvRoutes);
app.use('/api/shifts', authenticateJWT, shiftRoutes);
app.use('/api/loggers', authenticateJWT, loggerRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/reports/natural-language', authenticateJWT, naturalLanguageReportRoutes);

// Health check endpoint with database connectivity
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: 'unknown',
      type: process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  try {
    // Test database connectivity
    await databaseService.sequelize.authenticate();
    healthCheck.database.status = 'connected';
    
    // Import models for counting
    const { User, Logger, Asset } = require('./models/database');
    
    // Get basic database stats
    const [userCount, loggerCount, assetCount] = await Promise.all([
      User.count(),
      Logger.count(),
      Asset.count()
    ]);
    
    healthCheck.database.stats = {
      users: userCount,
      loggers: loggerCount,
      assets: assetCount
    };
    
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'ERROR';
    healthCheck.database.status = 'disconnected';
    healthCheck.database.error = error.message;
    
    res.status(503).json(healthCheck);
  }
});

// ESP32 device registration endpoint
app.post('/api/device/register', async (req, res) => {
  try {
    const { logger_id, logger_name, firmware_version, ip_address } = req.body;
    
    console.log('🔍 DEVICE REGISTRATION - Received data:', { logger_id, logger_name, firmware_version, ip_address });
    
    if (!logger_id) {
      console.log('❌ DEVICE REGISTRATION - Missing logger_id');
      return res.status(400).json({ error: 'Logger ID is required' });
    }

    // Check if logger already exists
    let logger = await databaseService.findLoggerByLoggerId(logger_id);
    
    if (logger) {
      // Update existing logger
      const updateData = {
        status: 'online',
        last_seen: new Date(),
        ip_address: ip_address || logger.ip_address,
        firmware_version: firmware_version || logger.firmware_version
      };
      
      if (logger_name && logger_name !== logger.logger_name) {
        updateData.logger_name = logger_name;
      }
      
      logger = await databaseService.updateLogger(logger.id, updateData);
      console.log(`✅ DEVICE REGISTRATION - Updated existing logger: ${logger_id}`);
    } else {
      // Create new logger (assign to admin user for now)
      const adminUser = await databaseService.findUserByEmail('admin@example.com');
      if (!adminUser) {
        console.log('❌ DEVICE REGISTRATION - Admin user not found');
        return res.status(500).json({ error: 'Admin user not found' });
      }

      const loggerData = {
        logger_id,
        logger_name: logger_name || `Logger ${logger_id}`,
        user_account_id: adminUser.id,
        status: 'online',
        ip_address: ip_address || 'unknown',
        firmware_version: firmware_version || '1.0.0',
        last_seen: new Date()
      };

      logger = await databaseService.createLogger(loggerData);
      console.log(`✅ DEVICE REGISTRATION - Created new logger: ${logger_id}`);
    }

    res.json({ 
      success: true,
      message: 'Logger registered successfully',
      logger: {
        id: logger.id,
        logger_id: logger.logger_id,
        logger_name: logger.logger_name,
        status: logger.status
      }
    });

  } catch (error) {
    console.error('❌ DEVICE REGISTRATION - Error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// ESP32 asset state update endpoint
app.post('/api/asset-state', async (req, res) => {
  try {
    const { logger_id, pin_number, state, is_running, timestamp } = req.body;
    
    console.log('🔍 ASSET STATE UPDATE - Received data:', { logger_id, pin_number, state, is_running, timestamp });
    
    if (!logger_id || pin_number === undefined) {
      console.log('❌ ASSET STATE UPDATE - Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: logger_id, pin_number' });
    }

    // Handle both state formats: 'state' (string) or 'is_running' (boolean)
    let assetState;
    if (state !== undefined) {
      assetState = state;
    } else if (is_running !== undefined) {
      assetState = is_running ? 'RUNNING' : 'STOPPED';
    } else {
      console.log('❌ ASSET STATE UPDATE - Missing state information');
      return res.status(400).json({ error: 'Missing state information: provide either state or is_running' });
    }

    // Find the logger
    const logger = await databaseService.findLoggerByLoggerId(logger_id);
    if (!logger) {
      console.log('❌ ASSET STATE UPDATE - Logger not found:', logger_id);
      return res.status(404).json({ error: 'Logger not found' });
    }

    // Update logger status and last seen
    await databaseService.updateLoggerStatus(logger_id, 'online');

    // Find the asset for this pin
    const asset = await databaseService.findAssetByLoggerAndPin(logger.id, pin_number);
    if (!asset) {
      console.log(`⚠️ ASSET STATE UPDATE - No asset configured for pin ${pin_number}, creating event anyway`);
      
      // Create event even if no asset is configured (for raw pin monitoring)
      const eventData = {
        logger_id: logger.id,
        event_type: 'STATE_CHANGE',
        previous_state: 'UNKNOWN',
        new_state: assetState,
        timestamp: new Date(timestamp || Date.now()),
        metadata: { 
          source: 'esp32', 
          pin_number,
          note: `Pin ${pin_number} state change (no asset configured)`
        }
      };

      await databaseService.createEvent(eventData);

      // Emit real-time update via WebSocket
      io.emit('pinStateChange', {
        loggerId: logger_id,
        pinNumber: pin_number,
        newState: assetState,
        timestamp: eventData.timestamp,
        note: 'No asset configured for this pin'
      });

      return res.json({ 
        success: true, 
        message: 'Pin state recorded (no asset configured)',
        pin_number,
        state: assetState
      });
    }

    console.log('✅ ASSET STATE UPDATE - Found asset:', asset.name);

    // Check if we need to auto-start a shift (if no active shift exists)
    const currentShift = await shiftScheduler.getCurrentShift();
    if (!currentShift) {
      console.log('🔄 No active shift detected, auto-starting new shift...');
      try {
        await shiftScheduler.startShiftManually(
          `Auto-started - ${new Date().toLocaleString()}`,
          'Automatically started due to asset activity'
        );
        
        // Emit shift update to all connected clients
        io.emit('shift_update', await shiftScheduler.getCurrentShift());
        console.log('✅ Auto-started new shift due to asset activity');
      } catch (error) {
        console.error('❌ Failed to auto-start shift:', error.message);
      }
    }

    // Update asset state if it has changed
    if (asset.current_state !== assetState) {
      const previousState = asset.current_state;
      const currentTime = new Date(timestamp || Date.now());
      const lastStateChange = new Date(asset.last_state_change);
      
      // Calculate duration since last state change (in seconds)
      const durationSeconds = Math.floor((currentTime - lastStateChange) / 1000);
      
      // Update runtime/downtime statistics
      let updateData = {
        current_state: assetState,
        last_state_change: currentTime
      };

      // Only accumulate time if we have a valid previous state and duration
      if (previousState && durationSeconds > 0) {
        if (previousState === 'RUNNING') {
          // Asset was running, add to runtime
          updateData.runtime = (asset.runtime || 0) + durationSeconds;
          console.log(`📊 Adding ${durationSeconds}s to runtime (was RUNNING)`);
        } else if (previousState === 'STOPPED') {
          // Asset was stopped, add to downtime
          updateData.downtime = (asset.downtime || 0) + durationSeconds;
          console.log(`📊 Adding ${durationSeconds}s to downtime (was STOPPED)`);
        }
      }

      // Increment stop count if transitioning to STOPPED
      if (assetState === 'STOPPED' && previousState === 'RUNNING') {
        updateData.total_stops = (asset.total_stops || 0) + 1;
        console.log(`📊 Incrementing stop count to ${updateData.total_stops}`);
      }

      // Calculate and update availability percentage
      const totalRuntime = updateData.runtime || asset.runtime || 0;
      const totalDowntime = updateData.downtime || asset.downtime || 0;
      const totalTime = totalRuntime + totalDowntime;
      
      if (totalTime > 0) {
        updateData.availability_percentage = ((totalRuntime / totalTime) * 100).toFixed(2);
      }

      // Update asset with accumulated statistics
      await databaseService.updateAsset(asset.id, updateData);

      // Create event record in SQL database with duration
      const eventData = {
        asset_id: asset.id,
        logger_id: logger.id,
        event_type: 'STATE_CHANGE',
        previous_state: previousState,
        new_state: assetState,
        duration: durationSeconds,
        timestamp: currentTime,
        metadata: { source: 'esp32', pin_number }
      };

      await databaseService.createEvent(eventData);

      // Emit real-time update via WebSocket
      io.emit('assetStateChange', {
        assetId: asset.id,
        assetName: asset.name,
        loggerId: logger_id,
        pinNumber: pin_number,
        previousState,
        newState: assetState,
        duration: durationSeconds,
        timestamp: eventData.timestamp,
        statistics: {
          runtime: totalRuntime,
          downtime: totalDowntime,
          total_stops: updateData.total_stops || asset.total_stops || 0,
          availability: updateData.availability_percentage || 0
        }
      });

      console.log(`✅ ASSET STATE UPDATE - Asset ${asset.name} changed from ${previousState} to ${assetState} (duration: ${durationSeconds}s)`);
    } else {
      console.log(`🔍 ASSET STATE UPDATE - Asset ${asset.name} state unchanged (${assetState})`);
    }

    res.json({ 
      success: true, 
      message: 'Asset state updated successfully',
      asset: {
        id: asset.id,
        name: asset.name,
        state: assetState
      }
    });

  } catch (error) {
    console.error('❌ ASSET STATE UPDATE - Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ESP32 heartbeat endpoint
app.post('/api/device/heartbeat', async (req, res) => {
  try {
    const { logger_id, status, timestamp, free_heap } = req.body;
    
    console.log('🔍 DEVICE HEARTBEAT - Received from:', logger_id);
    
    if (!logger_id) {
      console.log('❌ DEVICE HEARTBEAT - Missing logger_id');
      return res.status(400).json({ error: 'Logger ID is required' });
    }

    // Find the logger
    const logger = await databaseService.findLoggerByLoggerId(logger_id);
    if (!logger) {
      console.log('❌ DEVICE HEARTBEAT - Logger not found:', logger_id);
      return res.status(404).json({ error: 'Logger not found' });
    }

    // Update logger status and last seen
    await databaseService.updateLoggerStatus(logger_id, status || 'online');
    
    console.log(`✅ DEVICE HEARTBEAT - Updated logger ${logger_id} status`);
    
    res.json({ 
      success: true,
      message: 'Heartbeat received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ DEVICE HEARTBEAT - Error:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

// Fix endpoint to associate Bagger asset with ESP32_001 logger
app.post('/api/fix-bagger-logger', async (req, res) => {
  try {
    // Find the ESP32_001 logger
    const logger = await databaseService.findLoggerByLoggerId('ESP32_001');
    if (!logger) {
      return res.status(404).json({ error: 'ESP32_001 logger not found' });
    }

    // Find the Bagger asset
    const asset = await databaseService.findAssetByName('Bagger');
    if (!asset) {
      return res.status(404).json({ error: 'Bagger asset not found' });
    }

    // Update the asset to be associated with the ESP32_001 logger
    const updatedAsset = await databaseService.updateAsset(asset.id, {
      logger_id: logger.id
    });

    console.log(`✅ Fixed: Associated Bagger asset with ESP32_001 logger`);

    res.json({ 
      success: true, 
      message: 'Bagger asset now associated with ESP32_001 logger',
      asset: {
        id: updatedAsset.id,
        name: updatedAsset.name,
        pin_number: updatedAsset.pin_number,
        logger_id: updatedAsset.logger_id
      }
    });

  } catch (error) {
    console.error('❌ Error fixing Bagger logger association:', error);
    res.status(500).json({ error: 'Failed to fix asset association' });
  }
});

// Test endpoint for dashboard reset
app.post('/api/test/dashboard-reset', async (req, res) => {
  try {
    console.log('🧪 TEST: Manual dashboard reset triggered via API');
    
    // Import and trigger dashboard reset
    const shiftScheduler = require('./services/shiftScheduler');
    await shiftScheduler.triggerDashboardReset();
    
    console.log('✅ TEST: Dashboard reset completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Dashboard reset triggered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ TEST: Error triggering dashboard reset:', error);
    res.status(500).json({ error: 'Failed to trigger dashboard reset' });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current shift data to newly connected client
  try {
    const { Shift } = require('./models/database');
    const activeShift = await Shift.findOne({ 
      where: { status: 'active' }, 
      order: [['created_at', 'DESC']] 
    });
    
    if (activeShift) {
      const shiftData = {
        id: activeShift.id,
        name: activeShift.shift_name,
        start_time: activeShift.start_time,
        status: activeShift.status
      };
      
      console.log('📡 Sending current shift to new client:', shiftData.name);
      socket.emit('shift_update', shiftData);
    } else {
      console.log('📡 No active shift to send to new client');
    }
  } catch (error) {
    console.error('❌ Error sending current shift to client:', error.message);
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

// Wait for database initialization before starting server
const startServer = async () => {
  try {
    // Wait for database service to initialize
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (!databaseService.initialized && attempts < maxAttempts) {
      console.log(`⏳ Waiting for database initialization... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (!databaseService.initialized) {
      throw new Error('Database initialization timeout');
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite'}`);
      
      // Start background services
      shiftScheduler.initialize(io);
      csvEnhancementService.initialize();
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Export server and io for use in other modules
module.exports = { server, io };

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});