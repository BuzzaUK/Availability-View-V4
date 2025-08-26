const databaseService = require('./databaseService');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');

/**
 * Enhanced Alert Service for Advanced Notifications and Threshold Management
 * Provides real-time monitoring, configurable thresholds, and intelligent alerting
 */
class AlertService {
  constructor() {
    this.databaseService = databaseService;
    this.activeAlerts = new Map(); // Track active alerts to prevent spam
    this.alertHistory = [];
    this.io = null; // Socket.IO instance
    
    // Default alert thresholds
    this.defaultThresholds = {
      availability: {
        critical: 70,
        warning: 85,
        good: 95
      },
      downtime: {
        critical: 60, // minutes
        warning: 30,
        good: 10
      },
      frequency: {
        critical: 15, // stops per day
        warning: 10,
        good: 5
      },

      mtbf: {
        critical: 2, // hours
        warning: 4,
        good: 8
      },
      mttr: {
        critical: 30, // minutes
        warning: 15,
        good: 5
      }
    };
  }

  /**
   * Initialize alert monitoring
   */
  async initialize() {
    try {
      logger.info('🚨 Initializing Alert Service');
      
      // Load custom thresholds from database
      await this.loadCustomThresholds();
      
      // Start monitoring intervals
      this.startMonitoring();
      
      logger.info('✅ Alert Service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Alert Service', error);
      throw error;
    }
  }

  /**
   * Set Socket.IO instance for real-time notifications
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Load custom alert thresholds from database
   */
  async loadCustomThresholds() {
    try {
      const settings = await this.databaseService.getNotificationSettings();
      if (settings && settings.alertThresholds) {
        this.thresholds = { ...this.defaultThresholds, ...settings.alertThresholds };
      } else {
        this.thresholds = this.defaultThresholds;
      }
      
      logger.info('📊 Alert thresholds loaded', { thresholds: this.thresholds });
    } catch (error) {
      logger.error('❌ Failed to load custom thresholds', error);
      this.thresholds = this.defaultThresholds;
    }
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring() {
    // Monitor asset availability every 5 minutes
    setInterval(() => {
      this.checkAvailabilityAlerts();
    }, 5 * 60 * 1000);

    // Monitor downtime events every minute
    setInterval(() => {
      this.checkDowntimeAlerts();
    }, 60 * 1000);

    // Monitor performance metrics every 10 minutes
    setInterval(() => {
      this.checkPerformanceAlerts();
    }, 10 * 60 * 1000);

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000);
  }

  /**
   * Check availability-based alerts
   */
  async checkAvailabilityAlerts() {
    try {
      const assets = await this.databaseService.getAllAssets();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (const asset of assets) {
        const events = await this.databaseService.getArchivedEvents({
          assetId: asset.id,
          startDate: oneDayAgo,
          endDate: now
        });

        const availability = this.calculateAvailability(events, 24);
        await this.evaluateAvailabilityThreshold(asset, availability);
      }
    } catch (error) {
      logger.error('❌ Error checking availability alerts', error);
    }
  }

  /**
   * Check downtime-based alerts
   */
  async checkDowntimeAlerts() {
    try {
      const assets = await this.databaseService.getAllAssets();
      
      for (const asset of assets) {
        if (asset.status === 'stopped') {
          const stopDuration = this.calculateCurrentStopDuration(asset);
          await this.evaluateDowntimeThreshold(asset, stopDuration);
        }
      }
    } catch (error) {
      logger.error('❌ Error checking downtime alerts', error);
    }
  }

