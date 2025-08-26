const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');
const sendEmail = require('../utils/sendEmail');
const databaseService = require('../services/databaseService');

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
    // Get all archives from database
    let archives = await databaseService.getAllArchives();
    console.log(`🔍 DEBUG: Retrieved ${archives.length} archives from database`);
    if (archives.length > 0) {
      console.log('🔍 DEBUG: Archive types:', [...new Set(archives.map(a => a.archive_type))]);
      console.log('🔍 DEBUG: Sample archive:', {
        id: archives[0].id,
        title: archives[0].title,
        archive_type: archives[0].archive_type
      });
    }
    
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
    
    // Add asset names to archives and format data
    const assets = await databaseService.getAllAssets();
    const enrichedArchives = paginatedArchives.map(archive => {
      const archiveData = archive.toJSON ? archive.toJSON() : archive;
      const archiveAssets = archiveData.filters?.asset_ids ? archiveData.filters.asset_ids.map(assetId => {
        const asset = assets.find(a => (a._id || a.id) == assetId);
        return asset ? { _id: asset._id || a.id, name: asset.name } : { _id: assetId, name: 'Unknown' };
      }) : [];
      
      // Format performance value
      const performance = (archiveData.performance || 0) * 100;

      return {
        ...archiveData,
        assets: archiveAssets,
        creator: { name: 'System', email: 'system@example.com' },
        file_size_mb: archiveData.file_size ? (archiveData.file_size / (1024 * 1024)).toFixed(2) : '0.00',
        event_count: archiveData.archived_data?.event_count || 0,
        filename: archiveData.filters?.filename || archiveData.title,
        start_date: archiveData.date_range_start,
        end_date: archiveData.date_range_end,
        run_time: archiveData.availability ? `${(archiveData.availability * 100).toFixed(2)}%` : '0.00%',
        downtime: '0.00%',
        performance: `${performance.toFixed(2)}%`
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

// @desc    Send email with archive details
// @route   POST /api/archives/send-email
// @access  Private
exports.sendArchiveEmail = async (req, res) => {
  try {
    const { archiveId, recipientEmail, recipientName, subject, message } = req.body;
    
    // Validate required fields
    if (!archiveId || !recipientEmail || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: archiveId, recipientEmail, subject, and message are required'
      });
    }
    
    // Get archive details from database
    let archive;
    try {
      archive = await databaseService.findArchiveById(archiveId);
    } catch (error) {
      // Fallback to memory database if SQL fails
      archive = await databaseService.findArchiveById(archiveId);
    }
    
    if (!archive) {
      return res.status(404).json({
        success: false,
        message: 'Archive not found'
      });
    }
    
    // Extract event count from archived_data
    let eventCount = 0;
    let eventDetails = [];
    
    if (archive.archived_data) {
      if (typeof archive.archived_data === 'string') {
        const parsedData = JSON.parse(archive.archived_data);
        eventCount = parsedData.event_count || parsedData.events?.length || 0;
        eventDetails = parsedData.events || [];
      } else {
        eventCount = archive.archived_data.event_count || archive.archived_data.events?.length || 0;
        eventDetails = archive.archived_data.events || [];
      }
    }

    // Prepare event summary for email
    let eventSummary = '';
    if (eventDetails.length > 0) {
      eventSummary = '\n\nEvent Summary:\n';
      eventDetails.slice(0, 10).forEach((event, index) => {
        const timestamp = new Date(event.timestamp).toLocaleString();
        eventSummary += `${index + 1}. ${event.asset_name || 'Unknown Asset'} - ${event.event_type} (${event.previous_state} → ${event.new_state}) at ${timestamp}\n`;
      });
      if (eventDetails.length > 10) {
        eventSummary += `... and ${eventDetails.length - 10} more events\n`;
      }
    }

    // Prepare email content
    const emailSubject = subject;
    const emailBody = `
Dear ${recipientName || 'User'},

${message}

---
Archive Details:
- Name: ${archive.title || archive.name}
- Description: ${archive.description || 'No description'}
- Event Count: ${eventCount}
- Created: ${new Date(archive.created_at).toLocaleString()}${eventSummary}

Best regards,
Industrial Monitoring Dashboard
    `;
    
    // Send email
    await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Event Archive Notification</h2>
          <p>Dear ${recipientName || 'User'},</p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Archive Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Name:</td>
                <td style="padding: 8px 0;">${archive.title || archive.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Description:</td>
                <td style="padding: 8px 0;">${archive.description || 'No description'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Event Count:</td>
                <td style="padding: 8px 0;">${eventCount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Created:</td>
                <td style="padding: 8px 0;">${new Date(archive.created_at).toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          ${eventDetails.length > 0 ? `
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Event Summary (${Math.min(eventDetails.length, 10)} of ${eventDetails.length} events)</h3>
            <div style="font-family: monospace; font-size: 12px; line-height: 1.4;">
              ${eventDetails.slice(0, 10).map((event, index) => {
                const timestamp = new Date(event.timestamp).toLocaleString();
                return `<div style="padding: 4px 0; border-bottom: 1px solid #eee;">
                  <strong>${index + 1}.</strong> ${event.asset_name || 'Unknown Asset'} - ${event.event_type}<br>
                  <span style="color: #666; margin-left: 20px;">${event.previous_state} → ${event.new_state} at ${timestamp}</span>
                </div>`;
              }).join('')}
              ${eventDetails.length > 10 ? `<div style="padding: 8px 0; color: #666; font-style: italic;">... and ${eventDetails.length - 10} more events</div>` : ''}
            </div>
          </div>` : ''}
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>Industrial Monitoring Dashboard</strong>
          </p>
        </div>
      `
    });
    
    res.status(200).json({
      success: true,
      message: `Email sent successfully to ${recipientEmail}`,
      data: {
        archiveId,
        recipientEmail,
        subject: emailSubject
      }
    });
    
  } catch (error) {
    console.error('Error sending archive email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email: ' + error.message
    });
  }
};


// @desc    Get archive by ID
// @route   GET /api/archives/:id
// @access  Private
exports.getArchiveById = async (req, res) => {
  try {
    const archive = await databaseService.findArchiveById(req.params.id);
    
    if (!archive) {
      return res.status(404).json({
        success: false,
        message: 'Archive not found'
      });
    }
    
    // Add asset names to archive
    const assets = await databaseService.getAllAssets();
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
    
    // Get events from database
    let events = await databaseService.getAllEvents();
    
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
    const assets = await databaseService.getAllAssets();
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
      title: filename,
      description: description || `Archive of ${eventsWithAssets.length} events from ${startDateObj.toDateString()} to ${endDateObj.toDateString()}`,
      archive_type: 'EVENTS',
      date_range_start: startDateObj,
      date_range_end: endDateObj,
      filters: {
        asset_ids: asset_ids || [],
        filename: uniqueFilename,
        original_filename: filename
      },
      archived_data: {
        events: eventsWithAssets,
        event_count: eventsWithAssets.length,
        assets: asset_ids || []
      },
      file_path: filePath,
      file_size: fileSizeInBytes,
      status: 'COMPLETED',
      created_by: req.user ? req.user.id : 1
    };
    
    const archive = await databaseService.createArchive(archiveData);
    
    // Add asset names for response
    const archiveAssets = archive.filters?.asset_ids ? archive.filters.asset_ids.map(assetId => {
      const asset = assets.find(a => (a._id || a.id) == assetId);
      return asset ? { _id: asset._id || asset.id, name: asset.name } : { _id: assetId, name: 'Unknown' };
    }) : [];

    const responseArchive = {
      ...archive.toJSON(),
      assets: archiveAssets,
      creator: { name: 'System', email: 'system@example.com' },
      file_size_mb: fileSizeInMB,
      event_count: archive.archived_data?.event_count || 0,
      filename: archive.filters?.filename || archive.title
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
    const archive = await databaseService.findArchiveById(req.params.id);
    
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
    const filename = archive.filters?.original_filename || archive.filters?.filename || archive.title || `archive_${req.params.id}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
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
    const archive = await databaseService.findArchiveById(req.params.id);
    
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
    const deleted = await databaseService.deleteArchive(req.params.id);
    
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
    const shift = await databaseService.findShiftById(shift_id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Get all events for this shift
    let events = await databaseService.getAllEvents();
    
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
    const assets = await databaseService.getAllAssets();
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
    
    // Create enhanced filename for end-of-shift report
    const shiftName = shift.name || `Shift_${shift.shift_number}`;
    const generateEnhancedFilename = (name, startTime, extension) => {
      const date = new Date(startTime);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const sanitizedShiftName = name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
      
      return `${dateStr}_${timeStr}_${sanitizedShiftName}_End_Of_Shift_Report.${extension}`;
    };
    
    const filename = generateEnhancedFilename(shiftName, shift.start_time, 'csv');
    const filePath = path.join(uploadDir, filename);
    
    // Write CSV file
    fs.writeFileSync(filePath, csv);
    
    // Calculate file size
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    
    // Create archive record
    const archiveData = {
      title: `End of Shift Report - ${shiftName}`,
      description: `End of shift report for ${shiftName} (${shift.shift_number || 'N/A'}) with ${eventsWithAssets.length} events`,
      archive_type: 'REPORTS',
      date_range_start: shiftStart,
      date_range_end: shiftEnd,
      filters: {
        shift_id: shift_id,
        include_all_assets: include_all_assets,
        asset_ids: asset_ids,
        filename: filename,
        original_filename: generateEnhancedFilename(shiftName, shift.start_time, 'csv'),
        report_type: 'end_of_shift'
      },
      archived_data: {
        events: eventsWithAssets,
        event_count: eventsWithAssets.length,
        shift: shift,
        assets: include_all_assets ? assets.map(a => a.id || a._id) : asset_ids
      },
      file_path: filePath,
      file_size: fileSizeInBytes,
      status: 'COMPLETED',
      created_by: req.user ? req.user.id : 1
    };
    
    const archive = await databaseService.createArchive(archiveData);
    
    // Add asset names for response
    const archiveAssets = archive.archived_data?.assets ? archive.archived_data.assets.map(assetId => {
      const asset = assets.find(a => (a._id || a.id) == assetId);
      return asset ? { _id: asset._id || asset.id, name: asset.name } : { _id: assetId, name: 'Unknown' };
    }) : [];

    const responseArchive = {
      ...archive.toJSON(),
      assets: archiveAssets,
      creator: { name: 'System', email: 'system@example.com' },
      file_size_mb: (fileSizeInBytes / (1024 * 1024)).toFixed(2),
      event_count: archive.archived_data?.event_count || 0,
      filename: archive.filters?.filename || archive.title
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