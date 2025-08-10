const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Import controllers
const {
  getOverviewAnalytics,
  getAssetAnalytics,
  getShiftAnalytics,
  getEventAnalytics,
  getAvailabilityTrends,
  getOEEAnalytics,
  getDowntimeAnalytics,
  getStateDistribution,
  getPerformanceMetrics,
  getAvailabilityAnalytics
} = require('../controllers/analyticsController');

// Overall analytics
router.get('/', getOverviewAnalytics);

// Asset-specific analytics
router.get('/assets', getAssetAnalytics);

// Shift analytics
router.get('/shifts', getShiftAnalytics);

// Event analytics
router.get('/events', getEventAnalytics);

// Availability trends
router.get('/trends', getAvailabilityTrends);

// Comprehensive availability analytics
router.get('/availability', getAvailabilityAnalytics);

// OEE Analytics
router.get('/oee', getOEEAnalytics);

// Downtime Analytics
router.get('/downtime', getDowntimeAnalytics);

// State Distribution
router.get('/state-distribution', getStateDistribution);

// Performance Metrics
router.get('/performance-metrics', getPerformanceMetrics);

module.exports = router;