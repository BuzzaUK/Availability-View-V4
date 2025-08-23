const { sequelize } = require('../config/database');
const { User, Logger, Asset, Event, Shift, Archive, Settings } = require('../models/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class DatabaseService {
  constructor() {
    this.sequelize = sequelize;
    this.initialized = false;
    this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      // Test connection
      await sequelize.authenticate();
      console.log('✅ Database connected successfully');
      
      // Sync database tables
      // In development with SQLite, allow Sequelize to alter tables to add missing columns/indexes
// Sync database schema
      const isDevSqlite = sequelize.getDialect() === 'sqlite' && (process.env.NODE_ENV || 'development') === 'development';
      // Use conservative sync to avoid foreign key constraint issues
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ Database tables synchronized');
      
      this.initialized = true;
      
      // Ensure essential data exists
      await this.ensureEssentialData();
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  async ensureEssentialData() {
    try {
      // Ensure admin user exists
      const adminUser = await User.findOne({ where: { email: 'admin@example.com' } });
      if (!adminUser) {
        await User.create({
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'admin123',
          role: 'admin',
          isActive: true,
          receive_reports: false
        });
        console.log('✅ Admin user created');
      }

      // Ensure test user exists
      const testUser = await User.findOne({ where: { email: 'simon@example.com' } });
      if (!testUser) {
        await User.create({
          name: 'Simon Test User',
          email: 'simon@example.com',
          password: 'simon123',
          role: 'manager',
          isActive: true,
          receive_reports: true
        });
        console.log('✅ Test user created');
      }

      // Ensure ESP32_001 logger exists
      const logger = await Logger.findOne({ where: { logger_id: 'ESP32_001' } });
      if (!logger) {
        const admin = await User.findOne({ where: { email: 'admin@example.com' } });
        
        await Logger.create({
          logger_id: 'ESP32_001',
          user_account_id: admin.id,
          logger_name: 'Production Floor Logger',
          status: 'online',
          ip_address: '192.168.1.100',
          firmware_version: '2.0.0',
          last_seen: new Date()
        });
        console.log('✅ ESP32_001 logger created');
      }

      // Ensure default settings exist
      const existingSettings = await Settings.findOne({ where: { key: 'notification_settings' } });
      if (!existingSettings) {
        await Settings.create({
          key: 'notification_settings',
          value: {
            email_notifications: true,
            sms_notifications: false,
            push_notifications: true,
            notification_frequency: 'immediate'
          },
          type: 'notification'
        });
        console.log('✅ Default notification settings created');
      }

      // Create sample assets for demonstration
      const existingAssets = await Asset.count();
      if (existingAssets === 0) {
        const admin = await User.findOne({ where: { email: 'admin@example.com' } });
        const esp32Logger = await Logger.findOne({ where: { logger_id: 'ESP32_001' } });
        
        if (admin && esp32Logger) {
          // Create sample assets
          await Asset.create({
            name: 'Production Line A',
            description: 'Main production conveyor belt',
            type: 'conveyor',
            pin_number: 4,
            logger_id: esp32Logger.id,
            user_id: admin.id,
            short_stop_threshold: 5,
            long_stop_threshold: 30,
            downtime_reasons: ['Maintenance', 'Breakdown', 'Setup', 'Material shortage', 'Quality issue'],
            thresholds: {
              availability: 85,
              performance: 85,
              quality: 95,
              oee: 75
            },
            settings: {
              idleTimeThreshold: 5,
              warningTimeThreshold: 10,
              collectQualityData: true,
              collectPerformanceData: true
            }
          });

          await Asset.create({
            name: 'Hydraulic Press #1',
            description: 'Primary forming press',
            type: 'press',
            pin_number: 5,
            logger_id: esp32Logger.id,
            user_id: admin.id,
            short_stop_threshold: 3,
            long_stop_threshold: 15,
            downtime_reasons: ['Maintenance', 'Tool change', 'Material jam', 'Safety stop'],
            thresholds: {
              availability: 90,
              performance: 80,
              quality: 98,
              oee: 70
            },
            settings: {
              idleTimeThreshold: 3,
              warningTimeThreshold: 8,
              collectQualityData: true,
              collectPerformanceData: true
            }
          });

          console.log('✅ Sample assets created');
        }
      }
    } catch (error) {
      console.error('⚠️ Error ensuring essential data:', error);
    }
  }

  // User methods
  async getAllUsers() {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    // Convert to plain objects but preserve JSON fields
    return users.map(user => user.toJSON());
  }

  async findUserByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async findUserById(id) {
    const user = await User.findByPk(id);
    return user ? user.toJSON() : null;
  }

  async createUser(userData) {
    return await User.create(userData);
  }

  async updateUser(id, updates) {
    const [updatedRowsCount] = await User.update(updates, { where: { id } });
    if (updatedRowsCount > 0) {
      const user = await User.findByPk(id);
      return user ? user.toJSON() : null;
    }
    return null;
  }

  async deleteUser(id) {
    const deletedRowsCount = await User.destroy({ where: { id } });
    return deletedRowsCount > 0;
  }

  async deleteLogger(id) {
    const deletedRowsCount = await Logger.destroy({ where: { id } });
    return deletedRowsCount > 0;
  }

  async deleteAsset(id) {
    // First delete all events for this asset
    await Event.destroy({ where: { asset_id: id } });
    // Then delete the asset
    const deletedRowsCount = await Asset.destroy({ where: { id } });
    return deletedRowsCount > 0;
  }

  // Logger methods
  async getAllLoggers() {
    return await Logger.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Asset, as: 'assets' }
      ]
    });
  }

  async findLoggerById(id) {
    return await Logger.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Asset, as: 'assets' }
      ]
    });
  }

  async findLoggerByLoggerId(loggerId) {
    console.log('🔍 DATABASE SERVICE - findLoggerByLoggerId called with:', loggerId);
    
    const result = await Logger.findOne({ 
      where: { logger_id: loggerId },
      include: [{ model: Asset, as: 'assets' }]
    });
    console.log('🔍 DATABASE SERVICE - Result:', result ? 'Found' : 'Not found');
    return result;
  }

  async getLoggersByUserId(userId) {
    return await Logger.findAll({
      where: { user_account_id: userId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Asset, as: 'assets' }
      ]
    });
  }

  async createLogger(loggerData) {
    return await Logger.create(loggerData);
  }

  async updateLogger(id, updates) {
    const [updatedRowsCount] = await Logger.update(updates, { where: { id } });
    if (updatedRowsCount > 0) {
      return await Logger.findByPk(id);
    }
    return null;
  }

  async updateLoggerStatus(loggerId, status) {
    const [updatedRowsCount] = await Logger.update(
      { status, last_seen: new Date() }, 
      { where: { logger_id: loggerId } }
    );
    return updatedRowsCount > 0;
  }

  // Asset methods
  async getAllAssets() {
    return await Asset.findAll({
      include: [{ model: Logger, as: 'logger' }]
    });
  }

  async getAssetsByLoggerId(loggerId) {
    return await Asset.findAll({ 
      where: { logger_id: loggerId },
      include: [{ model: Logger, as: 'logger' }]
    });
  }

  async findAssetById(id) {
    return await Asset.findByPk(id, {
      include: [{ model: Logger, as: 'logger' }]
    });
  }

  async findAssetByName(name) {
    return await Asset.findOne({
      where: { name },
      include: [{ model: Logger, as: 'logger' }]
    });
  }

  async findAssetByLoggerAndPin(loggerId, pinNumber) {
    return await Asset.findOne({
      where: { 
        logger_id: loggerId,
        pin_number: pinNumber 
      },
      include: [{ model: Logger, as: 'logger' }]
    });
  }

  async createAsset(assetData) {
    return await Asset.create(assetData);
  }

  async updateAsset(id, updates) {
    const [updatedRowsCount] = await Asset.update(updates, { where: { id } });
    if (updatedRowsCount > 0) {
      return await Asset.findByPk(id);
    }
    return null;
  }

  // Event methods
  async getAllEvents(options = {}) {
    const { Op } = require('sequelize');
    const queryOptions = {
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'name'] },
        { model: Logger, as: 'logger', attributes: ['id', 'logger_id'] }
      ],
      order: [['timestamp', 'DESC']]
    };

    // Build where clause for filtering
    const whereClause = {};

    // Asset filter
    if (options.asset_id) {
      whereClause.asset_id = options.asset_id;
    }

    // Event type filter
    if (options.event_type) {
      whereClause.event_type = options.event_type;
    }

    // State filter (check both previous_state and new_state)
    if (options.state) {
      whereClause[Op.or] = [
        { previous_state: options.state },
        { new_state: options.state }
      ];
    }

    // Date range filter
    if (options.startDate || options.endDate) {
      whereClause.timestamp = {};
      if (options.startDate) {
        whereClause.timestamp[Op.gte] = new Date(options.startDate);
      }
      if (options.endDate) {
        whereClause.timestamp[Op.lte] = new Date(options.endDate);
      }
    }

    // Search filter
    if (options.search) {
      const searchTerm = `%${options.search.toLowerCase()}%`;
      whereClause[Op.or] = [
        { event_type: { [Op.iLike]: searchTerm } },
        { stop_reason: { [Op.iLike]: searchTerm } },
        { '$asset.name$': { [Op.iLike]: searchTerm } }
      ];
    }

    if (Object.keys(whereClause).length > 0) {
      queryOptions.where = whereClause;
    }

    // Pagination
    if (options.limit) queryOptions.limit = options.limit;
    if (options.offset) queryOptions.offset = options.offset;

    return await Event.findAndCountAll(queryOptions);
  }

  async createEvent(eventData) {
    return await Event.create(eventData);
  }

  async deleteEventsByIds(eventIds) {
    if (!eventIds || eventIds.length === 0) {
      return 0;
    }
    
    const deletedCount = await Event.destroy({
      where: {
        id: eventIds
      }
    });
    
    console.log(`Deleted ${deletedCount} events from database`);
    return deletedCount;
  }

  async getEventsByAssetId(assetId, options = {}) {
    const { Op } = require('sequelize');
    const queryOptions = {
      where: { asset_id: assetId },
      include: [{ model: Asset, as: 'asset' }],
      order: [['timestamp', 'DESC']]
    };

    if (options.limit) queryOptions.limit = options.limit;
    if (options.startDate && options.endDate) {
      queryOptions.where.timestamp = {
        [Op.between]: [options.startDate, options.endDate]
      };
    }

    return await Event.findAll(queryOptions);
  }

  // Settings methods
  async getSettings() {
    const settings = await Settings.findAll();
    const notificationSettings = settings.find(s => s.key === 'notification_settings');
    return notificationSettings ? notificationSettings.value : {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      notification_frequency: 'immediate'
    };
  }

  async updateSettings(settingsData) {
    await Settings.upsert({
      key: 'notification_settings',
      value: settingsData,
      type: 'notification'
    });
    return settingsData;
  }

  // Notification settings methods (replaces memoryDB)
  async getNotificationSettings() {
    const setting = await Settings.findOne({ where: { key: 'notification_settings' } });
    if (setting) {
      return setting.value;
    }
    
    // Return default notification settings
    const defaultSettings = {
      enabled: true,
      channels: {
        inApp: true,
        email: true,
        sms: false
      },
      emailSettings: {
        smtpServer: process.env.EMAIL_HOST || '',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        username: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
        fromEmail: process.env.EMAIL_USER || '',
        useTLS: true
      },
      smsSettings: {
        provider: process.env.SMS_PROVIDER || 'twilio',
        accountSid: process.env.SMS_ACCOUNT_SID || '',
        authToken: process.env.SMS_AUTH_TOKEN || '',
        fromNumber: process.env.SMS_FROM_NUMBER || ''
      },
      shiftSettings: {
        enabled: false,
        shiftTimes: ['08:00', '16:00', '00:00'],
        emailFormat: 'pdf',
        autoSend: false
      },
      eventNotifications: {
        assetDown: {
          enabled: true,
          channels: ['email'],
          recipients: [],
          minDuration: 5
        },
        assetUp: {
          enabled: true,
          channels: ['email'],
          recipients: [],
          minDuration: 0
        },
        longStop: {
          enabled: true,
          channels: ['email'],
          recipients: [],
          minDuration: 30
        }
      },
      refreshInterval: 30,
      autoRefresh: true
    };
    
    // Save defaults and return
    await this.updateNotificationSettings(defaultSettings);
    return defaultSettings;
  }

  async updateNotificationSettings(settingsData) {
    await Settings.upsert({
      key: 'notification_settings',
      value: settingsData,
      type: 'notification',
      description: 'Notification configuration settings'
    });
    return settingsData;
  }

  // General settings methods (replaces memoryDB general settings)
  async getGeneralSettings() {
    const setting = await Settings.findOne({ where: { key: 'general_settings' } });
    if (setting) {
      return setting.value;
    }
    
    // Return default general settings
    const defaultSettings = {
      companyName: 'Industrial Monitoring Corp',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      language: 'en',
      theme: 'light',
      autoRefresh: true,
      refreshInterval: 30,
      enableNotifications: true,
      enableEmailAlerts: false,
      enableSmsAlerts: false,
      dataRetentionDays: 90,
      autoBackup: true,
      autoBackupFrequency: 'daily',
    };
    
    // Save defaults and return
    await this.updateGeneralSettings(defaultSettings);
    return defaultSettings;
  }

  async updateGeneralSettings(settingsData) {
    await Settings.upsert({
      key: 'general_settings',
      value: settingsData,
      type: 'general',
      description: 'General application settings'
    });
    return settingsData;
  }

  // Configuration methods (replaces memoryDB config)
  async getConfig() {
    const setting = await Settings.findOne({ where: { key: 'application_config' } });
    if (setting) {
      return setting.value;
    }
    
    // Return default config
    const defaultConfig = {
      downtime_reasons: [],
      shift_schedules: [],
      report_recipients: [],
      report_schedule: {
        frequency: 'end_of_shift',
        enabled: false
      },
      company_name: 'Industrial Monitoring Corp',
      logo_url: '',
      micro_stop_threshold: 60
    };
    
    // Save defaults and return
    await this.updateConfig(defaultConfig);
    return defaultConfig;
  }

  async updateConfig(configData) {
    const currentConfig = await this.getConfig();
    const updatedConfig = { ...currentConfig, ...configData };
    
    await Settings.upsert({
      key: 'application_config',
      value: updatedConfig,
      type: 'system',
      description: 'Application configuration data'
    });
    return updatedConfig;
  }

  // Specific configuration methods
  async getDowntimeReasons() {
    const config = await this.getConfig();
    return config.downtime_reasons || [];
  }

  async addDowntimeReason(reason) {
    const config = await this.getConfig();
    const newReason = {
      _id: Date.now(),
      ...reason
    };
    config.downtime_reasons = [...(config.downtime_reasons || []), newReason];
    await this.updateConfig(config);
    return newReason;
  }

  async updateDowntimeReason(id, updates) {
    const config = await this.getConfig();
    const reasons = config.downtime_reasons || [];
    const reasonIndex = reasons.findIndex(r => r._id == id);
    
    if (reasonIndex === -1) return null;
    
    reasons[reasonIndex] = { ...reasons[reasonIndex], ...updates };
    await this.updateConfig({ downtime_reasons: reasons });
    return reasons[reasonIndex];
  }

  async deleteDowntimeReason(id) {
    const config = await this.getConfig();
    const reasons = config.downtime_reasons || [];
    const filteredReasons = reasons.filter(r => r._id != id);
    
    if (filteredReasons.length === reasons.length) return false;
    
    await this.updateConfig({ downtime_reasons: filteredReasons });
    return true;
  }

  async getShiftSchedules() {
    const config = await this.getConfig();
    return config.shift_schedules || [];
  }

  async addShiftSchedule(schedule) {
    const config = await this.getConfig();
    const newSchedule = {
      _id: Date.now(),
      ...schedule
    };
    config.shift_schedules = [...(config.shift_schedules || []), newSchedule];
    await this.updateConfig(config);
    return newSchedule;
  }

  async updateShiftSchedule(id, updates) {
    const config = await this.getConfig();
    const schedules = config.shift_schedules || [];
    const scheduleIndex = schedules.findIndex(s => s._id == id);
    
    if (scheduleIndex === -1) return null;
    
    schedules[scheduleIndex] = { ...schedules[scheduleIndex], ...updates };
    await this.updateConfig({ shift_schedules: schedules });
    return schedules[scheduleIndex];
  }

  async deleteShiftSchedule(id) {
    const config = await this.getConfig();
    const schedules = config.shift_schedules || [];
    const filteredSchedules = schedules.filter(s => s._id != id);
    
    if (filteredSchedules.length === schedules.length) return false;
    
    await this.updateConfig({ shift_schedules: filteredSchedules });
    return true;
  }

  async getReportRecipients() {
    const config = await this.getConfig();
    return config.report_recipients || [];
  }

  async addReportRecipient(recipient) {
    const config = await this.getConfig();
    const newRecipient = {
      _id: Date.now(),
      ...recipient
    };
    config.report_recipients = [...(config.report_recipients || []), newRecipient];
    await this.updateConfig(config);
    return newRecipient;
  }

  async updateReportRecipient(id, updates) {
    const config = await this.getConfig();
    const recipients = config.report_recipients || [];
    const recipientIndex = recipients.findIndex(r => r._id == id);
    
    if (recipientIndex === -1) return null;
    
    recipients[recipientIndex] = { ...recipients[recipientIndex], ...updates };
    await this.updateConfig({ report_recipients: recipients });
    return recipients[recipientIndex];
  }

  async deleteReportRecipient(id) {
    const config = await this.getConfig();
    const recipients = config.report_recipients || [];
    const filteredRecipients = recipients.filter(r => r._id != id);
    
    if (filteredRecipients.length === recipients.length) return false;
    
    await this.updateConfig({ report_recipients: filteredRecipients });
    return true;
  }

  async updateReportSchedule(scheduleData) {
    const config = await this.getConfig();
    config.report_schedule = { ...config.report_schedule, ...scheduleData };
    await this.updateConfig(config);
    return config.report_schedule;
  }

  // Shift methods
  async createShift(shiftData) {
    return await Shift.create(shiftData);
  }

  async getShifts() {
    return await Shift.findAll({
      where: {
        archived: false
      },
      order: [['start_time', 'DESC']]
    });
  }

  async getAllShifts() {
    return await this.getShifts();
  }

  async findShiftById(id) {
    return await Shift.findOne({
      where: {
        id: id,
        archived: false
      }
    });
  }

  async updateShift(id, updates) {
    const [updatedRowsCount] = await Shift.update(updates, { where: { id } });
    if (updatedRowsCount > 0) {
      return await Shift.findByPk(id);
    }
    return null;
  }

  async getCurrentShift() {
    return await Shift.findOne({
      where: { 
        status: 'active',
        archived: false
      },
      order: [['start_time', 'DESC']]
    });
  }

  async endShift(shiftId, endData) {
    const [updatedRowsCount] = await Shift.update(
      { ...endData, status: 'completed', end_time: new Date() },
      { where: { id: shiftId } }
    );
    if (updatedRowsCount > 0) {
      return await Shift.findByPk(shiftId);
    }
    return null;
  }

  async getShiftsByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Shift.findAll({
      where: {
        archived: false,
        start_time: {
          [sequelize.Op.between]: [startOfDay, endOfDay]
        }
      },
      order: [['start_time', 'ASC']]
    });
  }

  // Archive methods
  async getAllArchives() {
    return await Archive.findAll({
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']]
    });
  }

  async findArchiveById(id) {
    return await Archive.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }]
    });
  }

  async createArchive(archiveData) {
    try {
      console.log('📦 DatabaseService: Creating archive with title:', archiveData.title);
      
      // Validate archive data integrity
      if (!archiveData.title || !archiveData.archive_type) {
        throw new Error('Archive title and type are required');
      }
      
      // Ensure archived_data is properly structured
      if (archiveData.archived_data && typeof archiveData.archived_data !== 'object') {
        throw new Error('Archived data must be a valid object');
      }
      
      // Add data integrity checksum for verification
      if (archiveData.archived_data) {
        const dataString = JSON.stringify(archiveData.archived_data);
        archiveData.data_checksum = require('crypto')
          .createHash('md5')
          .update(dataString)
          .digest('hex');
        archiveData.data_size = dataString.length;
      }
      
      const archive = await Archive.create(archiveData);
      console.log('📦 DatabaseService: Archive created successfully with ID:', archive.id);
      return archive;
    } catch (error) {
      console.error('❌ DatabaseService: Failed to create archive:', error.message);
      console.error('❌ Archive data:', JSON.stringify(archiveData, null, 2));
      throw error;
    }
  }

  /**
   * Verify archive data integrity
   */
  async verifyArchiveIntegrity(archiveId) {
    try {
      const archive = await this.findArchiveById(archiveId);
      if (!archive) {
        return { valid: false, error: 'Archive not found' };
      }
      
      if (!archive.data_checksum || !archive.archived_data) {
        return { valid: true, warning: 'No checksum available for verification' };
      }
      
      const dataString = JSON.stringify(archive.archived_data);
      const currentChecksum = require('crypto')
        .createHash('md5')
        .update(dataString)
        .digest('hex');
      
      const isValid = currentChecksum === archive.data_checksum;
      
      return {
        valid: isValid,
        originalChecksum: archive.data_checksum,
        currentChecksum: currentChecksum,
        dataSize: archive.data_size,
        currentSize: dataString.length
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get events for archiving with enhanced data integrity
   */
  async getEventsForArchiving(options = {}) {
    try {
      const { Op } = require('sequelize');
      const queryOptions = {
        include: [
          { model: Asset, as: 'asset', attributes: ['id', 'name', 'logger_id'] },
          { model: Logger, as: 'logger', attributes: ['id', 'logger_id'] }
        ],
        order: [['timestamp', 'ASC']] // Chronological order for archiving
      };

      const whereClause = {};

      // Date range filter (required for archiving)
      if (options.startDate && options.endDate) {
        whereClause.timestamp = {
          [Op.between]: [new Date(options.startDate), new Date(options.endDate)]
        };
      }

      // Shift ID filter
      if (options.shift_id) {
        whereClause.shift_id = options.shift_id;
      }

      // Asset filter
      if (options.asset_ids && options.asset_ids.length > 0) {
        whereClause.asset_id = { [Op.in]: options.asset_ids };
      }

      queryOptions.where = whereClause;

      const result = await Event.findAndCountAll(queryOptions);
      
      // Add metadata for archiving
      const archiveMetadata = {
        totalEvents: result.count,
        dateRange: {
          start: options.startDate,
          end: options.endDate
        },
        queryTimestamp: new Date().toISOString(),
        dataIntegrity: {
          verified: true,
          checksum: require('crypto')
            .createHash('md5')
            .update(JSON.stringify(result.rows))
            .digest('hex')
        }
      };
      
      return {
        events: result.rows,
        metadata: archiveMetadata
      };
    } catch (error) {
      console.error('❌ Error getting events for archiving:', error.message);
      throw error;
    }
  }

  async updateArchive(id, updates) {
    const [updatedRowsCount] = await Archive.update(updates, { where: { id } });
    if (updatedRowsCount > 0) {
      return await Archive.findByPk(id);
    }
    return null;
  }

  async deleteArchive(id) {
    const deletedRowsCount = await Archive.destroy({ where: { id } });
    return deletedRowsCount > 0;
  }

  // Data retention and cleanup
  async cleanupOldEvents(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedCount = await Event.destroy({
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.lt]: cutoffDate
        }
      }
    });
    console.log(`Cleaned up ${deletedCount} old events from database`);
    return deletedCount;
  }

  // Auth helpers
  async comparePassword(enteredPassword, hashedPassword) {
    return bcrypt.compare(enteredPassword, hashedPassword);
  }

  generateJWT(user) {
    const payload = { id: user.id || user._id, role: user.role };
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }
}

module.exports = new DatabaseService();