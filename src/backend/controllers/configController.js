const databaseService = require('../services/databaseService');

// @desc    Get configuration
// @route   GET /api/config
// @access  Private
exports.getConfig = async (req, res) => {
  try {
    const config = await databaseService.getApplicationSettings();
    
    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update configuration
// @route   PUT /api/config
// @access  Private (Admin only)
exports.updateConfig = async (req, res) => {
  try {
    const {
      company_name,
      logo_url,
      micro_stop_threshold,
      report_schedule,
      report_recipients
    } = req.body;

    const updates = {};
    if (company_name !== undefined) updates.company_name = company_name;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (micro_stop_threshold !== undefined) updates.micro_stop_threshold = micro_stop_threshold;
    if (report_schedule !== undefined) updates.report_schedule = report_schedule;
    if (report_recipients !== undefined) updates.report_recipients = report_recipients;

    const config = await databaseService.updateApplicationSettings(updates);

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get downtime reasons
// @route   GET /api/config/downtime-reasons
// @access  Private
exports.getDowntimeReasons = async (req, res) => {
  try {
    const downtimeReasons = await databaseService.getDowntimeReasons();
    
    res.status(200).json({
      success: true,
      data: downtimeReasons || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Add downtime reason
// @route   POST /api/config/downtime-reasons
// @access  Private (Admin only)
exports.addDowntimeReason = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const newReason = await databaseService.addDowntimeReason({
      name,
      description: description || '',
      color: color || '#FF9800'
    });

    res.status(201).json({
      success: true,
      data: newReason
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update downtime reason
// @route   PUT /api/config/downtime-reasons/:id
// @access  Private (Admin only)
exports.updateDowntimeReason = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const reasonId = req.params.id;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;

    const updatedReason = await databaseService.updateDowntimeReason(reasonId, updates);

    if (!updatedReason) {
      return res.status(404).json({
        success: false,
        message: 'Downtime reason not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedReason
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Delete downtime reason
// @route   DELETE /api/config/downtime-reasons/:id
// @access  Private (Admin only)
exports.deleteDowntimeReason = async (req, res) => {
  try {
    const reasonId = req.params.id;

    const deleted = await databaseService.deleteDowntimeReason(reasonId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Downtime reason not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Downtime reason deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get shift schedules
// @route   GET /api/config/shift-schedules
// @access  Private
exports.getShiftSchedules = async (req, res) => {
  try {
    const shiftSchedules = await databaseService.getShiftSchedules();
    
    res.status(200).json({
      success: true,
      data: shiftSchedules || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Add shift schedule
// @route   POST /api/config/shift-schedules
// @access  Private (Admin only)
exports.addShiftSchedule = async (req, res) => {
  try {
    const { name, start_time, end_time } = req.body;

    if (!name || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Name, start_time, and end_time are required'
      });
    }

    const newSchedule = await databaseService.addShiftSchedule({
      name,
      start_time,
      end_time
    });

    res.status(201).json({
      success: true,
      data: newSchedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update shift schedule
// @route   PUT /api/config/shift-schedules/:id
// @access  Private (Admin only)
exports.updateShiftSchedule = async (req, res) => {
  try {
    const { name, start_time, end_time } = req.body;
    const scheduleId = req.params.id;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;

    const updatedSchedule = await databaseService.updateShiftSchedule(scheduleId, updates);

    if (!updatedSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Shift schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Delete shift schedule
// @route   DELETE /api/config/shift-schedules/:id
// @access  Private (Admin only)
exports.deleteShiftSchedule = async (req, res) => {
  try {
    const scheduleId = req.params.id;

    const deleted = await databaseService.deleteShiftSchedule(scheduleId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Shift schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Shift schedule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get report recipients
// @route   GET /api/config/report-recipients
// @access  Private (Admin/Manager only)
exports.getReportRecipients = async (req, res) => {
  try {
    const reportRecipients = await databaseService.getReportRecipients();
    
    res.status(200).json({
      success: true,
      data: reportRecipients || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Add report recipient
// @route   POST /api/config/report-recipients
// @access  Private (Admin only)
exports.addReportRecipient = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const newRecipient = await databaseService.addReportRecipient({
      email,
      name: name || ''
    });

    res.status(201).json({
      success: true,
      data: newRecipient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update report recipient
// @route   PUT /api/config/report-recipients/:id
// @access  Private (Admin only)
exports.updateReportRecipient = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const recipientId = req.params.id;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;

    const updatedRecipient = await databaseService.updateReportRecipient(recipientId, updates);

    if (!updatedRecipient) {
      return res.status(404).json({
        success: false,
        message: 'Report recipient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedRecipient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Delete report recipient
// @route   DELETE /api/config/report-recipients/:id
// @access  Private (Admin only)
exports.deleteReportRecipient = async (req, res) => {
  try {
    const recipientId = req.params.id;

    const deleted = await databaseService.deleteReportRecipient(recipientId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Report recipient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report recipient deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update report schedule
// @route   PUT /api/config/report-schedule
// @access  Private (Admin only)
exports.updateReportSchedule = async (req, res) => {
  try {
    const { enabled, frequency, time } = req.body;

    const updates = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (frequency !== undefined) updates.frequency = frequency;
    if (time !== undefined) updates.time = time;

    const updatedSchedule = await databaseService.updateReportSchedule(updates);

    res.status(200).json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};