const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');
const alertController = require('../controllers/alertController');

// @desc    Get active alerts
// @route   GET /api/alerts/active
// @access  Private
router.get('/active', authenticateJWT, alertController.getActiveAlerts);

// @desc    Get alert history
// @route   GET /api/alerts/history
// @access  Private
router.get('/history', authenticateJWT, alertController.getAlertHistory);

// @desc    Get alert statistics
// @route   GET /api/alerts/statistics
// @access  Private
router.get('/statistics', authenticateJWT, alertController.getAlertStatistics);

// @desc    Get alert thresholds
// @route   GET /api/alerts/thresholds
// @access  Private
router.get('/thresholds', authenticateJWT, alertController.getAlertThresholds);

// @desc    Update alert thresholds
// @route   PUT /api/alerts/thresholds
// @access  Private (Super Admin/Admin/Manager)
router.put('/thresholds', authenticateJWT, authorizeRoles('super_admin', 'admin', 'manager'), alertController.updateAlertThresholds);

// @desc    Acknowledge an alert
// @route   POST /api/alerts/:alertId/acknowledge
// @access  Private
router.post('/:alertId/acknowledge', authenticateJWT, alertController.acknowledgeAlert);

// @desc    Clear an alert
// @route   DELETE /api/alerts/:alertKey
// @access  Private (Super Admin/Admin/Manager)
router.delete('/:alertKey', authenticateJWT, authorizeRoles('super_admin', 'admin', 'manager'), alertController.clearAlert);

// @desc    Test alert system
// @route   POST /api/alerts/test
// @access  Private (Super Admin/Admin/Manager)
router.post('/test', authenticateJWT, authorizeRoles('super_admin', 'admin', 'manager'), alertController.testAlert);

module.exports = router;