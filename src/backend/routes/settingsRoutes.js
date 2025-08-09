const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/authMiddleware');
const {
  getNotificationSettings,
  updateNotificationSettings,
  testEmailNotification,
  testSmsNotification,
  getSettings,
  updateSettings
} = require('../controllers/settingsController');

// @route   GET /api/settings
// @desc    Get general settings
// @access  Private (Admin/Manager)
router.get('/', authenticateJWT, authorizeRoles('admin', 'manager'), getSettings);

// @route   PUT /api/settings
// @desc    Update general settings
// @access  Private (Admin/Manager)
router.put('/', authenticateJWT, authorizeRoles('admin', 'manager'), updateSettings);

// @route   GET /api/settings/notifications
// @desc    Get notification settings
// @access  Private (Admin/Manager)
router.get('/notifications', authenticateJWT, authorizeRoles('admin', 'manager'), getNotificationSettings);

// @route   PUT /api/settings/notifications
// @desc    Update notification settings
// @access  Private (Admin/Manager)
router.put('/notifications', authenticateJWT, authorizeRoles('admin', 'manager'), updateNotificationSettings);

// @route   POST /api/settings/notifications/test-email
// @desc    Test email notification
// @access  Private (Admin/Manager)
router.post('/notifications/test-email', authenticateJWT, authorizeRoles('admin', 'manager'), testEmailNotification);

// @route   POST /api/settings/notifications/test-sms
// @desc    Test SMS notification
// @access  Private (Admin/Manager)
router.post('/notifications/test-sms', authenticateJWT, authorizeRoles('admin', 'manager'), testSmsNotification);

module.exports = router;