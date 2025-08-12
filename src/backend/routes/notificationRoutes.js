const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');
const databaseService = require('../services/databaseService');
const sendEmail = require('../utils/sendEmail');
const shiftScheduler = require('../services/shiftScheduler');

// @desc    Get notification settings
// @route   GET /api/notifications/settings
// @access  Private
router.get('/settings', authenticateJWT, async (req, res) => {
  try {
    const settings = await databaseService.getNotificationSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification settings'
    });
  }
});

// @desc    Update notification settings
// @route   PUT /api/notifications/settings
// @access  Private (Admin/Manager)
router.put('/settings', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const updates = req.body;
    const settings = await databaseService.updateNotificationSettings(updates);
    
    // If shift settings were updated, refresh the scheduler
    if (updates.shiftSettings) {
      await shiftScheduler.updateSchedules();
    }
    
    res.json({
      success: true,
      data: settings,
      message: 'Notification settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings'
    });
  }
});

// @desc    Test email configuration
// @route   POST /api/notifications/test-email
// @access  Private (Admin/Manager)
router.post('/test-email', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    const subject = 'Test Email - Asset Monitoring System';
    const htmlContent = `
      <h2>Test Email</h2>
      <p>This is a test email from the Asset Monitoring System.</p>
      <p>If you received this email, your email configuration is working correctly.</p>
      <p>Sent at: ${new Date().toLocaleString()}</p>
    `;

    await sendEmail({ to: testEmail, subject, html: htmlContent, text: 'Test email from Asset Monitoring System' });
    
    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email: ' + error.message
    });
  }
});

// @desc    Get shift scheduler status
// @route   GET /api/notifications/scheduler-status
// @access  Private (Admin)
router.get('/scheduler-status', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const status = shiftScheduler.getScheduleStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status'
    });
  }
});

// @desc    Manually trigger shift report (for testing)
// @route   POST /api/notifications/trigger-shift-report
// @access  Private (Admin)
router.post('/trigger-shift-report', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { shiftTime } = req.body;
    
    if (!shiftTime) {
      return res.status(400).json({
        success: false,
        message: 'Shift time is required'
      });
    }

    await shiftScheduler.triggerShiftReport(shiftTime);
    
    res.json({
      success: true,
      message: `Shift report triggered successfully for ${shiftTime}`
    });
  } catch (error) {
    console.error('Error triggering shift report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger shift report: ' + error.message
    });
  }
});

module.exports = router;