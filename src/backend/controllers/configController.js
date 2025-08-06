const memoryDB = require('../utils/memoryDB');

// @desc    Get configuration
// @route   GET /api/config
// @access  Private
exports.getConfig = async (req, res) => {
  try {
    const config = memoryDB.getConfig();
    
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

    const config = memoryDB.updateConfig(updates);

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
    const config = memoryDB.getConfig();
    
    res.status(200).json({
      success: true,
      data: config.downtime_reasons || []
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

    const config = memoryDB.getConfig();
    const newReason = {
      _id: Date.now(), // Simple ID generation
      name,
      description: description || '',
      color: color || '#FF9800'
    };

    const updatedReasons = [...(config.downtime_reasons || []), newReason];
    const updatedConfig = memoryDB.updateConfig({ downtime_reasons: updatedReasons });

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
    const reasonId = parseInt(req.params.id);

    const config = memoryDB.getConfig();
    const reasons = config.downtime_reasons || [];
    const reasonIndex = reasons.findIndex(reason => reason._id == reasonId);

    if (reasonIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Downtime reason not found'
      });
    }

    // Update the reason
    if (name !== undefined) reasons[reasonIndex].name = name;
    if (description !== undefined) reasons[reasonIndex].description = description;
    if (color !== undefined) reasons[reasonIndex].color = color;

    const updatedConfig = memoryDB.updateConfig({ downtime_reasons: reasons });

    res.status(200).json({
      success: true,
      data: reasons[reasonIndex]
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
    const reasonId = parseInt(req.params.id);

    const config = memoryDB.getConfig();
    const reasons = config.downtime_reasons || [];
    const reasonIndex = reasons.findIndex(reason => reason._id == reasonId);

    if (reasonIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Downtime reason not found'
      });
    }

    // Remove the reason
    reasons.splice(reasonIndex, 1);
    const updatedConfig = memoryDB.updateConfig({ downtime_reasons: reasons });

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
    const config = memoryDB.getConfig();
    
    res.status(200).json({
      success: true,
      data: config.shift_schedules || []
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

    const config = memoryDB.getConfig();
    const newSchedule = {
      _id: Date.now(), // Simple ID generation
      name,
      start_time,
      end_time
    };

    const updatedSchedules = [...(config.shift_schedules || []), newSchedule];
    const updatedConfig = memoryDB.updateConfig({ shift_schedules: updatedSchedules });

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
    const scheduleId = parseInt(req.params.id);

    const config = memoryDB.getConfig();
    const schedules = config.shift_schedules || [];
    const scheduleIndex = schedules.findIndex(schedule => schedule._id == scheduleId);

    if (scheduleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Shift schedule not found'
      });
    }

    // Update the schedule
    if (name !== undefined) schedules[scheduleIndex].name = name;
    if (start_time !== undefined) schedules[scheduleIndex].start_time = start_time;
    if (end_time !== undefined) schedules[scheduleIndex].end_time = end_time;

    const updatedConfig = memoryDB.updateConfig({ shift_schedules: schedules });

    res.status(200).json({
      success: true,
      data: schedules[scheduleIndex]
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
    const scheduleId = parseInt(req.params.id);

    const config = memoryDB.getConfig();
    const schedules = config.shift_schedules || [];
    const scheduleIndex = schedules.findIndex(schedule => schedule._id == scheduleId);

    if (scheduleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Shift schedule not found'
      });
    }

    // Remove the schedule
    schedules.splice(scheduleIndex, 1);
    const updatedConfig = memoryDB.updateConfig({ shift_schedules: schedules });

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
    const config = memoryDB.getConfig();
    
    res.status(200).json({
      success: true,
      data: config.report_recipients || []
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

    const config = memoryDB.getConfig();
    const newRecipient = {
      _id: Date.now(), // Simple ID generation
      email,
      name: name || ''
    };

    const updatedRecipients = [...(config.report_recipients || []), newRecipient];
    const updatedConfig = memoryDB.updateConfig({ report_recipients: updatedRecipients });

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
    const { email, name } = req.body;
    const recipientId = parseInt(req.params.id);

    const config = memoryDB.getConfig();
    const recipients = config.report_recipients || [];
    const recipientIndex = recipients.findIndex(recipient => recipient._id == recipientId);

    if (recipientIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Report recipient not found'
      });
    }

    // Update the recipient
    if (email !== undefined) recipients[recipientIndex].email = email;
    if (name !== undefined) recipients[recipientIndex].name = name;

    const updatedConfig = memoryDB.updateConfig({ report_recipients: recipients });

    res.status(200).json({
      success: true,
      data: recipients[recipientIndex]
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
    const recipientId = parseInt(req.params.id);

    const config = memoryDB.getConfig();
    const recipients = config.report_recipients || [];
    const recipientIndex = recipients.findIndex(recipient => recipient._id == recipientId);

    if (recipientIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Report recipient not found'
      });
    }

    // Remove the recipient
    recipients.splice(recipientIndex, 1);
    const updatedConfig = memoryDB.updateConfig({ report_recipients: recipients });

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
    const { frequency, time, enabled } = req.body;

    const updates = {};
    if (frequency !== undefined) updates['report_schedule.frequency'] = frequency;
    if (time !== undefined) updates['report_schedule.time'] = time;
    if (enabled !== undefined) updates['report_schedule.enabled'] = enabled;

    const config = memoryDB.updateConfig({ 
      report_schedule: {
        ...memoryDB.getConfig().report_schedule,
        ...req.body
      }
    });

    res.status(200).json({
      success: true,
      data: config.report_schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};