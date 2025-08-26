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

// Update configuration - super admin/admin only
router.put('/', authorizeRoles('super_admin', 'admin'), updateConfig);

// Downtime reasons
router.get('/downtime-reasons', getDowntimeReasons);
router.post('/downtime-reasons', authorizeRoles('super_admin', 'admin', 'manager'), addDowntimeReason);
router.put('/downtime-reasons/:id', authorizeRoles('super_admin', 'admin', 'manager'), updateDowntimeReason);
router.delete('/downtime-reasons/:id', authorizeRoles('super_admin', 'admin', 'manager'), deleteDowntimeReason);

// Shift schedules
router.get('/shift-schedules', getShiftSchedules);
router.post('/shift-schedules', authorizeRoles('super_admin', 'admin', 'manager'), addShiftSchedule);
router.put('/shift-schedules/:id', authorizeRoles('super_admin', 'admin', 'manager'), updateShiftSchedule);
router.delete('/shift-schedules/:id', authorizeRoles('super_admin', 'admin', 'manager'), deleteShiftSchedule);

// Report recipients
router.get('/report-recipients', authorizeRoles('super_admin', 'admin', 'manager'), getReportRecipients);
router.post('/report-recipients', authorizeRoles('super_admin', 'admin'), addReportRecipient);
router.put('/report-recipients/:id', authorizeRoles('super_admin', 'admin'), updateReportRecipient);
router.delete('/report-recipients/:id', authorizeRoles('super_admin', 'admin'), deleteReportRecipient);

// Report schedule
router.put('/report-schedule', authorizeRoles('super_admin', 'admin'), updateReportSchedule);

module.exports = router;