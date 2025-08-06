const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Import controllers
const {
  getConfig,
  updateConfig,
  getDowntimeReasons,
  addDowntimeReason,
  updateDowntimeReason,
  deleteDowntimeReason,
  getShiftSchedules,
  addShiftSchedule,
  updateShiftSchedule,
  deleteShiftSchedule,
  getReportRecipients,
  addReportRecipient,
  updateReportRecipient,
  deleteReportRecipient,
  updateReportSchedule
} = require('../controllers/configController');

// Get configuration
router.get('/', getConfig);

// Update configuration - admin only
router.put('/', authorizeRoles('admin'), updateConfig);

// Downtime reasons
router.get('/downtime-reasons', getDowntimeReasons);
router.post('/downtime-reasons', authorizeRoles('admin', 'manager'), addDowntimeReason);
router.put('/downtime-reasons/:id', authorizeRoles('admin', 'manager'), updateDowntimeReason);
router.delete('/downtime-reasons/:id', authorizeRoles('admin', 'manager'), deleteDowntimeReason);

// Shift schedules
router.get('/shift-schedules', getShiftSchedules);
router.post('/shift-schedules', authorizeRoles('admin', 'manager'), addShiftSchedule);
router.put('/shift-schedules/:id', authorizeRoles('admin', 'manager'), updateShiftSchedule);
router.delete('/shift-schedules/:id', authorizeRoles('admin', 'manager'), deleteShiftSchedule);

// Report recipients
router.get('/report-recipients', authorizeRoles('admin', 'manager'), getReportRecipients);
router.post('/report-recipients', authorizeRoles('admin'), addReportRecipient);
router.put('/report-recipients/:id', authorizeRoles('admin'), updateReportRecipient);
router.delete('/report-recipients/:id', authorizeRoles('admin'), deleteReportRecipient);

// Report schedule
router.put('/report-schedule', authorizeRoles('admin'), updateReportSchedule);

module.exports = router;