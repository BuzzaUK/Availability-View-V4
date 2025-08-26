const alertService = require('../services/alertService');
const databaseService = require('../services/databaseService');
const logger = require('../utils/logger');

/**
 * Alert Controller
 * Handles alert management, threshold configuration, and alert history
 */
class AlertController {
  /**
   * Get active alerts
   * GET /api/alerts/active
   */
  async getActiveAlerts(req, res) {
    try {
      const alerts = alertService.getActiveAlerts();
      
      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      logger.error('❌ Error fetching active alerts', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active alerts'
      });
    }
  }

  /**
   * Get alert history
   * GET /api/alerts/history
   */
  async getAlertHistory(req, res) {
    try {
      const { limit = 100, severity, type, assetId } = req.query;
      let history = alertService.getAlertHistory(parseInt(limit));
      
      // Apply filters
      if (severity) {
        history = history.filter(alert => alert.severity === severity);
      }
      
      if (type) {
        history = history.filter(alert => alert.type === type);
      }
      
      if (assetId) {
        history = history.filter(alert => alert.assetId === assetId);
      }
      
      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      logger.error('❌ Error fetching alert history', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch alert history'
      });
    }
  }

  /**
   * Get alert thresholds
   * GET /api/alerts/thresholds
   */
  async getAlertThresholds(req, res) {
    try {
      const thresholds = alertService.thresholds;
      
      res.json({
        success: true,
        data: thresholds
      });
    } catch (error) {
      logger.error('❌ Error fetching alert thresholds', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch alert thresholds'
      });
    }
  }

  /**
   * Update alert thresholds
   * PUT /api/alerts/thresholds
   */
  async updateAlertThresholds(req, res) {
    try {
      const { thresholds } = req.body;
      
      if (!thresholds || typeof thresholds !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Invalid thresholds data provided'
        });
      }
      
      // Validate threshold structure
      const validationResult = this.validateThresholds(thresholds);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid threshold configuration',
          errors: validationResult.errors
        });
      }
      
      await alertService.updateThresholds(thresholds);
      
      logger.info('📊 Alert thresholds updated by user', {
        userId: req.user?.id,
        thresholds
      });
      
      res.json({
        success: true,
        message: 'Alert thresholds updated successfully',
        data: alertService.thresholds
      });
    } catch (error) {
      logger.error('❌ Error updating alert thresholds', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update alert thresholds'
      });
    }
  }

  /**
   * Acknowledge an alert
   * POST /api/alerts/:alertId/acknowledge
   */
  async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { notes } = req.body;
      
      const activeAlerts = alertService.getActiveAlerts();
      const alert = activeAlerts.find(a => a.id === alertId);
      
      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }
      
      // Mark alert as acknowledged
      alert.acknowledged = true;
      alert.acknowledgedBy = req.user?.id;
      alert.acknowledgedAt = new Date();
      alert.acknowledgedNotes = notes;
      
      logger.info('✅ Alert acknowledged', {
        alertId,
        userId: req.user?.id,
        notes
      });
      
      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        data: alert
      });
    } catch (error) {
      logger.error('❌ Error acknowledging alert', error);
      res.status(500).json({
        success: false,
        message: 'Failed to acknowledge alert'
      });
    }
  }

  /**
   * Clear an alert
   * DELETE /api/alerts/:alertKey
   */
  async clearAlert(req, res) {
    try {
      const { alertKey } = req.params;
      
      alertService.clearAlert(alertKey);
      
      logger.info('🗑️ Alert cleared manually', {
        alertKey,
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        message: 'Alert cleared successfully'
      });
    } catch (error) {
      logger.error('❌ Error clearing alert', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear alert'
      });
    }
  }

  /**
   * Get alert statistics
   * GET /api/alerts/statistics
   */
  async getAlertStatistics(req, res) {
    try {
      const { timeframe = 7 } = req.query; // days
      const history = alertService.getAlertHistory(1000);
      const cutoffDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
      
      const recentAlerts = history.filter(alert => alert.timestamp > cutoffDate);
      
      const statistics = {
        total: recentAlerts.length,
        bySeverity: {
          critical: recentAlerts.filter(a => a.severity === 'critical').length,
          warning: recentAlerts.filter(a => a.severity === 'warning').length
        },
        byType: {},
        byAsset: {},
        acknowledged: recentAlerts.filter(a => a.acknowledged).length,
        unacknowledged: recentAlerts.filter(a => !a.acknowledged).length,
        timeframe: timeframe
      };
      
      // Count by type
      recentAlerts.forEach(alert => {
        statistics.byType[alert.type] = (statistics.byType[alert.type] || 0) + 1;
      });
      
      // Count by asset
      recentAlerts.forEach(alert => {
        const assetName = alert.assetName || 'Unknown';
        statistics.byAsset[assetName] = (statistics.byAsset[assetName] || 0) + 1;
      });
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('❌ Error fetching alert statistics', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch alert statistics'
      });
    }
  }

  /**
   * Test alert system
   * POST /api/alerts/test
   */
  async testAlert(req, res) {
    try {
      const { type = 'test', severity = 'warning', assetId } = req.body;
      
      // Get asset info
      let asset = { id: 'test', name: 'Test Asset' };
      if (assetId) {
        const assets = await databaseService.getAllAssets();
        asset = assets.find(a => a.id === assetId) || asset;
      }
      
      // Create test alert
      const testAlert = {
        key: `test_${Date.now()}`,
        type,
        severity,
        assetId: asset.id,
        assetName: asset.name,
        message: `Test ${severity} alert for ${asset.name}`,
        value: 50,
        threshold: 75,
        metadata: {
          test: true,
          triggeredBy: req.user?.id
        }
      };
      
      await alertService.triggerAlert(testAlert);
      
      logger.info('🧪 Test alert triggered', {
        userId: req.user?.id,
        alert: testAlert
      });
      
      res.json({
        success: true,
        message: 'Test alert triggered successfully',
        data: testAlert
      });
    } catch (error) {
      logger.error('❌ Error triggering test alert', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger test alert'
      });
    }
  }

  /**
   * Validate threshold configuration
   */
  validateThresholds(thresholds) {
    const errors = [];
    const validMetrics = ['availability', 'downtime', 'frequency', 'mtbf', 'mttr'];
    const validLevels = ['critical', 'warning', 'good'];
    
    for (const [metric, levels] of Object.entries(thresholds)) {
      if (!validMetrics.includes(metric)) {
        errors.push(`Invalid metric: ${metric}`);
        continue;
      }
      
      if (typeof levels !== 'object') {
        errors.push(`Invalid levels for metric ${metric}`);
        continue;
      }
      
      for (const [level, value] of Object.entries(levels)) {
        if (!validLevels.includes(level)) {
          errors.push(`Invalid level ${level} for metric ${metric}`);
          continue;
        }
        
        if (typeof value !== 'number' || value < 0) {
          errors.push(`Invalid value for ${metric}.${level}: must be a positive number`);
        }
      }
      
      // Validate threshold order
      if (levels.critical !== undefined && levels.warning !== undefined && levels.good !== undefined) {
        if (['availability', 'mtbf'].includes(metric)) {
          // Higher is better
          if (levels.critical >= levels.warning || levels.warning >= levels.good) {
            errors.push(`Invalid threshold order for ${metric}: critical < warning < good`);
          }
        } else {
          // Lower is better
          if (levels.critical <= levels.warning || levels.warning <= levels.good) {
            errors.push(`Invalid threshold order for ${metric}: critical > warning > good`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new AlertController();