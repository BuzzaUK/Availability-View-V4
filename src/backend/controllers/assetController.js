const memoryDB = require('../utils/memoryDB');

// @desc    Get all assets
// @route   GET /api/assets
// @access  Public
exports.getAssets = async (req, res) => {
  try {
    let assets;
    
    // If user is authenticated
    if (req.user && req.user.id) {
      // Admin users can see all assets
      if (req.user.role === 'admin') {
        assets = memoryDB.getAllAssets();
      } else {
        // Regular users see only their assets
        assets = memoryDB.getAssetsByUserId(req.user.id);
      }
    } else {
      // For public access, get all assets (backward compatibility)
      assets = memoryDB.getAllAssets();
    }
    
    // Enhance assets with logger information
    const enhancedAssets = assets.map(asset => {
      const logger = asset.logger_id ? memoryDB.findLoggerById(asset.logger_id) : null;
      return {
        ...asset,
        logger_info: logger ? {
          logger_id: logger.logger_id,
          logger_name: logger.logger_name,
          status: logger.status,
          last_seen: logger.last_seen
        } : null
      };
    });
    
    // Sort assets by name
    enhancedAssets.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('🔍 API /api/assets returning data:', enhancedAssets.map(a => ({
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
    const asset = memoryDB.findAssetById(req.params.id);
    
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
      logger_id,
      short_stop_threshold,
      long_stop_threshold,
      downtime_reasons
    } = req.body;
    
    // Check if asset with same name already exists
    const existingAsset = memoryDB.findAssetByName(name);
    
    if (existingAsset) {
      return res.status(400).json({
        success: false,
        message: 'Asset with this name already exists'
      });
    }

    // Validate logger if provided
    if (logger_id) {
      const logger = memoryDB.findLoggerById(logger_id);
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
    }
    
    const asset = memoryDB.createAsset({
      name,
      pin_number,
      description,
      logger_id,
      short_stop_threshold,
      long_stop_threshold,
      downtime_reasons,
      current_state: 'STOPPED',
      availability_percentage: 0,
      runtime: 0,
      downtime: 0,
      total_stops: 0,
      last_state_change: new Date()
    });
    
    // Create initial SHIFT event for the asset
    memoryDB.createEvent({
      asset: asset._id,
      asset_name: asset.name,
      logger_id: asset.logger_id,
      event_type: 'SHIFT',
      state: 'STOPPED',
      availability: 0,
      runtime: 0,
      downtime: 0,
      stops: 0,
      duration: 0,
      note: 'Asset created',
      timestamp: new Date()
    });
    
    res.status(201).json({
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
    
    let asset = memoryDB.findAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Check user access to the asset
    if (req.user && asset.logger_id) {
      const logger = memoryDB.findLoggerById(asset.logger_id);
      if (logger && logger.user_account_id != req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this asset'
        });
      }
    }
    
    // Check if new name already exists (if name is being changed)
    if (name && name !== asset.name) {
      const existingAsset = memoryDB.findAssetByName(name);
      
      if (existingAsset) {
        return res.status(400).json({
          success: false,
          message: 'Asset with this name already exists'
        });
      }
    }

    // Validate new logger if provided
    if (logger_id && logger_id !== asset.logger_id) {
      const logger = memoryDB.findLoggerById(logger_id);
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
    }
    
    asset = memoryDB.updateAsset(req.params.id, { 
      name, 
      pin_number, 
      description,
      logger_id,
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
// @access  Private (Admin)
exports.deleteAsset = async (req, res) => {
  try {
    const asset = memoryDB.findAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Delete the asset (this also deletes associated events in memoryDB)
    const deleted = memoryDB.deleteAsset(req.params.id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete asset'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get asset events
// @route   GET /api/assets/:id/events
// @access  Private
exports.getAssetEvents = async (req, res) => {
  try {
    const asset = memoryDB.findAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Get query parameters for filtering
    const { startDate, endDate, eventType, limit = 50, page = 1 } = req.query;
    
    // Get all events and filter
    let events = memoryDB.getAllEvents().filter(event => event.asset == req.params.id);
    
    // Apply date filters
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      events = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= start && eventDate <= end;
      });
    } else if (startDate) {
      const start = new Date(startDate);
      events = events.filter(event => new Date(event.timestamp) >= start);
    } else if (endDate) {
      const end = new Date(endDate);
      events = events.filter(event => new Date(event.timestamp) <= end);
    }
    
    // Apply event type filter
    if (eventType) {
      events = events.filter(event => event.event_type === eventType.toUpperCase());
    }
    
    // Sort by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Calculate pagination
    const total = events.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedEvents = events.slice(skip, skip + parseInt(limit));
    
    res.status(200).json({
      success: true,
      count: paginatedEvents.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: paginatedEvents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get asset statistics
// @route   GET /api/assets/:id/stats
// @access  Private
exports.getAssetStats = async (req, res) => {
  try {
    const asset = memoryDB.findAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Get query parameters for filtering
    const { startDate, endDate } = req.query;
    
    // Get all events for this asset and filter
    let events = memoryDB.getAllEvents().filter(event => event.asset == req.params.id);
    
    // Apply date filters
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      events = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= start && eventDate <= end;
      });
    } else if (startDate) {
      const start = new Date(startDate);
      events = events.filter(event => new Date(event.timestamp) >= start);
    } else if (endDate) {
      const end = new Date(endDate);
      events = events.filter(event => new Date(event.timestamp) <= end);
    }
    
    // Sort by timestamp (oldest first for statistics calculation)
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Calculate statistics
    let totalRuntime = 0;
    let totalDowntime = 0;
    let totalStops = 0;
    
    events.forEach(event => {
      totalRuntime += event.runtime || 0;
      totalDowntime += event.downtime || 0;
      
      if (event.event_type === 'STOP') {
        totalStops += 1;
      }
    });
    
    // Calculate availability percentage
    const totalTime = totalRuntime + totalDowntime;
    const availabilityPercentage = totalTime > 0 
      ? ((totalRuntime / totalTime) * 100).toFixed(2) 
      : 0;
    
    const stats = {
      asset_name: asset.name,
      current_state: asset.current_state,
      availability_percentage: parseFloat(availabilityPercentage),
      runtime: totalRuntime,
      downtime: totalDowntime,
      total_stops: totalStops,
      event_count: events.length,
      first_event: events.length > 0 ? events[0].timestamp : null,
      last_event: events.length > 0 ? events[events.length - 1].timestamp : null
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};