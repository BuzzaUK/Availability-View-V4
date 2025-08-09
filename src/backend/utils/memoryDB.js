const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class MemoryDB {
  constructor() {
    // Initialize arrays
    this.users = [];
    this.loggers = [];
    this.assets = [];
    this.events = [];
    this.shifts = [];
    this.configs = [];
    this.archives = [];
    this.backups = [];
    this.reports = [];
    this.shiftPatterns = [];
    this.shiftReports = [];
    this.settings = []; // Add settings storage
    this.nextId = 1;

    // Create default admin user if no users exist
    if (this.users.length === 0) {
      this.createDefaultUser();
      this.createSampleData();
      this.createDefaultSettings(); // Initialize default settings
    } else {
      // Migrate existing users to include new fields
      this.migrateExistingUsers();
    }

    // Ensure nextId is always greater than any existing _id across all entities
    const allIds = [
      ...this.users.map(u => typeof u._id === 'number' ? u._id : 0),
      ...this.loggers.map(l => typeof l._id === 'number' ? l._id : 0),
      ...this.assets.map(a => typeof a._id === 'number' ? a._id : 0),
      ...this.events.map(e => typeof e._id === 'number' ? e._id : 0),
      ...this.shifts.map(s => typeof s._id === 'number' ? s._id : 0),
      ...this.configs.map(c => typeof c._id === 'number' ? c._id : 0),
      ...this.archives.map(a => typeof a._id === 'number' ? a._id : 0),
      ...this.backups.map(b => typeof b._id === 'number' ? b._id : 0),
      ...this.reports.map(r => typeof r._id === 'number' ? r._id : 0),
      ...this.shiftPatterns.map(sp => typeof sp._id === 'number' ? sp._id : 0),
      ...this.shiftReports.map(sr => typeof sr._id === 'number' ? sr._id : 0),
      ...this.settings.map(s => typeof s._id === 'number' ? s._id : 0)
    ];
    
    if (allIds.length > 0) {
      this.nextId = Math.max(...allIds) + 1;
    }
  }

  // Create default notification settings
  createDefaultSettings() {
    const defaultNotificationSettings = {
      _id: this.nextId++,
      type: 'notification',
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
        shiftTimes: ['0800', '1600', '0000'],
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
      autoRefresh: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    this.settings.push(defaultNotificationSettings);
    console.log('Default notification settings created');
  }

  // Migration method for existing users
  migrateExistingUsers() {
    this.users.forEach(user => {
      // Add missing fields to existing users
      if (user.isActive === undefined) {
        user.isActive = true;
      }
      if (!user.shiftReportPreferences) {
        user.shiftReportPreferences = {
          enabled: false,
          shifts: [],
          emailFormat: 'pdf'
        };
      }
      if (!user.createdAt && user.created_at) {
        user.createdAt = user.created_at;
      }
    });
    console.log('Migrated existing users with new fields');
  }

  async createDefaultUser() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Use fixed ID for admin user to maintain consistency across restarts
    this.users.push({
      _id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      receive_reports: false,
      shiftReportPreferences: {
        enabled: false,
        shifts: [],
        emailFormat: 'pdf'
      },
      created_at: new Date(),
      createdAt: new Date(), // Add this for frontend compatibility
      updated_at: new Date(),
      last_login: null
    });
    
    // Start nextId from 2 to avoid conflicts with admin user
    this.nextId = 2;
    
    console.log('Default admin user created: admin@example.com / admin123');
  }

  createSampleData() {
    // Create sample logger
    const logger1 = this.createLogger({
      logger_id: 'ESP32_001',
      user_account_id: 1, // Admin user
      logger_name: 'Production Floor Logger',
      status: 'online',
      ip_address: '192.168.1.100',
      firmware_version: '2.0.0'
    });

    // Create assets for all ESP32 pins (matching ESP32_AssetLogger_Enhanced.ino configuration)
    const assetConfigs = [
      { pin: 2, name: 'Production Line A', type: 'line', description: 'Main production line A' },
      { pin: 4, name: 'Production Line B', type: 'line', description: 'Main production line B' },
      { pin: 5, name: 'Packaging Unit', type: 'machine', description: 'Automated packaging unit' },
      { pin: 18, name: 'Quality Control', type: 'station', description: 'Quality control station' },
      { pin: 19, name: 'Conveyor Belt 1', type: 'conveyor', description: 'Primary conveyor belt' },
      { pin: 21, name: 'Conveyor Belt 2', type: 'conveyor', description: 'Secondary conveyor belt' },
      { pin: 22, name: 'Robotic Arm', type: 'robot', description: 'Industrial robotic arm' },
      { pin: 23, name: 'Inspection Station', type: 'station', description: 'Final inspection station' }
    ];

    assetConfigs.forEach((config, index) => {
      this.createAsset({
        name: config.name,
        type: config.type,
        pin_number: config.pin,
        logger_id: logger1._id,
        description: config.description,
        current_state: index % 2 === 0 ? 'RUNNING' : 'STOPPED', // Alternate states for variety
        availability_percentage: 85.0 + (index * 2), // Vary availability
        runtime: 7200 + (index * 600), // Vary runtime
        downtime: 1200 - (index * 100), // Vary downtime
        total_stops: 2 + index,
        short_stop_threshold: 300, // 5 minutes
        long_stop_threshold: 1800, // 30 minutes
        downtime_reasons: [
          'Material shortage',
          'Machine fault', 
          'Maintenance',
          'Cleaning & Setup'
        ],
        last_state_change: new Date()
      });
    });
    
    // No sample events - start with clean database
    
    console.log(`Sample data created: ${assetConfigs.length} assets for ESP32_001`);
    
    // Clean up any duplicate events and invalid timestamps
    this.cleanupEvents();
    
    // Ensure nextId is always greater than any existing _id across all entities
    const allIds = [
      ...this.users.map(u => typeof u._id === 'number' ? u._id : 0),
      ...this.loggers.map(l => typeof l._id === 'number' ? l._id : 0),
      ...this.assets.map(a => typeof a._id === 'number' ? a._id : 0),
      ...this.events.map(e => typeof e._id === 'number' ? e._id : 0),
      ...this.shifts.map(s => typeof s._id === 'number' ? s._id : 0),
      ...this.configs.map(c => typeof c._id === 'number' ? c._id : 0),
      ...this.archives.map(a => typeof a._id === 'number' ? a._id : 0),
      ...this.backups.map(b => typeof b._id === 'number' ? b._id : 0),
      ...this.reports.map(r => typeof r._id === 'number' ? r._id : 0),
      ...this.shiftPatterns.map(sp => typeof sp._id === 'number' ? sp._id : 0),
      ...this.shiftReports.map(sr => typeof sr._id === 'number' ? sr._id : 0),
      ...this.settings.map(s => typeof s._id === 'number' ? s._id : 0)
    ];
    
    if (allIds.length > 0) {
      this.nextId = Math.max(this.nextId, ...allIds) + 1;
    }
    
    console.log(`Database initialized with nextId: ${this.nextId}`);
  }
  
  // User methods
  async findUserByEmail(email) {
    if (!email) return null;
    return this.users.find(user => user.email.toLowerCase() === email.toLowerCase());
  }
  
  async findUserById(id) {
    return this.users.find(user => user._id == id);
  }
  
  async createUser(userData) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const user = {
      _id: this.nextId++,
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'viewer',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      receive_reports: userData.receive_reports || false,
      shiftReportPreferences: userData.shiftReportPreferences || {
        enabled: false,
        shifts: [],
        emailFormat: 'pdf'
      },
      created_at: new Date(),
      createdAt: new Date(), // Add this for frontend compatibility
      updated_at: new Date()
    };
    
    this.users.push(user);
    return user;
  }

  async updateUser(id, updates) {
    const userIndex = this.users.findIndex(user => user._id == id);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = { ...this.users[userIndex], ...updates, updated_at: new Date() };
    return this.users[userIndex];
  }

  // Auth helpers (needed by authController)
  async comparePassword(enteredPassword, hashedPassword) {
    return bcrypt.compare(enteredPassword, hashedPassword);
  }

  generateJWT(user) {
    const payload = { id: user._id, role: user.role };
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    // Token lifetime can be adjusted as needed
    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }

  getAllUsers() {
    return this.users;
  }

  getUserById(id) {
    return this.users.find(user => user._id == id);
  }

  getUserByEmail(email) {
    if (!email) return null;
    return this.users.find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  deleteUser(id) {
    const userIndex = this.users.findIndex(user => user._id == id);
    if (userIndex === -1) return false;
    
    this.users.splice(userIndex, 1);
    return true;
  }
  
  // Logger methods
  getAllLoggers() {
    return this.loggers;
  }

  getLoggersByUserId(userId) {
    return this.loggers.filter(logger => logger.user_account_id == userId);
  }

  findLoggerById(id) {
    return this.loggers.find(logger => logger._id == id);
  }

  findLoggerByLoggerId(loggerId) {
    return this.loggers.find(logger => logger.logger_id === loggerId);
  }

  createLogger(loggerData) {
    const logger = {
      _id: this.nextId++,
      logger_id: loggerData.logger_id,
      user_account_id: loggerData.user_account_id,
      logger_name: loggerData.logger_name || 'Unnamed Logger',
      status: loggerData.status || 'offline',
      ip_address: loggerData.ip_address || null,
      firmware_version: loggerData.firmware_version || 'Unknown',
      last_seen: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.loggers.push(logger);
    return logger;
  }

  updateLogger(id, updates) {
    const loggerIndex = this.loggers.findIndex(logger => logger._id == id);
    if (loggerIndex === -1) return null;
    
    this.loggers[loggerIndex] = { ...this.loggers[loggerIndex], ...updates, updated_at: new Date() };
    return this.loggers[loggerIndex];
  }

  deleteLogger(id) {
    const loggerIndex = this.loggers.findIndex(logger => logger._id == id);
    if (loggerIndex === -1) return false;
    
    this.loggers.splice(loggerIndex, 1);
    return true;
  }

  // Asset methods
  getAllAssets() {
    return this.assets;
  }

  getAssetsByLoggerId(loggerId) {
    return this.assets.filter(asset => asset.logger_id == loggerId);
  }

  findAssetById(id) {
    return this.assets.find(asset => asset._id == id);
  }

  createAsset(assetData) {
    const asset = {
      _id: this.nextId++,
      name: assetData.name,
      type: assetData.type || 'machine',
      pin_number: assetData.pin_number,
      logger_id: assetData.logger_id,
      description: assetData.description || '',
      current_state: assetData.current_state || 'STOPPED',
      availability_percentage: assetData.availability_percentage || 0,
      runtime: assetData.runtime || 0,
      downtime: assetData.downtime || 0,
      total_stops: assetData.total_stops || 0,
      short_stop_threshold: assetData.short_stop_threshold || 300,
      long_stop_threshold: assetData.long_stop_threshold || 1800,
      downtime_reasons: assetData.downtime_reasons || [],
      last_state_change: assetData.last_state_change || new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.assets.push(asset);
    return asset;
  }

  updateAsset(id, updates) {
    const assetIndex = this.assets.findIndex(asset => asset._id == id);
    if (assetIndex === -1) return null;
    
    this.assets[assetIndex] = { ...this.assets[assetIndex], ...updates, updated_at: new Date() };
    return this.assets[assetIndex];
  }

  deleteAsset(id) {
    const assetIndex = this.assets.findIndex(asset => asset._id == id);
    if (assetIndex === -1) return false;
    
    this.assets.splice(assetIndex, 1);
    return true;
  }

  // Event methods
  getAllEvents() {
    return this.events;
  }

  getEventsByAssetId(assetId) {
    return this.events.filter(event => event.asset_id == assetId);
  }

  createEvent(eventData) {
    const event = {
      _id: this.nextId++,
      asset_id: eventData.asset_id,
      event_type: eventData.event_type,
      timestamp: eventData.timestamp || new Date(),
      duration: eventData.duration || 0,
      reason: eventData.reason || '',
      created_at: new Date()
    };
    
    this.events.push(event);
    return event;
  }

  cleanupEvents() {
    // Remove duplicate events and events with invalid timestamps
    const validEvents = [];
    const seenEvents = new Set();
    
    this.events.forEach(event => {
      const eventKey = `${event.asset_id}-${event.event_type}-${event.timestamp}`;
      if (!seenEvents.has(eventKey) && event.timestamp && !isNaN(new Date(event.timestamp))) {
        seenEvents.add(eventKey);
        validEvents.push(event);
      }
    });
    
    this.events = validEvents;
    console.log(`Cleaned up events: ${validEvents.length} valid events remaining`);
  }

  // Settings methods
  getNotificationSettings() {
    return this.settings.find(setting => setting.type === 'notification') || null;
  }

  updateNotificationSettings(settingsData) {
    try {
      console.log('🔍 MEMORYDB - updateNotificationSettings called with:', JSON.stringify(settingsData, null, 2));
      console.log('🔍 MEMORYDB - Current settings array length:', this.settings.length);
      console.log('🔍 MEMORYDB - Current settings array:', this.settings);
      
      const settingIndex = this.settings.findIndex(setting => setting.type === 'notification');
      console.log('🔍 MEMORYDB - Found setting index:', settingIndex);
      
      if (settingIndex === -1) {
        // Create new settings if none exist
        const newSettings = {
          _id: this.nextId++,
          type: 'notification',
          ...settingsData,
          created_at: new Date(),
          updated_at: new Date()
        };
        console.log('🔍 MEMORYDB - Creating new settings:', newSettings);
        this.settings.push(newSettings);
        console.log('🔍 MEMORYDB - Settings array after push:', this.settings.length);
        return newSettings;
      } else {
        // Update existing settings
        const updatedSettings = {
          ...this.settings[settingIndex],
          ...settingsData,
          updated_at: new Date()
        };
        console.log('🔍 MEMORYDB - Updating existing settings:', updatedSettings);
        this.settings[settingIndex] = updatedSettings;
        return this.settings[settingIndex];
      }
    } catch (error) {
      console.error('🔍 MEMORYDB ERROR in updateNotificationSettings:', error);
      console.error('🔍 MEMORYDB ERROR STACK:', error.stack);
      throw error;
    }
  }

  // General settings methods
  getSettings() {
    return this.settings.find(setting => setting.type === 'general') || null;
  }

  updateSettings(settingsData) {
    try {
      console.log('🔍 MEMORYDB - updateSettings called with:', JSON.stringify(settingsData, null, 2));
      console.log('🔍 MEMORYDB - Current settings array length:', this.settings.length);
      
      const settingIndex = this.settings.findIndex(setting => setting.type === 'general');
      console.log('🔍 MEMORYDB - Found general setting index:', settingIndex);
      
      if (settingIndex === -1) {
        // Create new settings if none exist
        const newSettings = {
          _id: this.nextId++,
          type: 'general',
          ...settingsData,
          created_at: new Date(),
          updated_at: new Date()
        };
        console.log('🔍 MEMORYDB - Creating new general settings:', newSettings);
        this.settings.push(newSettings);
        console.log('🔍 MEMORYDB - Settings array after push:', this.settings.length);
        return newSettings;
      } else {
        // Update existing settings
        const updatedSettings = {
          ...this.settings[settingIndex],
          ...settingsData,
          updated_at: new Date()
        };
        console.log('🔍 MEMORYDB - Updating existing general settings:', updatedSettings);
        this.settings[settingIndex] = updatedSettings;
        return this.settings[settingIndex];
      }
    } catch (error) {
      console.error('🔍 MEMORYDB ERROR in updateSettings:', error);
      console.error('🔍 MEMORYDB ERROR STACK:', error.stack);
      throw error;
    }
  }

  // Additional methods for shifts, configs, archives, etc. would go here...
  // For now, just basic structure

  getShifts() {
    return this.shifts;
  }

  findShiftById(id) {
    return this.shifts.find(shift => shift._id == id);
  }

  findActiveShift() {
    return this.shifts.find(shift => shift.active === true);
  }

  createShift(shiftData) {
    const shift = {
      _id: this.nextId++,
      shift_number: shiftData.shift_number,
      name: shiftData.name,
      start_time: shiftData.start_time || new Date(),
      end_time: shiftData.end_time || null,
      active: shiftData.active || false,
      asset_states: shiftData.asset_states || [],
      notes: shiftData.notes || '',
      runtime: shiftData.runtime || 0,
      downtime: shiftData.downtime || 0,
      stops: shiftData.stops || 0,
      availability: shiftData.availability || 0,
      created_at: new Date()
    };
    
    this.shifts.push(shift);
    return shift;
  }

  updateShift(id, updates) {
    const shiftIndex = this.shifts.findIndex(shift => shift._id == id);
    if (shiftIndex === -1) return null;
    
    this.shifts[shiftIndex] = { ...this.shifts[shiftIndex], ...updates, updated_at: new Date() };
    return this.shifts[shiftIndex];
  }

  // User methods (aliases for compatibility)
  getUsers() {
    return this.getAllUsers();
  }

  findUserById(id) {
    return this.getUserById(id);
  }

  findUserByEmail(email) {
    return this.getUserByEmail(email);
  }

  createUser(userData) {
    const user = {
      _id: this.nextId++,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'user',
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      shiftReportPreferences: userData.shiftReportPreferences || {
        enabled: false,
        shifts: []
      },
      last_login: userData.last_login || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.users.push(user);
    return user;
  }

  updateUser(id, updates) {
    const userIndex = this.users.findIndex(user => user._id == id);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = { ...this.users[userIndex], ...updates, updated_at: new Date() };
    return this.users[userIndex];
  }

  // Asset methods (additional)
  findAssetByName(name) {
    return this.assets.find(asset => asset.name.toLowerCase() === name.toLowerCase());
  }

  getAssetsByUserId(userId) {
    // For now, return all assets since we don't have user-asset relationships
    return this.assets;
  }

  // Event methods (additional)
  getEventsByUserId(userId) {
    // For now, return all events since we don't have user-event relationships
    return this.events;
  }

  deleteEvent(id) {
    const eventIndex = this.events.findIndex(event => event._id == id);
    if (eventIndex === -1) return false;
    
    this.events.splice(eventIndex, 1);
    return true;
  }

  // Config methods
  getConfig() {
    return this.configs.length > 0 ? this.configs[0] : {
      downtime_reasons: [],
      shift_schedules: [],
      report_recipients: [],
      report_schedule: 'daily'
    };
  }

  updateConfig(updates) {
    if (this.configs.length === 0) {
      const newConfig = {
        _id: this.nextId++,
        ...updates,
        created_at: new Date(),
        updated_at: new Date()
      };
      this.configs.push(newConfig);
      return newConfig;
    } else {
      this.configs[0] = { ...this.configs[0], ...updates, updated_at: new Date() };
      return this.configs[0];
    }
  }

  // Archive methods
  getAllArchives() {
    return this.archives;
  }

  findArchiveById(id) {
    return this.archives.find(archive => archive._id == id);
  }

  createArchive(archiveData) {
    const archive = {
      _id: this.nextId++,
      ...archiveData,
      created_at: new Date()
    };
    
    this.archives.push(archive);
    return archive;
  }

  deleteArchive(id) {
    const archiveIndex = this.archives.findIndex(archive => archive._id == id);
    if (archiveIndex === -1) return false;
    
    this.archives.splice(archiveIndex, 1);
    return true;
  }

  // Backup methods
  getBackupById(id) {
    return this.backups.find(backup => backup._id == id);
  }

  createBackup(backupData) {
    const backup = {
      _id: this.nextId++,
      ...backupData,
      created_at: new Date()
    };
    
    this.backups.push(backup);
    return backup;
  }

  deleteBackup(id) {
    const backupIndex = this.backups.findIndex(backup => backup._id == id);
    if (backupIndex === -1) return false;
    
    this.backups.splice(backupIndex, 1);
    return true;
  }

  // Logger status update
  // Logger status update
  updateLoggerStatus(loggerId, status) {
    const logger = this.findLoggerByLoggerId(loggerId);
    if (logger) {
      return this.updateLogger(logger._id, { status, last_seen: new Date() });
    }
    return null;
  }
}

module.exports = new MemoryDB();