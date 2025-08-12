const databaseService = require('../services/databaseService');

// @desc    Get all assets
// @route   GET /api/assets
// @access  Public
exports.getAssets = async (req, res) => {
  try {
    console.log('🔍 GET /api/assets called');
    console.log('🔍 Database service useDatabase:', databaseService.useDatabase);
    
    let assets;
    
    // If user is authenticated
    if (req.user && req.user.id) {
      console.log('🔍 Authenticated user:', req.user.email, 'role:', req.user.role);
      // Admin users can see all assets
      if (req.user.role === 'admin') {
        assets = await databaseService.getAllAssets();
      } else {
        // Regular users see only their assets (for now, return all assets)
        assets = await databaseService.getAllAssets();
      }
    } else {
      console.log('🔍 No authenticated user, fetching all assets');
      // For public access, get all assets (backward compatibility)
      assets = await databaseService.getAllAssets();
    }
    
    console.log('🔍 Raw assets from database:', assets.length, 'assets found');
    
    // Enhance assets with logger information
    const enhancedAssets = await Promise.all(assets.map(async asset => {
      try {
        const logger = asset.logger_id ? await databaseService.findLoggerById(asset.logger_id) : null;
        return {
          ...asset.toJSON ? asset.toJSON() : asset, // Handle Sequelize instances
          logger_info: logger ? {
            logger_id: logger.logger_id,
            logger_name: logger.logger_name,
            status: logger.status,
            last_seen: logger.last_seen
          } : null
        };
      } catch (error) {
        console.error('🔍 Error enhancing asset:', asset.name, error.message);
        return {
          ...asset.toJSON ? asset.toJSON() : asset,
          logger_info: null
        };
      }
    }));
    
    // Sort assets by name
    enhancedAssets.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('🔍 Enhanced assets:', enhancedAssets.map(a => ({
      name: a.name,
      runtime: a.runtime,
      downtime: a.downtime,
      total_stops: a.total_stops,
      current_state: a.current_state
    })));
    
    res.status(200).json({
      success: true,
      total: enhancedAssets.length,
      assets: enhancedAssets
    });
  } catch (error) {
    console.error('🔍 GET /api/assets ERROR:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get single asset
// @route   GET /api/assets/:id
// @access  Public
exports.getAssetById = async (req, res) => {
  try {
    const asset = await databaseService.findAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: asset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Create new asset
// @route   POST /api/assets
// @access  Private (Admin, Manager)
exports.createAsset = async (req, res) => {
  try {
    const { 
      name, 
      pin_number, 
      description, 
      type,
      logger_id,
      short_stop_threshold,
      long_stop_threshold,
      downtime_reasons,
      // Ignore thresholds and settings for now as they're not in the model
      // thresholds,
      // settings
    } = req.body;
    
    console.log('🔍 CREATE ASSET DEBUG:');
    console.log('- Full request body:', JSON.stringify(req.body, null, 2));
    console.log('- logger_id received:', logger_id, 'type:', typeof logger_id);
    console.log('- pin_number received:', pin_number, 'type:', typeof pin_number);
    console.log('- req.user:', req.user);
    console.log('- databaseService.useDatabase:', databaseService.useDatabase);
    
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Asset name is required'
      });
    }
    
    // Check if asset with same name already exists
    const existingAsset = await databaseService.findAssetByName(name);
    
    if (existingAsset) {
      return res.status(400).json({
        success: false,
        message: 'Asset with this name already exists'
      });
    }

    let loggerInternalId = null;
    
    // Validate logger if provided
    if (logger_id) {
      console.log('🔍 Looking up logger with ID:', logger_id);
      
      // Debug: Check all available loggers
      const allLoggers = await databaseService.getAllLoggers();
      console.log('🔍 All available loggers:', allLoggers.map(l => ({ 
        _id: l._id, 
        id: l.id, 
        logger_id: l.logger_id, 
        user_account_id: l.user_account_id 
      })));
      
      const logger = await databaseService.findLoggerByLoggerId(logger_id);
      console.log('🔍 Logger found:', logger);
      
      if (!logger) {
        console.log('🔍 Logger not found for ID:', logger_id);
        console.log('🔍 Available logger IDs:', allLoggers.map(l => l.logger_id));
        return res.status(400).json({
          success: false,
          message: `Invalid logger ID: ${logger_id}. Available loggers: ${allLoggers.map(l => l.logger_id).join(', ')}`
        });
      }

      loggerInternalId = databaseService.useDatabase ? logger.id : logger._id;
      console.log('🔍 Using logger internal ID:', loggerInternalId);
    }
    
    // Convert and validate pin_number
    let pinNumber = null;
    if (pin_number !== undefined && pin_number !== null && pin_number !== '') {
      pinNumber = parseInt(pin_number, 10);
      if (isNaN(pinNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Pin number must be a valid integer'
        });
      }
      
      // Check for duplicate pin_number + logger_id combination
      if (loggerInternalId) {
        const existingAssetWithPin = await databaseService.findAssetByLoggerAndPin(loggerInternalId, pinNumber);
        if (existingAssetWithPin) {
          return res.status(400).json({
            success: false,
            message: `An asset already exists with pin number ${pinNumber} for this logger`
          });
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Pin number is required'
      });
    }
    
    const assetData = {
      name: name.trim(),
      type: type || 'machine',
      pin_number: pinNumber,
      description: description || '',
      logger_id: loggerInternalId,
      short_stop_threshold: short_stop_threshold || 5,
      long_stop_threshold: long_stop_threshold || 30,
      downtime_reasons: downtime_reasons || 'Maintenance,Breakdown,Setup,Material shortage,Quality issue',
      current_state: 'STOPPED',
      availability_percentage: 0,
      runtime: 0,
      downtime: 0,
      total_stops: 0,
      last_state_change: new Date()
    };
    
    console.log('🔍 Creating asset with data:', JSON.stringify(assetData, null, 2));
    
    const asset = await databaseService.createAsset(assetData);
    
    console.log('🔍 Asset created:', asset);
    
    // Create initial STATE_CHANGE event for the asset (only if logger is assigned)
    if (asset.logger_id) {
      await databaseService.createEvent({
        asset_id: asset.id,
        logger_id: asset.logger_id,
        event_type: 'STATE_CHANGE',
        previous_state: null,
        new_state: 'STOPPED',
        duration: 0,
        stop_reason: 'Asset created',
        metadata: { 
          source: 'system',
          note: 'Asset created and initialized'
        },
        timestamp: new Date()
      });
    }
    
    res.status(201).json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('🔍 CREATE ASSET ERROR:', error);
    console.error('🔍 Error stack:', error.stack);
    
    // Handle specific database constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Asset with this pin number already exists for the selected logger'
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update asset
// @route   PUT /api/assets/:id
// @access  Private (Admin, Manager)
exports.updateAsset = async (req, res) => {
  try {
    const { 
      name, 
      pin_number, 
      description, 
      logger_id,
      short_stop_threshold,
      long_stop_threshold,
      downtime_reasons
    } = req.body;
    
    let asset = await databaseService.findAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Check user access to the asset
    if (req.user && asset.logger_id) {
      const logger = await databaseService.findLoggerById(asset.logger_id);
      if (logger && logger.user_account_id != req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this asset'
        });
      }
    }
    
    // Check if new name already exists (if name is being changed)
    if (name && name !== asset.name) {
      const existingAsset = await databaseService.findAssetByName(name);
      
      if (existingAsset) {
        return res.status(400).json({
          success: false,
          message: 'Asset with this name already exists'
        });
      }
    }

    let loggerInternalId = asset.logger_id; // Keep existing if not changing
    
    // Validate new logger if provided and different from current
    if (logger_id !== undefined) {
      if (logger_id === '' || logger_id === null) {
        // Removing logger assignment
        loggerInternalId = null;
      } else {
        const logger = await databaseService.findLoggerByLoggerId(logger_id);
        if (!logger) {
          return res.status(400).json({
            success: false,
            message: 'Invalid logger ID'
          });
        }

        // Check if user has access to this logger
        if (req.user && logger.user_account_id != req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this logger'
          });
        }
        
        loggerInternalId = databaseService.useDatabase ? logger.id : logger._id;
      }
    }
    
    asset = await databaseService.updateAsset(req.params.id, { 
      name, 
      pin_number, 
      description,
      logger_id: loggerInternalId,
      short_stop_threshold,
      long_stop_threshold,
      downtime_reasons
    });
    
    res.status(200).json({
      success: true,
      data: asset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private (Admin, Manager)
exports.deleteAsset = async (req, res) => {
  try {
    const asset = await databaseService.findAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Check user access to the asset
    if (req.user && asset.logger_id) {
      const logger = await databaseService.findLoggerById(asset.logger_id);
      if (logger && logger.user_account_id != req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this asset'
        });
      }
    }
    
    // Always use database service since we're in database mode
    const deleted = await databaseService.deleteAsset(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get asset events
// @route   GET /api/assets/:id/events
// @access  Public
exports.getAssetEvents = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100, offset = 0 } = req.query;
    
    const asset = await databaseService.findAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    const events = await databaseService.getEventsByAssetId(req.params.id, { startDate, endDate, limit: parseInt(limit), offset: parseInt(offset) });
    
    res.status(200).json({
      success: true,
      total: events.length,
      events: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get asset analytics
// @route   GET /api/assets/:id/analytics
// @access  Public
exports.getAssetAnalytics = async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    const asset = await databaseService.findAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Calculate period start time
    const now = new Date();
    let startTime;
    
    switch (period) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    // Get events for the period
    const events = await databaseService.getEventsByAssetId(req.params.id, { startDate: startTime, endDate: now });
    
    // Calculate analytics
    const analytics = {
      period,
      total_events: events.length,
      runtime: asset.runtime || 0,
      downtime: asset.downtime || 0,
      availability_percentage: asset.availability_percentage || 0,
      total_stops: asset.total_stops || 0,
      current_state: asset.current_state,
      last_state_change: asset.last_state_change,
      events_by_type: {},
      hourly_breakdown: []
    };
    
    // Group events by type
    events.forEach(event => {
      if (!analytics.events_by_type[event.event_type]) {
        analytics.events_by_type[event.event_type] = 0;
      }
      analytics.events_by_type[event.event_type]++;
    });
    
    // Create hourly breakdown for the last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= hourStart && eventDate < hourEnd;
      });
      
      analytics.hourly_breakdown.push({
        hour: hourStart.toISOString(),
        events: hourEvents.length,
        running_events: hourEvents.filter(e => e.state === 'RUNNING').length,
        stopped_events: hourEvents.filter(e => e.state === 'STOPPED').length,
        error_events: hourEvents.filter(e => e.state === 'ERROR').length
      });
    }
    
    res.status(200).json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};