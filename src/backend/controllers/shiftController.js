const memoryDB = require('../utils/memoryDB');
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
    // Fix line 15
    let shifts = memoryDB.getShifts();
    
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
      shifts = shifts.filter(shift => shift.active === isActive);
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
    const shift = memoryDB.findShiftById(req.params.id);
    
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
    const shift = memoryDB.findActiveShift();
    
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

// @desc    Start a new shift
// @route   POST /api/shifts/start
// @access  Private
exports.startShift = async (req, res) => {
  try {
    // Check if there's already an active shift
    const activeShift = memoryDB.findActiveShift();
    
    if (activeShift) {
      return res.status(400).json({
        success: false,
        message: 'There is already an active shift. End the current shift before starting a new one.'
      });
    }
    
    // Get all assets to initialize shift asset states
    const assets = memoryDB.getAllAssets();
    
    if (assets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No assets found. Please add assets before starting a shift.'
      });
    }
    
    // Get the latest shift number
    const allShifts = memoryDB.getShifts();
    const latestShift = allShifts.sort((a, b) => (b.shift_number || 0) - (a.shift_number || 0))[0];
    const nextShiftNumber = latestShift ? (latestShift.shift_number || 0) + 1 : 1;
    
    // Get shift name from request or use default
    const { name, notes } = req.body;
    const shiftName = name || `Shift ${nextShiftNumber}`;
    
    // Initialize asset states for the shift
    const assetStates = assets.map(asset => ({
      asset: asset._id,
      name: asset.name,
      state: asset.current_state || 'STOPPED',
      runtime: 0,
      downtime: 0,
      stops: 0,
      availability: 0
    }));
    
    // Create new shift
    const shift = memoryDB.createShift({
      shift_number: nextShiftNumber,
      name: shiftName,
      start_time: new Date(),
      active: true,
      asset_states: assetStates,
      notes: notes || '',
      runtime: 0,
      downtime: 0,
      stops: 0,
      availability: 0
    });
    
    // Create SHIFT_START events for each asset
    const shiftStartEvents = [];
    
    for (const asset of assets) {
      const event = memoryDB.createEvent({
        asset: asset._id,
        asset_name: asset.name,
        event_type: 'SHIFT',
        state: asset.current_state || 'STOPPED',
        timestamp: new Date(),
        shift: shift._id,
        note: 'Shift started'
      });
      
      shiftStartEvents.push(event);
    }
    
    res.status(201).json({
      success: true,
      data: shift,
      events: shiftStartEvents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    End current shift
// @route   POST /api/shifts/end
// @access  Private
exports.endShift = async (req, res) => {
  try {
    // Find active shift
    const shift = memoryDB.findActiveShift();
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'No active shift found'
      });
    }
    
    // Get all assets
    const assets = memoryDB.getAllAssets();
    
    // Create SHIFT_END events for each asset
    const shiftEndEvents = [];
    
    for (const asset of assets) {
      // Get all events for this asset during the shift
      const allEvents = memoryDB.getAllEvents();
      const assetEvents = allEvents.filter(event => 
        event.asset == asset._id && event.shift == shift._id
      ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Calculate metrics for this asset during the shift
      let runtime = 0;
      let downtime = 0;
      let stops = 0;
      
      assetEvents.forEach(event => {
        runtime += event.runtime || 0;
        downtime += event.downtime || 0;
        stops += event.stops || 0;
      });
      
      // Calculate availability
      const availability = calculateAvailability(runtime, downtime);
      
      // Create SHIFT_END event
      const event = memoryDB.createEvent({
        asset: asset._id,
        asset_name: asset.name,
        event_type: 'SHIFT',
        state: asset.current_state,
        timestamp: new Date(),
        runtime,
        downtime,
        stops,
        availability,
        shift: shift._id,
        note: 'Shift ended'
      });
      
      shiftEndEvents.push(event);
      
      // Update asset state in shift record
      const assetStateIndex = shift.asset_states.findIndex(
        state => state.asset == asset._id
      );
      
      if (assetStateIndex !== -1) {
        shift.asset_states[assetStateIndex].state = asset.current_state;
        shift.asset_states[assetStateIndex].runtime = runtime;
        shift.asset_states[assetStateIndex].downtime = downtime;
        shift.asset_states[assetStateIndex].stops = stops;
        shift.asset_states[assetStateIndex].availability = availability;
      }
    }
    
    // Calculate overall shift metrics
    let totalRuntime = 0;
    let totalDowntime = 0;
    let totalStops = 0;
    
    shift.asset_states.forEach(state => {
      totalRuntime += state.runtime;
      totalDowntime += state.downtime;
      totalStops += state.stops;
    });
    
    const overallAvailability = calculateAvailability(totalRuntime, totalDowntime);
    
    // Update shift record
    const updatedShift = memoryDB.updateShift(shift._id, {
      active: false,
      end_time: new Date(),
      runtime: totalRuntime,
      downtime: totalDowntime,
      stops: totalStops,
      availability: overallAvailability,
      notes: req.body.notes || shift.notes,
      asset_states: shift.asset_states
    });
    
    // Check if end-of-shift report should be generated
    const config = memoryDB.getConfig();
    
    if (config && config.report_schedule === 'end_of_shift') {
      // Generate report logic would go here
      // This would typically call a function to create a CSV and send emails
      // For now, just mark that a report should be generated
      memoryDB.updateShift(shift._id, { report_pending: true });
    }
    
    res.status(200).json({
      success: true,
      data: updatedShift,
      events: shiftEndEvents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
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
    
    const shift = memoryDB.findShiftById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Update fields
    const updates = {};
    if (name) updates.name = name;
    if (notes !== undefined) updates.notes = notes;
    
    const updatedShift = memoryDB.updateShift(req.params.id, updates);
    
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

// @desc    Send shift report
// @route   POST /api/shifts/:id/report
// @access  Private (Admin, Manager)
exports.sendShiftReport = async (req, res) => {
  try {
    const shift = memoryDB.findShiftById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // Check if shift has ended
    if (shift.active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send report for an active shift'
      });
    }
    
    // Get config for report recipients
    const config = memoryDB.getConfig();
    
    if (!config || !config.report_recipients || config.report_recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No report recipients configured'
      });
    }
    
    // Get shift events
    const allEvents = memoryDB.getAllEvents();
    const events = allEvents.filter(event => event.shift == shift._id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Generate report content
    const shiftDate = new Date(shift.start_time).toLocaleDateString();
    const shiftStartTime = new Date(shift.start_time).toLocaleTimeString();
    const shiftEndTime = shift.end_time ? new Date(shift.end_time).toLocaleTimeString() : 'Ongoing';
    
    let reportContent = `<h2>Shift Report: ${shift.name}</h2>`;
    reportContent += `<p><strong>Date:</strong> ${shiftDate}</p>`;
    reportContent += `<p><strong>Time:</strong> ${shiftStartTime} - ${shiftEndTime}</p>`;
    reportContent += `<p><strong>Shift Number:</strong> ${shift.shift_number}</p>`;
    reportContent += `<p><strong>Overall Availability:</strong> ${shift.availability ? shift.availability.toFixed(2) : 0}%</p>`;
    reportContent += `<p><strong>Total Runtime:</strong> ${shift.runtime ? shift.runtime.toFixed(2) : 0} minutes</p>`;
    reportContent += `<p><strong>Total Downtime:</strong> ${shift.downtime ? shift.downtime.toFixed(2) : 0} minutes</p>`;
    reportContent += `<p><strong>Total Stops:</strong> ${shift.stops || 0}</p>`;
    
    if (shift.notes) {
      reportContent += `<p><strong>Notes:</strong> ${shift.notes}</p>`;
    }
    
    // Add asset performance table
    reportContent += `<h3>Asset Performance</h3>`;
    reportContent += `<table border="1" cellpadding="5" cellspacing="0">`;
    reportContent += `<tr><th>Asset</th><th>State</th><th>Runtime (min)</th><th>Downtime (min)</th><th>Stops</th><th>Availability (%)</th></tr>`;
    
    shift.asset_states.forEach(state => {
      reportContent += `<tr>`;
      reportContent += `<td>${state.name}</td>`;
      reportContent += `<td>${state.state}</td>`;
      reportContent += `<td>${state.runtime ? state.runtime.toFixed(2) : 0}</td>`;
      reportContent += `<td>${state.downtime ? state.downtime.toFixed(2) : 0}</td>`;
      reportContent += `<td>${state.stops || 0}</td>`;
      reportContent += `<td>${state.availability ? state.availability.toFixed(2) : 0}</td>`;
      reportContent += `</tr>`;
    });
    
    reportContent += `</table>`;
    
    // Send email to each recipient
    const recipients = config.report_recipients.map(recipient => recipient.email);
    
    try {
      await sendEmail({
        to: recipients.join(','),
        subject: `Shift Report: ${shift.name} - ${shiftDate}`,
        html: reportContent
      });
      
      memoryDB.updateShift(shift._id, {
        report_sent: true,
        report_sent_at: new Date()
      });
      
      res.status(200).json({
        success: true,
        message: `Report sent to ${recipients.length} recipients`,
        recipients
      });
    } catch (emailError) {
      res.status(500).json({
        success: false,
        message: 'Failed to send email report',
        error: emailError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  getShifts: exports.getShifts,
  getShiftById: exports.getShiftById,
  getCurrentShift: exports.getCurrentShift,
  startShift: exports.startShift,
  endShift: exports.endShift,
  updateShift: exports.updateShift,
  sendShiftReport: exports.sendShiftReport
};