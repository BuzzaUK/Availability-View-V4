const databaseService = require('../services/databaseService');

// @desc    Get all events with filtering and pagination
// @route   GET /api/events
// @access  Private
exports.getEvents = async (req, res) => {
  console.log('🔍 API /api/events called by user:', req.user ? req.user.email : 'unknown');
  try {
    const {
      page = 1,
      limit = 10,
      asset,
      eventType,
      state,
      startDate,
      endDate,
      search,
      currentShiftOnly = 'true' // Default to showing only current shift events
    } = req.query;

    // Build options for database query
    const options = {
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
    };

    // Add filters
    if (asset) options.asset_id = asset;
    if (eventType) options.event_type = eventType;
    if (state) options.state = state;
    if (search) options.search = search;

    // Filter by current shift if requested
    if (currentShiftOnly === 'true') {
      const currentShift = await databaseService.getCurrentShift();
      if (currentShift) {
        options.startDate = currentShift.start_time;
        // Don't set endDate to show ongoing shift
      } else {
        // If no current shift, show events from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        options.startDate = today.toISOString();
      }
    } else {
      // Use provided date filters for historical view
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;
    }

    // Get events from SQL database
    const result = await databaseService.getAllEvents(options);
    const events = result.rows;
    const total = result.count;

    // Transform events to match frontend expectations
    const transformedEvents = events.map(event => ({
      _id: event.id,
      timestamp: event.timestamp,
      assetId: event.asset_id,
      assetName: event.asset ? event.asset.name : 'Unknown',
      eventType: event.event_type,
      state: event.new_state || event.previous_state,
      duration: (event.duration || 0) * 1000, // Convert seconds to milliseconds for frontend
      notes: event.stop_reason || '',
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }));

    res.status(200).json({
      success: true,
      events: transformedEvents,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (error) {
    console.error('Error fetching events:', error);
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
    const { id } = req.params;
    
    // For now, return a simple response since we don't have a specific getEvent method in databaseService
    res.status(200).json({
      success: true,
      message: 'Get single event not implemented yet'
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
    // Events are typically created automatically by the system, not manually
    res.status(200).json({
      success: true,
      message: 'Manual event creation not implemented - events are created automatically by the system'
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
    const { id } = req.params;
    
    res.status(200).json({
      success: true,
      message: 'Event update not implemented yet'
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
  console.log('🗑️ API /api/events/:id DELETE called by user:', req.user ? req.user.email : 'unknown');
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    // Delete the event using the database service
    const deletedCount = await databaseService.deleteEventsByIds([parseInt(id)]);
    
    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Emit real-time update for event deletion
    if (req.io) {
      req.io.emit('event_deleted', { eventId: id });
      console.log(`✅ Emitted event_deleted for event ID: ${id}`);
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Archive events
// @route   POST /api/events/archive
// @access  Private
exports.archiveEvents = async (req, res) => {
  try {
    const { name, description, isEndOfShift = false } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Archive name is required'
      });
    }

    // Get current shift events to archive
    const currentShift = await databaseService.getCurrentShift();
    let eventsToArchive = [];
    
    if (currentShift) {
      // Get all events from current shift
      const result = await databaseService.getAllEvents({
        startDate: currentShift.start_time,
        limit: 10000 // Get all events
      });
      eventsToArchive = result.rows;
    } else {
      // If no current shift, get today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result = await databaseService.getAllEvents({
        startDate: today.toISOString(),
        limit: 10000
      });
      eventsToArchive = result.rows;
    }

    // Create archive with events data
    const archiveData = {
      title: name.trim(),
      description: description?.trim() || '',
      archive_type: 'EVENTS',
      date_range_start: currentShift ? currentShift.start_time : new Date(new Date().setHours(0, 0, 0, 0)),
      date_range_end: currentShift ? (currentShift.end_time || new Date()) : new Date(),
      created_by: req.user?.id || req.user?._id || 1, // Default to user ID 1 if no user
      status: 'COMPLETED',
      archived_data: {
        event_count: eventsToArchive.length,
        archive_type: isEndOfShift ? 'shift_end' : 'manual',
        shift_id: currentShift?.id || currentShift?._id,
        events: eventsToArchive.map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          asset_id: event.asset_id,
          asset_name: event.asset?.name || 'Unknown',
          event_type: event.event_type,
          previous_state: event.previous_state,
          new_state: event.new_state,
          duration: event.duration,
          stop_reason: event.stop_reason,
          metadata: event.metadata
        })),
        shift_info: currentShift ? {
          id: currentShift.id || currentShift._id,
          name: currentShift.name,
          shift_number: currentShift.shift_number,
          start_time: currentShift.start_time,
          end_time: currentShift.end_time,
          status: currentShift.status
        } : null
      }
    };

    const archive = await databaseService.createArchive(archiveData);

    // If this is an end-of-shift archive, clear the events from the main table
    if (isEndOfShift && eventsToArchive.length > 0) {
      try {
        // Delete all archived events from the main events table
        const eventIds = eventsToArchive.map(event => event.id);
        await databaseService.deleteEventsByIds(eventIds);
        console.log(`Cleared ${eventIds.length} events from main table after archiving`);
      } catch (deleteError) {
        console.error('Error clearing events after archiving:', deleteError);
        // Don't fail the archive operation if clearing fails
      }
    }

    // Emit real-time update for new archive creation
    if (req.io) {
      req.io.emit('new_archive', {
        id: archive.id,
        title: archive.title,
        description: archive.description,
        archive_type: archive.archive_type,
        event_count: eventsToArchive.length,
        created_at: archive.created_at,
        status: archive.status
      });
      console.log(`✅ Emitted new_archive event for: ${archive.title}`);
    }

    res.status(200).json({
      success: true,
      message: `Successfully archived ${eventsToArchive.length} events${isEndOfShift ? ' and cleared them from active list' : ''}`,
      archive: {
        id: archive.id,
        title: archive.title,
        event_count: eventsToArchive.length,
        created_at: archive.created_at
      }
    });
  } catch (error) {
    console.error('Error archiving events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive events: ' + error.message
    });
  }
};

// @desc    Get event archives
// @route   GET /api/events/archives
// @access  Private
exports.getEventArchives = async (req, res) => {
  try {
    const allArchives = await databaseService.getAllArchives();
    
    // Filter to only include EVENTS type archives for the Event Archive tab
    const eventArchives = allArchives.filter(archive => archive.archive_type === 'EVENTS');
    
    // Transform archives to match frontend expectations
    const transformedArchives = eventArchives.map(archive => ({
      id: archive.id,
      title: archive.title,
      description: archive.description,
      archive_type: archive.archive_type,
      date_range_start: archive.date_range_start,
      date_range_end: archive.date_range_end,
      file_size: archive.file_size,
      status: archive.status,
      created_at: archive.created_at,
      created_by: archive.created_by,
      event_count: archive.archived_data ? 
        (typeof archive.archived_data === 'string' ? 
          JSON.parse(archive.archived_data).event_count : 
          archive.archived_data.event_count) : 0
    }));

    console.log(`📊 Event Archives API: Returning ${transformedArchives.length} EVENTS archives (filtered from ${allArchives.length} total archives)`);

    res.status(200).json({
      success: true,
      data: transformedArchives
    });
  } catch (error) {
    console.error('Error fetching event archives:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Restore event archive
// @route   POST /api/events/archives/:id/restore
// @access  Private
exports.restoreEventArchive = async (req, res) => {
  try {
    const { id } = req.params;
    
    res.status(200).json({
      success: true,
      message: 'Event archive restoration not implemented yet'
    });
  } catch (error) {
    console.error('Error restoring event archive:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete event archive
// @route   DELETE /api/events/archives/:id
// @access  Private
exports.deleteEventArchive = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Archive ID is required'
      });
    }

    // Check if archive exists
    const archive = await databaseService.findArchiveById(id);
    if (!archive) {
      return res.status(404).json({
        success: false,
        message: 'Archive not found'
      });
    }

    // Delete the archive using the database service
    const deleted = await databaseService.deleteArchive(id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete archive'
      });
    }

    // Emit real-time update for archive deletion
    if (req.io) {
      req.io.emit('archive_deleted', { archiveId: id });
      console.log(`✅ Emitted archive_deleted for archive ID: ${id}`);
    }

    res.status(200).json({
      success: true,
      message: 'Archive deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event archive:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
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

    // Build options for database query (no pagination for export)
    const options = {};
    if (asset) options.asset_id = asset;
    if (eventType) options.event_type = eventType;
    if (state) options.state = state;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (search) options.search = search;

    // Get all events from SQL database
    const result = await databaseService.getAllEvents(options);
    const events = result.rows;

    // Create CSV content
    const csvHeader = 'Timestamp,Asset,Event Type,State,Duration (ms),Notes\n';
    const csvRows = events.map(event => {
      const timestamp = new Date(event.timestamp).toISOString();
      const assetName = event.asset ? event.asset.name : 'Unknown';
      const eventType = event.event_type || '';
      const state = event.new_state || event.previous_state || '';
      const duration = (event.duration || 0) * 1000; // Convert to milliseconds
      const notes = (event.stop_reason || '').replace(/"/g, '""'); // Escape quotes
      
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