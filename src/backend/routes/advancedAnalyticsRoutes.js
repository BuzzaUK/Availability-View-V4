const express = require('express');
const router = express.Router();
const advancedAnalyticsController = require('../controllers/advancedAnalyticsController');
const { authenticateJWT } = require('../middleware/authMiddleware');

/**
 * Advanced Analytics Routes
 * Provides predictive maintenance and advanced analytics endpoints
 */

// Apply authentication middleware to all routes
router.use(authenticateJWT);

/**
 * @route GET /api/advanced-analytics/predictive-maintenance
 * @desc Get predictive maintenance report with failure predictions and recommendations
 * @query {number} timeframe - Analysis timeframe in days (default: 30)
 * @query {boolean} includeRecommendations - Include maintenance recommendations (default: true)
 * @access Private
 */
router.get('/predictive-maintenance', advancedAnalyticsController.getPredictiveMaintenanceReport);

/**
 * @route GET /api/advanced-analytics/asset-health
 * @desc Get asset health scores and risk assessments
 * @query {string} assetId - Specific asset ID (optional, returns all if not specified)
 * @query {number} timeframe - Analysis timeframe in days (default: 30)
 * @access Private
 */
router.get('/asset-health', advancedAnalyticsController.getAssetHealthScores);

/**
 * @route GET /api/advanced-analytics/forecasts
 * @desc Get performance forecasts and trend predictions
 * @query {number} timeframe - Historical data timeframe in days (default: 30)
 * @query {number} forecastPeriod - Forecast period in days (default: 30)
 * @access Private
 */
router.get('/forecasts', advancedAnalyticsController.getPerformanceForecasts);

/**
 * @route GET /api/advanced-analytics/maintenance-recommendations
 * @desc Get maintenance recommendations based on predictive analysis
 * @query {string} priority - Filter by priority (URGENT, HIGH, MEDIUM, LOW, or 'all')
 * @query {number} timeframe - Analysis timeframe in days (default: 30)
 * @access Private
 */
router.get('/maintenance-recommendations', advancedAnalyticsController.getMaintenanceRecommendations);

/**
 * @route GET /api/advanced-analytics/anomalies
 * @desc Get anomaly detection results
 * @query {string} assetId - Specific asset ID (optional)
 * @query {number} timeframe - Detection timeframe in days (default: 7)
 * @query {string} severity - Filter by severity (HIGH, MEDIUM, LOW, or 'all')
 * @access Private
 */
router.get('/anomalies', advancedAnalyticsController.getAnomalyDetection);

module.exports = router;