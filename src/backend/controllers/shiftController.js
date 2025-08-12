const databaseService = require('../services/databaseService');
const reportService = require('../services/reportService');
const shiftScheduler = require('../services/shiftScheduler');
const sendEmail = require('../utils/sendEmail');

// Helper function to calculate availability percentage
const calculateAvailability = (runtime, downtime) => {
  const total = runtime + downtime;
  return total > 0 ? (runtime / total) * 100 : 0;
};

// @desc    Get all shifts
// @route   GET /api/shifts
// @access  Private
exports.getShifts = async (req, res) => {
  try {
    let shifts = await databaseService.getShifts();
    
    // Filtering
    if (req.query.start_date && req.query.end_date) {
      const startDate = new Date(req.query.start_date);
      const endDate = new Date(req.query.end_date);
      shifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.start_time);
        return shiftDate >= startDate && shiftDate <= endDate;
      });
    }
    
    if (req.query.active !== undefined) {
      const isActive = req.query.active === 'true';
      shifts = shifts.filter(shift => shift.status === 'active' === isActive);
    }
    
    // Sorting
    if (req.query.sort_by) {
      const sortField = req.query.sort_by;
      const sortOrder = req.query.sort_order === 'asc' ? 1 : -1;
      shifts.sort((a, b) => {
        if (a[sortField] < b[sortField]) return -1 * sortOrder;
        if (a[sortField] > b[sortField]) return 1 * sortOrder;
        return 0;
      });
    } else {
      // Default sort by start time, newest first
      shifts.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const total = shifts.length;
    const paginatedShifts = shifts.slice(startIndex, endIndex);
    
    res.status(200).json({
      success: true,
      count: paginatedShifts.length,
      total,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        limit
      },
      data: paginatedShifts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get shift by ID
// @route   GET /api/shifts/:id
// @access  Private
exports.getShiftById = async (req, res) => {
  try {
    const shift = await databaseService.findShiftById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get current active shift
// @route   GET /api/shifts/current
// @access  Private
exports.getCurrentShift = async (req, res) => {
  try {
    const shift = await databaseService.getCurrentShift();
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'No active shift found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: shift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Start a new shift (Manual)
// @route   POST /api/shifts/start
// @access  Private
exports.startShift = async (req, res) => {
  try {
    const { name, notes } = req.body;
    
    // Use the enhanced shift scheduler for manual shift start
    const shift = await shiftScheduler.startShiftManually(
      name || `Manual Shift - ${new Date().toLocaleString()}`,
      notes || ''
    );
    
    res.status(201).json({
      success: true,
      message: 'Shift started successfully',
      data: shift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start shift',
      error: error.message
    });
  }
};

// @desc    End current shift (Manual)
// @route   POST /api/shifts/end
// @access  Private
exports.endShift = async (req, res) => {
  try {
    const { notes } = req.body;
    
    // Use the enhanced shift scheduler for manual shift end
    await shiftScheduler.endShiftManually(notes || '');
    
    res.status(200).json({
      success: true,
      message: 'Shift ended successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to end shift',
      error: error.message
    });
  }
};

// @desc    Update shift
// @route   PUT /api/shifts/:id
// @access  Private
exports.updateShift = async (req, res) => {
  try {
    const { name, notes } = req.body;
    
    const shift = await databaseService.findShiftById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Update fields - use shift_name for consistency with model
    const updates = {};
    if (name) updates.shift_name = name;
    if (notes !== undefined) updates.notes = notes;
    
    const updatedShift = await databaseService.updateShift(req.params.id, updates);
    
    res.status(200).json({
      success: true,
      data: updatedShift
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Generate and send shift report (Enhanced)
// @route   POST /api/shifts/:id/report
// @access  Private
exports.sendShiftReport = async (req, res) => {
  try {
    const { recipients, format = 'all' } = req.body;
    
    const shift = await databaseService.findShiftById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Check if shift has ended
    if (shift.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send report for an active shift'
      });
    }
    
    // Determine recipients
    let emailRecipients = recipients;
    if (!emailRecipients || emailRecipients.length === 0) {
      const users = await databaseService.getAllUsers();
      emailRecipients = users
        .filter(user => user.shiftReportPreferences?.enabled)
        .map(user => user.email);
    }
    
    if (emailRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No report recipients specified'
      });
    }
    
    // Generate report options based on format
    const options = {
      includeCsv: format === 'all' || format === 'csv',
      includeHtml: format === 'all' || format === 'html',
      includeAnalysis: format === 'all' || format === 'analysis'
    };
    
    // Generate and send comprehensive report
    const result = await reportService.saveAndSendReport(req.params.id, emailRecipients, options);
    
    res.status(200).json({
      success: true,
      message: `Enhanced report sent to ${emailRecipients.length} recipients`,
      data: {
        recipients: emailRecipients,
        files_generated: result.files.length,
        archive_id: result.archive._id,
        formats: Object.keys(result.reportData.reports)
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate and send report',
      error: error.message
    });
  }
};

// @desc    Get shift analytics and insights
// @route   GET /api/shifts/:id/analytics
// @access  Private
exports.getShiftAnalytics = async (req, res) => {
  try {
    const reportData = await reportService.generateShiftReport(req.params.id, {
      includeCsv: false,
      includeHtml: false,
      includeAnalysis: true
    });
    
    res.status(200).json({
      success: true,
      data: {
        metrics: reportData.metrics,
        analysis: reportData.reports.analysis,
        assets: reportData.assets
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate shift analytics',
      error: error.message
    });
  }
};

// @desc    Get shift status and indicators
// @route   GET /api/shifts/status
// @access  Private
exports.getShiftStatus = async (req, res) => {
  try {
    const currentShift = shiftScheduler.getCurrentShift();
    const scheduledJobs = shiftScheduler.getScheduledJobs();
    
    const autoDetection = process.env.AUTO_SHIFT_DETECTION === 'true';
    const shiftTimes = process.env.SHIFT_TIMES?.split(',') || [];
    
    res.status(200).json({
      success: true,
      data: {
        current_shift: currentShift,
        auto_detection_enabled: autoDetection,
        scheduled_shift_times: shiftTimes,
        active_jobs: scheduledJobs,
        next_shift_detection: this.getNextShiftTime(shiftTimes)
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get shift status',
      error: error.message
    });
  }
};

// Helper function to get next shift time
function getNextShiftTime(shiftTimes) {
  if (!shiftTimes || shiftTimes.length === 0) return null;
  
  const now = new Date();
  const today = now.toDateString();
  
  for (const time of shiftTimes) {
    const [hour, minute] = time.split(':');
    const shiftTime = new Date(`${today} ${hour}:${minute}:00`);
    
    if (shiftTime > now) {
      return shiftTime.toLocaleString();
    }
  }
  
  // If no shift today, return first shift tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [hour, minute] = shiftTimes[0].split(':');
  const nextShift = new Date(`${tomorrow.toDateString()} ${hour}:${minute}:00`);
  
  return nextShift.toLocaleString();
}

module.exports = {
  getShifts: exports.getShifts,
  getShiftById: exports.getShiftById,
  getCurrentShift: exports.getCurrentShift,
  startShift: exports.startShift,
  endShift: exports.endShift,
  updateShift: exports.updateShift,
  sendShiftReport: exports.sendShiftReport,
  getShiftAnalytics: exports.getShiftAnalytics,
  getShiftStatus: exports.getShiftStatus
};