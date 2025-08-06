const memoryDB = require('../utils/memoryDB');

// @desc    Get all events with filtering and pagination
// @route   GET /api/events
// @access  Private
exports.getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      asset,
      eventType,
      state,
      startDate,
      endDate,
      search
    } = req.query;

    // Get all events from memory database
    let events = memoryDB.getAllEvents();
    
    // Apply filters
    if (asset) {
      events = events.filter(event => event.asset == asset);
    }
    
    if (eventType) {
      events = events.filter(event => event.event_type === eventType);
    }
    
    if (state) {
      events = events.filter(event => event.state === state);
    }
    
    // Date range filter
    if (startDate || endDate) {
      events = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        if (startDate && eventDate < new Date(startDate)) return false;
        if (endDate && eventDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      events = events.filter(event => 
        (event.asset_name && event.asset_name.toLowerCase().includes(searchLower)) ||
        (event.note && event.note.toLowerCase().includes(searchLower)) ||
        (event.event_type && event.event_type.toLowerCase().includes(searchLower)) ||
        (event.state && event.state.toLowerCase().includes(searchLower))
      );
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const total = events.length;
    const skip = (pageNum - 1) * limitNum;
    const paginatedEvents = events.slice(skip, skip + limitNum);
    
    // Transform events to match frontend expectations
    const transformedEvents = paginatedEvents.map(event => ({
      _id: event._id,
      timestamp: event.timestamp,
      assetId: event.asset,
      assetName: event.asset_name,
      eventType: event.event_type,
      state: event.state,
      duration: (event.duration || 0) * 1000, // Convert seconds to milliseconds for frontend
      notes: event.note,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }));

    res.status(200).json({
      success: true,
      events: transformedEvents,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Export events as CSV
// @route   GET /api/events/export
// @access  Private
exports.exportEvents = async (req, res) => {
  try {
    const {
      asset,
      eventType,
      state,
      startDate,
      endDate,
      search
    } = req.query;

    // Get all events from memory database
    let events = memoryDB.getAllEvents();
    
    // Apply filters
    if (asset) {
      events = events.filter(event => event.asset == asset);
    }
    
    if (eventType) {
      events = events.filter(event => event.event_type === eventType);
    }
    
    if (state) {
      events = events.filter(event => event.state === state);
    }
    
    // Date range filter
    if (startDate || endDate) {
      events = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        if (startDate && eventDate < new Date(startDate)) return false;
        if (endDate && eventDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      events = events.filter(event => 
        (event.asset_name && event.asset_name.toLowerCase().includes(searchLower)) ||
        (event.note && event.note.toLowerCase().includes(searchLower)) ||
        (event.event_type && event.event_type.toLowerCase().includes(searchLower)) ||
        (event.state && event.state.toLowerCase().includes(searchLower))
      );
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Create CSV content
    const csvHeader = 'Timestamp,Asset,Event Type,State,Duration (ms),Notes\n';
    const csvRows = events.map(event => {
      const timestamp = new Date(event.timestamp).toISOString();
      const assetName = event.asset_name || 'Unknown';
      const eventType = event.event_type || '';
      const state = event.state || '';
      const duration = (event.duration || 0) * 1000; // Convert to milliseconds
      const notes = (event.note || '').replace(/"/g, '""'); // Escape quotes
      
      return `"${timestamp}","${assetName}","${eventType}","${state}","${duration}","${notes}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="events_export_${new Date().toISOString().slice(0, 10)}.csv"`);
    
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting events:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
exports.getEvent = async (req, res) => {
  try {
    const events = memoryDB.getAllEvents();
    const event = events.find(e => e._id == req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Transform event to match frontend expectations
    const transformedEvent = {
      _id: event._id,
      timestamp: event.timestamp,
      assetId: event.asset,
      assetName: event.asset_name,
      eventType: event.event_type,
      state: event.state,
      duration: (event.duration || 0) * 1000, // Convert seconds to milliseconds
      notes: event.note,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };

    res.status(200).json({
      success: true,
      data: transformedEvent
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private
exports.createEvent = async (req, res) => {
  try {
    const { asset, asset_name, event_type, state, duration, note } = req.body;
    
    const eventData = {
      asset,
      asset_name,
      event_type,
      state,
      duration: duration ? duration / 1000 : 0, // Convert milliseconds to seconds
      note,
      timestamp: new Date()
    };
    
    const event = memoryDB.createEvent(eventData);
    
    // Transform event to match frontend expectations
    const transformedEvent = {
      _id: event._id,
      timestamp: event.timestamp,
      assetName: event.asset_name,
      eventType: event.event_type,
      state: event.state,
      duration: (event.duration || 0) * 1000, // Convert to milliseconds
      notes: event.note || ''
    };

    res.status(201).json({
      success: true,
      data: transformedEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
exports.updateEvent = async (req, res) => {
  try {
    const { asset, asset_name, event_type, state, duration, note } = req.body;
    
    const events = memoryDB.getAllEvents();
    const eventIndex = events.findIndex(e => e._id == req.params.id);
    
    if (eventIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Update fields
    const event = events[eventIndex];
    if (asset !== undefined) event.asset = asset;
    if (asset_name !== undefined) event.asset_name = asset_name;
    if (event_type !== undefined) event.event_type = event_type;
    if (state !== undefined) event.state = state;
    if (duration !== undefined) event.duration = duration / 1000; // Convert milliseconds to seconds
    if (note !== undefined) event.note = note;
    
    // Transform event to match frontend expectations
    const transformedEvent = {
      _id: event._id,
      timestamp: event.timestamp,
      assetId: event.asset,
      assetName: event.asset_name,
      eventType: event.event_type,
      state: event.state,
      duration: (event.duration || 0) * 1000, // Convert to milliseconds
      notes: event.note || '',
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };

    res.status(200).json({
      success: true,
      data: transformedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
exports.deleteEvent = async (req, res) => {
  try {
    const events = memoryDB.getAllEvents();
    const eventIndex = events.findIndex(e => e._id == req.params.id);

    if (eventIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    memoryDB.deleteEvent(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};