const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');
const naturalLanguageReportController = require('../controllers/naturalLanguageReportController');

// Apply authentication to all routes
router.use(authenticateJWT);

// Get available report types and documentation
router.get('/', naturalLanguageReportController.getReportTypes);

// Generate natural language shift report
router.get('/shift/:shiftId', authorizeRoles('super_admin', 'admin', 'manager'), naturalLanguageReportController.generateShiftReport);

// Generate daily summary report
router.get('/daily/:date', authorizeRoles('super_admin', 'admin', 'manager'), naturalLanguageReportController.generateDailySummary);

// Generate sample report for demonstration
router.get('/sample', naturalLanguageReportController.generateSampleReport);

module.exports = router;