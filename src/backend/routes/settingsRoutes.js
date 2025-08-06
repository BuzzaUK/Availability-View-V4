const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Import controllers
const {
  getGeneralSettings,
  updateGeneralSettings,
  getNotificationSettings,
  updateNotificationSettings,
  getBackupSettings,
  updateBackupSettings,
  testEmailNotification,
  testSmsNotification
} = require('../controllers/settingsController');

// General settings
router.get('/', getGeneralSettings);
router.put('/', authorizeRoles('admin', 'manager'), updateGeneralSettings);

// Notification settings
router.get('/notifications', getNotificationSettings);
router.put('/notifications', authorizeRoles('admin', 'manager'), updateNotificationSettings);
router.post('/notifications/test-email', authorizeRoles('admin', 'manager'), testEmailNotification);
router.post('/notifications/test-sms', authorizeRoles('admin', 'manager'), testSmsNotification);

// Backup settings
router.get('/backup', getBackupSettings);
router.put('/backup', authorizeRoles('admin', 'manager'), updateBackupSettings);

module.exports = router;