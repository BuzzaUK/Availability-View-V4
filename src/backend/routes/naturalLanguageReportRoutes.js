const express = require('express');
const router = express.Router();
const naturalLanguageReportController = require('../controllers/naturalLanguageReportController');

// Get available report types and documentation
router.get('/', naturalLanguageReportController.getReportTypes);

// Generate natural language shift report
router.get('/shift/:shiftId', naturalLanguageReportController.generateShiftReport);

// Generate daily summary report
router.get('/daily/:date', naturalLanguageReportController.generateDailySummary);

// Generate sample report for demonstration
router.get('/sample', naturalLanguageReportController.generateSampleReport);

module.exports = router;