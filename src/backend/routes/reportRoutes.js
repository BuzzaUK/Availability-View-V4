const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Import controllers
const {
  generateAssetReport,
  generateShiftReport,
  generateSystemReport,
  getAvailableReports,
  getShiftReports,
  getDailyReports,
  getMonthlyReports,
  exportShiftReports,
  exportDailyReports,
  exportMonthlyReports
} = require('../controllers/reportController');

// Available reports
router.get('/', getAvailableReports);

// Asset reports
router.get('/asset/:id', generateAssetReport);

// Shift reports
router.get('/shift/:id', generateShiftReport);

// System reports
router.get('/system', generateSystemReport);

// Shift reports (for Archives page)
router.get('/shifts', getShiftReports);

// Daily reports (for Archives page)
router.get('/daily', getDailyReports);

// Monthly reports (for Archives page)
router.get('/monthly', getMonthlyReports);

// Export endpoints
router.get('/shifts/export', exportShiftReports);
router.get('/daily/export', exportDailyReports);
router.get('/monthly/export', exportMonthlyReports);

module.exports = router;