  /**
   * Check performance-based alerts
   */
  async checkPerformanceAlerts() {
    try {
      const assets = await this.databaseService.getAllAssets();
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const asset of assets) {
        const events = await this.databaseService.getArchivedEvents({
          assetId: asset.id,
          startDate: oneWeekAgo,
          endDate: now
        });

        const metrics = this.calculatePerformanceMetrics(events);
        await this.evaluatePerformanceThresholds(asset, metrics);
      }
    } catch (error) {
      logger.error('❌ Error checking performance alerts', error);
    }
  }

  /**
   * Evaluate availability threshold and trigger alerts
   */
  async evaluateAvailabilityThreshold(asset, availability) {
    const alertKey = `availability_${asset.id}`;
    const thresholds = this.thresholds.availability;

    let severity = 'good';
    let message = '';

    if (availability < thresholds.critical) {
      severity = 'critical';
      message = `Critical: Asset ${asset.name} availability is ${(availability || 0).toFixed(1)}% (below ${thresholds.critical}%)`;
    } else if (availability < thresholds.warning) {
      severity = 'warning';
      message = `Warning: Asset ${asset.name} availability is ${(availability || 0).toFixed(1)}% (below ${thresholds.warning}%)`;
    }

    if (severity !== 'good') {
      await this.triggerAlert({
        key: alertKey,
        type: 'availability',
        severity,
        assetId: asset.id,
        assetName: asset.name,
        message,
        value: availability,
        threshold: severity === 'critical' ? thresholds.critical : thresholds.warning,
        metadata: {
          timeframe: '24h',
          metric: 'availability_percentage'
        }
      });
    } else {
      // Clear alert if availability is back to good
      this.clearAlert(alertKey);
    }
  }

  /**
   * Evaluate downtime threshold and trigger alerts
   */
  async evaluateDowntimeThreshold(asset, downtimeMinutes) {
    const alertKey = `downtime_${asset.id}`;
    const thresholds = this.thresholds.downtime;

    let severity = 'good';
    let message = '';

    if (downtimeMinutes > thresholds.critical) {
      severity = 'critical';
      message = `Critical: Asset ${asset.name} has been down for ${downtimeMinutes} minutes (exceeds ${thresholds.critical} min)`;
    } else if (downtimeMinutes > thresholds.warning) {
      severity = 'warning';
      message = `Warning: Asset ${asset.name} has been down for ${downtimeMinutes} minutes (exceeds ${thresholds.warning} min)`;
    }

    if (severity !== 'good') {
      await this.triggerAlert({
        key: alertKey,
        type: 'downtime',
        severity,
        assetId: asset.id,
        assetName: asset.name,
        message,
        value: downtimeMinutes,
        threshold: severity === 'critical' ? thresholds.critical : thresholds.warning,
        metadata: {
          unit: 'minutes',
          metric: 'continuous_downtime'
        }
      });
    }
  }

  /**
   * Evaluate availability thresholds and trigger alerts
   */
  async evaluatePerformanceThresholds(asset, metrics) {
    // Check MTBF (Mean Time Between Failures)
    if (metrics.mtbf !== null) {
      await this.evaluateMetricThreshold(asset, 'mtbf', metrics.mtbf, this.thresholds.mtbf, 'hours', true);
    }

    // Check MTTR (Mean Time To Repair)
    if (metrics.mttr !== null) {
      await this.evaluateMetricThreshold(asset, 'mttr', metrics.mttr, this.thresholds.mttr, 'minutes');
    }

    // Check stop frequency
    if (metrics.stopFrequency !== null) {
      await this.evaluateMetricThreshold(asset, 'frequency', metrics.stopFrequency, this.thresholds.frequency, 'stops/day');
    }
  }

  /**
   * Generic metric threshold evaluation
   */
  async evaluateMetricThreshold(asset, metricType, value, thresholds, unit, higherIsBetter = false) {
    const alertKey = `${metricType}_${asset.id}`;
    let severity = 'good';
    let message = '';

    if (higherIsBetter) {
      // For metrics like MTBF where higher values are better
      if (value < thresholds.critical) {
        severity = 'critical';
        message = `Critical: Asset ${asset.name} ${metricType.toUpperCase()} is ${(value || 0).toFixed(1)} ${unit} (below ${thresholds.critical} ${unit})`;
      } else if (value < thresholds.warning) {
        severity = 'warning';
        message = `Warning: Asset ${asset.name} ${metricType.toUpperCase()} is ${(value || 0).toFixed(1)} ${unit} (below ${thresholds.warning} ${unit})`;
      }
    } else {
      // For metrics like MTTR, downtime where lower values are better
      if (value > thresholds.critical) {
        severity = 'critical';
        message = `Critical: Asset ${asset.name} ${metricType.toUpperCase()} is ${(value || 0).toFixed(1)} ${unit} (exceeds ${thresholds.critical} ${unit})`;
      } else if (value > thresholds.warning) {
        severity = 'warning';
        message = `Warning: Asset ${asset.name} ${metricType.toUpperCase()} is ${(value || 0).toFixed(1)} ${unit} (exceeds ${thresholds.warning} ${unit})`;
      }
    }

    if (severity !== 'good') {
      await this.triggerAlert({
        key: alertKey,
        type: metricType,
        severity,
        assetId: asset.id,
        assetName: asset.name,
        message,
        value,
        threshold: severity === 'critical' ? thresholds.critical : thresholds.warning,
        metadata: {
          unit,
          metric: metricType,
          higherIsBetter
        }
      });
    } else {
      this.clearAlert(alertKey);
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(alertData) {
    const existingAlert = this.activeAlerts.get(alertData.key);
    const now = new Date();

    // Prevent spam - don't send same alert within cooldown period
    if (existingAlert && (now - existingAlert.lastSent) < 15 * 60 * 1000) { // 15 min cooldown
      return;
    }

    const alert = {
      ...alertData,
      id: this.generateAlertId(),
      timestamp: now,
      lastSent: now,
      acknowledged: false
    };

    // Store active alert
    this.activeAlerts.set(alertData.key, alert);
    this.alertHistory.push(alert);

    // Emit real-time alert via Socket.IO
    if (this.io) {
      this.io.emit('alert', alert);
    }

    // Send notifications
    await this.sendAlertNotifications(alert);

    logger.info('🚨 Alert triggered', {
      type: alert.type,
      severity: alert.severity,
      asset: alert.assetName,
      message: alert.message
    });
  }

  /**
   * Send alert notifications through configured channels
   */
  async sendAlertNotifications(alert) {
    try {
      const notificationSettings = await this.databaseService.getNotificationSettings();
      
      if (!notificationSettings || !notificationSettings.enabled) {
        return;
      }

      // Determine which notification types to send based on severity
      const eventType = this.getEventTypeForAlert(alert);
      const eventConfig = notificationSettings.eventNotifications[eventType];

      if (!eventConfig || !eventConfig.enabled) {
        return;
      }

      // Send email notifications
      if (eventConfig.channels.includes('email') && notificationSettings.channels.email) {
        await this.sendEmailAlert(alert, eventConfig.recipients);
      }

      // Send in-app notifications (via socket)
      if (eventConfig.channels.includes('inApp') && notificationSettings.channels.inApp) {
        await this.sendInAppAlert(alert);
      }

      // Send SMS notifications (if configured)
      if (eventConfig.channels.includes('sms') && notificationSettings.channels.sms) {
        await this.sendSMSAlert(alert, eventConfig.recipients);
      }
    } catch (error) {
      logger.error('❌ Failed to send alert notifications', error);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert, recipients) {
    try {
      const subject = `${alert.severity.toUpperCase()} Alert: ${alert.assetName}`;
      const html = this.generateAlertEmailHTML(alert);

      // If no specific recipients, send to all users with email notifications enabled
      if (!recipients || recipients.length === 0) {
        const users = await this.databaseService.getAllUsers();
        recipients = users.filter(user => user.email).map(user => user.email);
      }

      for (const recipient of recipients) {
        await sendEmail({
          to: recipient,
          subject,
          html
        });
      }

      logger.info('📧 Email alert sent', { recipients: recipients.length });
    } catch (error) {
      logger.error('❌ Failed to send email alert', error);
    }
  }

  /**
   * Send in-app alert (via socket)
   */
  async sendInAppAlert(alert) {
    // This would integrate with your socket system
    // For now, we'll just log it
    logger.info('📱 In-app alert triggered', alert);
  }

  /**
   * Send SMS alert
   */
  async sendSMSAlert(alert, recipients) {
    // SMS implementation would go here
    logger.info('📱 SMS alert triggered', alert);
  }

  /**
   * Clear an active alert
   */
  clearAlert(alertKey) {
    if (this.activeAlerts.has(alertKey)) {
      const alert = this.activeAlerts.get(alertKey);
      this.activeAlerts.delete(alertKey);
      
      // Emit real-time alert cleared via Socket.IO
      if (this.io) {
        this.io.emit('alert_cleared', { key: alertKey, message: alert.message });
      }
      
      logger.info('✅ Alert cleared', { key: alertKey });
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Update alert thresholds
   */
  async updateThresholds(newThresholds) {
    try {
      this.thresholds = { ...this.thresholds, ...newThresholds };
      
      // Save to database
      const notificationSettings = await this.databaseService.getNotificationSettings();
      const updatedSettings = {
        ...notificationSettings,
        alertThresholds: this.thresholds
      };
      
      await this.databaseService.updateNotificationSettings(updatedSettings);
      
      logger.info('📊 Alert thresholds updated', { thresholds: this.thresholds });
      return true;
    } catch (error) {
      logger.error('❌ Failed to update thresholds', error);
      throw error;
    }
  }

  // Helper methods
  calculateAvailability(events, hours) {
    if (!events || events.length === 0) return 100;
    
    const totalTime = hours * 60; // minutes
    const downtime = events
      .filter(event => event.type === 'asset_stopped')
      .reduce((total, event) => total + (event.duration || 0), 0);
    
    return Math.max(0, ((totalTime - downtime) / totalTime) * 100);
  }

  calculateCurrentStopDuration(asset) {
    if (!asset.lastStopTime) return 0;
    return Math.floor((new Date() - new Date(asset.lastStopTime)) / (1000 * 60));
  }

  calculatePerformanceMetrics(events) {
    // Simplified metrics calculation
    const stops = events.filter(e => e.type === 'asset_stopped');
    const totalDowntime = stops.reduce((sum, stop) => sum + (stop.duration || 0), 0);
    const totalTime = 7 * 24 * 60; // 7 days in minutes
    
    return {
      oee: Math.max(0, ((totalTime - totalDowntime) / totalTime) * 100),
      mtbf: stops.length > 0 ? (totalTime - totalDowntime) / stops.length / 60 : null, // hours
      mttr: stops.length > 0 ? totalDowntime / stops.length : null, // minutes
      stopFrequency: stops.length / 7 // stops per day
    };
  }

  getEventTypeForAlert(alert) {
    switch (alert.type) {
      case 'availability':
      case 'downtime':
        return 'assetStopped';
      case 'mtbf':
      case 'mttr':
      case 'frequency':
        return 'assetWarning';
      default:
        return 'assetWarning';
    }
  }

  generateAlertEmailHTML(alert) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${alert.severity === 'critical' ? '#d32f2f' : '#f57c00'}; color: white; padding: 20px; text-align: center;">
          <h1>${alert.severity.toUpperCase()} ALERT</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <h2>Asset: ${alert.assetName}</h2>
          <p><strong>Alert Type:</strong> ${alert.type.toUpperCase()}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Current Value:</strong> ${alert.value} ${alert.metadata?.unit || ''}</p>
          <p><strong>Threshold:</strong> ${alert.threshold} ${alert.metadata?.unit || ''}</p>
          <p><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>This is an automated alert from the Asset Logger System</p>
        </div>
      </div>
    `;
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  cleanupOldAlerts() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > oneDayAgo);
  }
}

module.exports = new AlertService();