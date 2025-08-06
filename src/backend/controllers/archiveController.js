const memoryDB = require('../utils/memoryDB');
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');

// Helper function to ensure upload directory exists
const ensureUploadDirExists = () => {
  const uploadDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// @desc    Get all archives
// @route   GET /api/archives
// @access  Private
exports.getArchives = async (req, res) => {
  try {
    // Get all archives from memory database
    let archives = memoryDB.getAllArchives();
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Filtering
    if (req.query.start_date && req.query.end_date) {
      const startDate = new Date(req.query.start_date);
      const endDate = new Date(req.query.end_date);
      archives = archives.filter(archive => {
        const archiveDate = new Date(archive.created_at);
        return archiveDate >= startDate && archiveDate <= endDate;
      });
    }
    
    if (req.query.asset_id) {
      archives = archives.filter(archive => 
        archive.assets && archive.assets.includes(req.query.asset_id)
      );
    }
    
    // Sorting
    if (req.query.sort_by) {
      const sortBy = req.query.sort_by;
      const sortOrder = req.query.sort_order === 'asc' ? 1 : -1;
      archives.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return -1 * sortOrder;
        if (a[sortBy] > b[sortBy]) return 1 * sortOrder;
        return 0;
      });
    } else {
      // Default sort by creation date, newest first
      archives.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    // Apply pagination
    const total = archives.length;
    const paginatedArchives = archives.slice(startIndex, startIndex + limit);
    
    // Add asset names to archives
    const assets = memoryDB.getAllAssets();
    const enrichedArchives = paginatedArchives.map(archive => {
      const archiveAssets = archive.assets ? archive.assets.map(assetId => {
        const asset = assets.find(a => a._id == assetId);
        return asset ? { _id: asset._id, name: asset.name } : { _id: assetId, name: 'Unknown' };
      }) : [];
      
      return {
        ...archive,
        assets: archiveAssets,
        creator: archive.creator || { name: 'System', email: 'system@example.com' }
      };
    });
    
    res.status(200).json({
      success: true,
      count: enrichedArchives.length,
      total,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        limit
      },
      data: enrichedArchives
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get archive by ID
// @route   GET /api/archives/:id
// @access  Private
exports.getArchiveById = async (req, res) => {
  try {
    const archive = memoryDB.findArchiveById(req.params.id);
    
    if (!archive) {
      return res.status(404).json({
        success: false,
        message: 'Archive not found'
      });
    }
    
    // Add asset names to archive
    const assets = memoryDB.getAllAssets();
    const archiveAssets = archive.assets ? archive.assets.map(assetId => {
      const asset = assets.find(a => a._id == assetId);
      return asset ? { _id: asset._id, name: asset.name } : { _id: assetId, name: 'Unknown' };
    }) : [];
    
    const enrichedArchive = {
      ...archive,
      assets: archiveAssets,
      creator: archive.creator || { name: 'System', email: 'system@example.com' }
    };
    
    res.status(200).json({
      success: true,
      data: enrichedArchive
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Create archive from events
// @route   POST /api/archives
// @access  Private
exports.createArchive = async (req, res) => {
  try {
    const { filename, description, start_date, end_date, asset_ids } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Validate date range
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    if (startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }
    
    // Get events from memory database
    let events = memoryDB.getAllEvents();
    
    // Filter events by date range
    events = events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDateObj && eventDate <= endDateObj;
    });
    
    // Add asset filter if provided
    if (asset_ids && asset_ids.length > 0) {
      events = events.filter(event => asset_ids.includes(event.asset));
    }
    
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No events found for the specified criteria'
      });
    }
    
    // Get asset information for events
    const assets = memoryDB.getAllAssets();
    const eventsWithAssets = events.map(event => {
      const asset = assets.find(a => a._id == event.asset);
      return {
        ...event,
        asset: asset ? {
          _id: asset._id,
          name: asset.name,
          pin_number: asset.pin_number
        } : {
          _id: event.asset,
          name: 'Unknown',
          pin_number: 'N/A'
        }
      };
    });
    
    // Sort events by timestamp
    eventsWithAssets.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Transform events to CSV format
    const fields = [
      { label: 'Event ID', value: '_id' },
      { label: 'Asset Name', value: 'asset.name' },
      { label: 'Asset Pin', value: 'asset.pin_number' },
      { label: 'Event Type', value: 'event_type' },
      { label: 'State', value: 'state' },
      { label: 'Timestamp', value: 'timestamp' },
      { label: 'Runtime (min)', value: 'runtime' },
      { label: 'Downtime (min)', value: 'downtime' },
      { label: 'Stops', value: 'stops' },
      { label: 'Availability (%)', value: 'availability' },
      { label: 'Downtime Reason', value: 'downtime_reason' },
      { label: 'Notes', value: 'notes' },
      { label: 'Shift', value: 'shift' }
    ];
    
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(eventsWithAssets);
    
    // Ensure upload directory exists
    const uploadDir = ensureUploadDirExists();
    
    // Create a unique filename to avoid overwriting
    const safeName = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const uniqueFilename = `${safeName}_${Date.now()}.csv`;
    const filePath = path.join(uploadDir, uniqueFilename);
    
    // Write CSV file
    fs.writeFileSync(filePath, csv);
    
    // Calculate file size
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    
    // Create archive record
    const archiveData = {
      filename: uniqueFilename,
      original_filename: filename,
      description: description || '',
      file_path: filePath,
      file_size: fileSizeInBytes,
      event_count: eventsWithAssets.length,
      start_date: startDateObj,
      end_date: endDateObj,
      assets: asset_ids || [],
      creator: req.user ? req.user._id : 'system',
      created_at: new Date()
    };
    
    const archive = memoryDB.createArchive(archiveData);
    
    // Add asset names for response
    const archiveAssets = archive.assets ? archive.assets.map(assetId => {
      const asset = assets.find(a => a._id == assetId);
      return asset ? { _id: asset._id, name: asset.name } : { _id: assetId, name: 'Unknown' };
    }) : [];
    
    const responseArchive = {
      ...archive,
      assets: archiveAssets,
      creator: { name: 'System', email: 'system@example.com' },
      file_size_mb: fileSizeInMB
    };
    
    res.status(201).json({
      success: true,
      message: `Archive created successfully with ${eventsWithAssets.length} events`,
      data: responseArchive
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Download archive file
// @route   GET /api/archives/:id/download
// @access  Private
exports.downloadArchive = async (req, res) => {
  try {
    const archive = memoryDB.findArchiveById(req.params.id);
    
    if (!archive) {
      return res.status(404).json({
        success: false,
        message: 'Archive not found'
      });
    }
    
    const filePath = archive.file_path;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archive file not found on disk'
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${archive.original_filename || archive.filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Delete archive
// @route   DELETE /api/archives/:id
// @access  Private
exports.deleteArchive = async (req, res) => {
  try {
    const archive = memoryDB.findArchiveById(req.params.id);
    
    if (!archive) {
      return res.status(404).json({
        success: false,
        message: 'Archive not found'
      });
    }
    
    // Delete file from disk if it exists
    if (archive.file_path && fs.existsSync(archive.file_path)) {
      try {
        fs.unlinkSync(archive.file_path);
      } catch (fileError) {
        console.error('Error deleting archive file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }
    
    // Delete archive record from database
    const deleted = memoryDB.deleteArchive(req.params.id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete archive'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Archive deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Generate end-of-shift report and archive
// @route   POST /api/archives/end-of-shift
// @access  Private
exports.generateEndOfShiftReport = async (req, res) => {
  try {
    const { shift_id, include_all_assets = true, asset_ids = [] } = req.body;
    
    if (!shift_id) {
      return res.status(400).json({
        success: false,
        message: 'Shift ID is required'
      });
    }
    
    // Get shift information
    const shift = memoryDB.findShiftById(shift_id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Get all events for this shift
    let events = memoryDB.getAllEvents();
    
    // Filter events by shift timeframe
    const shiftStart = new Date(shift.start_time);
    const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
    
    events = events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= shiftStart && eventDate <= shiftEnd;
    });
    
    // Filter by assets if specified
    if (!include_all_assets && asset_ids.length > 0) {
      events = events.filter(event => asset_ids.includes(event.asset));
    }
    
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No events found for this shift'
      });
    }
    
    // Get asset information for events
    const assets = memoryDB.getAllAssets();
    const eventsWithAssets = events.map(event => {
      const asset = assets.find(a => a._id == event.asset);
      return {
        ...event,
        asset: asset ? {
          _id: asset._id,
          name: asset.name,
          pin_number: asset.pin_number
        } : {
          _id: event.asset,
          name: 'Unknown',
          pin_number: 'N/A'
        }
      };
    });
    
    // Sort events by timestamp
    eventsWithAssets.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Define CSV fields for shift report
    const fields = [
      { label: 'Event ID', value: '_id' },
      { label: 'Asset Name', value: 'asset.name' },
      { label: 'Asset Pin', value: 'asset.pin_number' },
      { label: 'Event Type', value: 'event_type' },
      { label: 'State', value: 'state' },
      { label: 'Timestamp', value: 'timestamp' },
      { label: 'Runtime (min)', value: 'runtime' },
      { label: 'Downtime (min)', value: 'downtime' },
      { label: 'Stops', value: 'stops' },
      { label: 'Availability (%)', value: 'availability' },
      { label: 'Downtime Reason', value: 'downtime_reason' },
      { label: 'Notes', value: 'notes' }
    ];
    
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(eventsWithAssets);
    
    // Ensure upload directory exists
    const uploadDir = ensureUploadDirExists();
    
    // Create filename for end-of-shift report
    const shiftName = shift.name || `Shift_${shift.shift_number}`;
    const safeName = shiftName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `end_of_shift_${safeName}_${Date.now()}.csv`;
    const filePath = path.join(uploadDir, filename);
    
    // Write CSV file
    fs.writeFileSync(filePath, csv);
    
    // Calculate file size
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    
    // Create archive record
    const archiveData = {
      filename: filename,
      original_filename: `End of Shift Report - ${shiftName}.csv`,
      description: `End of shift report for ${shiftName} (${shift.shift_number})`,
      file_path: filePath,
      file_size: fileSizeInBytes,
      event_count: eventsWithAssets.length,
      start_date: shiftStart,
      end_date: shiftEnd,
      assets: include_all_assets ? assets.map(a => a._id) : asset_ids,
      creator: req.user ? req.user._id : 'system',
      created_at: new Date(),
      shift_id: shift_id,
      report_type: 'end_of_shift'
    };
    
    const archive = memoryDB.createArchive(archiveData);
    
    // Add asset names for response
    const archiveAssets = archive.assets ? archive.assets.map(assetId => {
      const asset = assets.find(a => a._id == assetId);
      return asset ? { _id: asset._id, name: asset.name } : { _id: assetId, name: 'Unknown' };
    }) : [];
    
    const responseArchive = {
      ...archive,
      assets: archiveAssets,
      creator: { name: 'System', email: 'system@example.com' },
      file_size_mb: (fileSizeInBytes / (1024 * 1024)).toFixed(2)
    };
    
    res.status(201).json({
      success: true,
      message: `End of shift report created successfully with ${eventsWithAssets.length} events`,
      data: responseArchive
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};