const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');

// Get all loggers for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const loggers = await databaseService.getLoggersByUserId(userId);
    res.json(loggers);
  } catch (error) {
    console.error('Error fetching loggers:', error);
    res.status(500).json({ error: 'Failed to fetch loggers' });
  }
});

// Get a specific logger by ID
router.get('/:id', async (req, res) => {
  try {
    const logger = await databaseService.findLoggerById(req.params.id);
    if (!logger) {
      return res.status(404).json({ error: 'Logger not found' });
    }

    // Check if user has access to this logger
    const userId = req.user?.id;
    if (logger.user_account_id != userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(logger);
  } catch (error) {
    console.error('Error fetching logger:', error);
    res.status(500).json({ error: 'Failed to fetch logger' });
  }
});

// Register a new logger
router.post('/register', async (req, res) => {
  try {
    const { logger_id, logger_name } = req.body;
    const userId = req.user?.id;

    if (!logger_id) {
      return res.status(400).json({ error: 'Logger ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if logger ID already exists
    const existingLogger = await databaseService.findLoggerByLoggerId(logger_id);
    if (existingLogger) {
      return res.status(409).json({ error: 'Logger ID already registered' });
    }

    const loggerData = {
      logger_id,
      user_account_id: userId,
      logger_name: logger_name || `Logger ${logger_id}`,
      status: 'offline'
    };

    const newLogger = await databaseService.createLogger(loggerData);
    res.status(201).json(newLogger);
  } catch (error) {
    console.error('Error registering logger:', error);
    res.status(500).json({ error: 'Failed to register logger' });
  }
});

// Update logger information
router.put('/:id', async (req, res) => {
  try {
    const logger = await databaseService.findLoggerById(req.params.id);
    if (!logger) {
      return res.status(404).json({ error: 'Logger not found' });
    }

    // Check if user has access to this logger
    const userId = req.user?.id;
    if (logger.user_account_id != userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = req.body;
    delete updates._id; // Prevent ID modification
    delete updates.id; // Prevent ID modification
    delete updates.logger_id; // Prevent logger_id modification
    delete updates.user_account_id; // Prevent user_account_id modification

    const updatedLogger = await databaseService.updateLogger(req.params.id, updates);
    res.json(updatedLogger);
  } catch (error) {
    console.error('Error updating logger:', error);
    res.status(500).json({ error: 'Failed to update logger' });
  }
});

// Delete a logger
router.delete('/:id', async (req, res) => {
  try {
    const logger = await databaseService.findLoggerById(req.params.id);
    if (!logger) {
      return res.status(404).json({ error: 'Logger not found' });
    }

    // Check if user has access to this logger
    const userId = req.user?.id;
    if (logger.user_account_id != userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const deleted = await databaseService.deleteLogger(req.params.id);
    if (deleted) {
      res.json({ message: 'Logger deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete logger' });
    }
  } catch (error) {
    console.error('Error deleting logger:', error);
    res.status(500).json({ error: 'Failed to delete logger' });
  }
});

// Logger heartbeat/status update endpoint (for ESP32)
router.post('/heartbeat', async (req, res) => {
  try {
    const { logger_id, status, firmware_version } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!logger_id) {
      return res.status(400).json({ error: 'Logger ID is required' });
    }

    const logger = await databaseService.findLoggerByLoggerId(logger_id);
    if (!logger) {
      return res.status(404).json({ error: 'Logger not registered' });
    }

    // Update logger status
    const updatedLogger = await databaseService.updateLoggerStatus(logger_id, status || 'online', clientIP);
    
    // Update firmware version if provided
    if (firmware_version && firmware_version !== logger.firmware_version) {
      await databaseService.updateLogger(logger.id || logger._id, { firmware_version });
    }

    res.json({ 
      message: 'Heartbeat received',
      logger_id: logger.logger_id,
      status: updatedLogger.status,
      last_seen: updatedLogger.last_seen
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

// Get logger configuration (for ESP32)
router.get('/config/:logger_id', async (req, res) => {
  try {
    const { logger_id } = req.params;
    
    const logger = await databaseService.findLoggerByLoggerId(logger_id);
    if (!logger) {
      return res.status(404).json({ error: 'Logger not registered' });
    }

    // Get assets for this logger
    const assets = await databaseService.getAssetsByLoggerId(logger.id || logger._id);
    
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
    console.error('Error fetching logger config:', error);
    res.status(500).json({ error: 'Failed to fetch logger configuration' });
  }
});

// Get assets for a specific logger
router.get('/:id/assets', async (req, res) => {
  try {
    const logger = await databaseService.findLoggerById(req.params.id);
    if (!logger) {
      return res.status(404).json({ error: 'Logger not found' });
    }

    // Check if user has access to this logger
    const userId = req.user?.id;
    if (logger.user_account_id != userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assets = await databaseService.getAssetsByLoggerId(req.params.id);
    res.json(assets);
  } catch (error) {
    console.error('Error fetching logger assets:', error);
    res.status(500).json({ error: 'Failed to fetch logger assets' });
  }
});

module.exports = router;