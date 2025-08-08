// Simple in-memory database for development
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class MemoryDB {
  constructor() {
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
    this.nextId = 1;
    
    // Create default admin user
    this.createDefaultUser();
    
    // Create sample data
    this.createSampleData();

    // Ensure nextId is always greater than any existing _id
    const allIds = [
      ...this.users.map(u => u._id),
      ...this.loggers.map(l => l._id),
      ...this.assets.map(a => a._id),
      ...this.events.map(e => e._id),
      ...this.shifts.map(s => s._id),
      ...this.configs.map(c => c._id),
      ...this.archives.map(a => a._id),
      ...this.backups.map(b => b._id),
      ...this.reports.map(r => r._id),
      ...this.shiftPatterns.map(sp => sp._id),
      ...this.shiftReports.map(sr => sr._id)
    ].filter(id => typeof id === 'number');
    if (allIds.length > 0) {
      this.nextId = Math.max(...allIds) + 1;
    }
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
      receive_reports: false,
      created_at: new Date(),
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
      ...this.shiftReports.map(sr => typeof sr._id === 'number' ? sr._id : 0)
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
      receive_reports: userData.receive_reports || false,
      created_at: new Date(),
      updated_at: new Date(),
      last_login: null
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
  
  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  generateJWT(user) {
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
  }

  // Additional user methods for user management
  getUsers() {
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
      logger_name: loggerData.logger_name || `Logger ${loggerData.logger_id}`,
      status: loggerData.status || 'offline',
      last_seen: new Date(),
      ip_address: loggerData.ip_address || '',
      firmware_version: loggerData.firmware_version || '1.0.0',
      created_at: new Date(),
      updated_at: new Date()
    };
    this.loggers.push(logger);
    return logger;
  }

  updateLogger(id, updates) {
    const loggerIndex = this.loggers.findIndex(logger => logger._id == id);
    if (loggerIndex === -1) return null;
    
    this.loggers[loggerIndex] = { 
      ...this.loggers[loggerIndex], 
      ...updates, 
      updated_at: new Date() 
    };
    return this.loggers[loggerIndex];
  }

  updateLoggerStatus(loggerId, status, ipAddress = null) {
    const logger = this.findLoggerByLoggerId(loggerId);
    if (!logger) return null;
    
    logger.status = status;
    logger.last_seen = new Date();
    if (ipAddress) logger.ip_address = ipAddress;
    logger.updated_at = new Date();
    
    return logger;
  }

  deleteLogger(id) {
    const loggerIndex = this.loggers.findIndex(logger => logger._id == id);
    if (loggerIndex === -1) return false;
    
    // Also delete all assets and events associated with this logger
    const loggerAssets = this.assets.filter(asset => asset.logger_id == id);
    loggerAssets.forEach(asset => {
      this.events = this.events.filter(event => event.asset != asset._id);
    });
    this.assets = this.assets.filter(asset => asset.logger_id != id);
    
    this.loggers.splice(loggerIndex, 1);
    return true;
  }

  // Asset methods
  getAllAssets() {
    return this.assets;
  }

  getAssetsByUserId(userId) {
    const userLoggers = this.getLoggersByUserId(userId);
    const loggerIds = userLoggers.map(logger => logger._id);
    return this.assets.filter(asset => loggerIds.includes(asset.logger_id));
  }

  getAssetsByLoggerId(loggerId) {
    return this.assets.filter(asset => asset.logger_id == loggerId);
  }
  
  findAssetById(id) {
    return this.assets.find(asset => asset._id == id);
  }
  
  findAssetByName(name) {
    return this.assets.find(asset => asset.name === name);
  }
  
  createAsset(assetData) {
    const asset = {
      _id: this.nextId++,
      ...assetData,
      logger_id: assetData.logger_id || null,
      current_state: assetData.current_state || 'STOPPED',
      availability_percentage: assetData.availability_percentage || 0,
      runtime: assetData.runtime || 0,
      downtime: assetData.downtime || 0,
      total_stops: assetData.total_stops || 0,
      short_stop_threshold: assetData.short_stop_threshold || 300, // 5 minutes default
      long_stop_threshold: assetData.long_stop_threshold || 1800, // 30 minutes default
      downtime_reasons: assetData.downtime_reasons || [
        'Material shortage',
        'Machine fault',
        'Maintenance',
        'Cleaning & Setup'
      ],
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
    
    this.assets[assetIndex] = { 
      ...this.assets[assetIndex], 
      ...updates, 
      updated_at: new Date() 
    };
    return this.assets[assetIndex];
  }
  
  deleteAsset(id) {
    const assetIndex = this.assets.findIndex(asset => asset._id == id);
    if (assetIndex === -1) return false;
    
    // Also delete all events associated with this asset
    this.events = this.events.filter(event => event.asset != id);
    
    this.assets.splice(assetIndex, 1);
    return true;
  }
  
  // Event methods
  getAllEvents() {
    return this.events;
  }
  
  createEvent(eventData) {
    const event = {
      _id: this.nextId++,
      ...eventData,
      logger_id: eventData.logger_id || null,
      availability_percentage: eventData.availability_percentage || 0,
      runtime_minutes: eventData.runtime_minutes || 0,
      downtime_minutes: eventData.downtime_minutes || 0,
      mtbf: eventData.mtbf || 0,
      mttr: eventData.mttr || 0,
      stops_count: eventData.stops_count || 0,
      reason: eventData.reason || '',
      is_short_stop: eventData.is_short_stop || false,
      timestamp: eventData.timestamp || new Date()
    };
    this.events.push(event);
    return event;
  }

  getEventsByUserId(userId) {
    const userLoggers = this.getLoggersByUserId(userId);
    const loggerIds = userLoggers.map(logger => logger._id);
    return this.events.filter(event => loggerIds.includes(event.logger_id));
  }

  getEventsByLoggerId(loggerId) {
    return this.events.filter(event => event.logger_id == loggerId);
  }
  
  deleteEvent(eventId) {
    const index = this.events.findIndex(event => event._id == eventId);
    if (index !== -1) {
      this.events.splice(index, 1);
      return true;
    }
    return false;
  }

  clearAllEvents() {
    const count = this.events.length;
    this.events = [];
    console.log(`Cleared ${count} events from database`);
    return count;
  }

  // Shift methods
  getAllShifts() {
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
      ...shiftData,
      start_time: shiftData.start_time || new Date(),
      active: shiftData.active !== undefined ? shiftData.active : true,
      asset_states: shiftData.asset_states || [],
      runtime: shiftData.runtime || 0,
      downtime: shiftData.downtime || 0,
      stops: shiftData.stops || 0,
      availability: shiftData.availability || 0,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.shifts.push(shift);
    return shift;
  }

  updateShift(id, updates) {
    const shiftIndex = this.shifts.findIndex(shift => shift._id == id);
    if (shiftIndex === -1) return null;
    
    this.shifts[shiftIndex] = { 
      ...this.shifts[shiftIndex], 
      ...updates, 
      updated_at: new Date() 
    };
    return this.shifts[shiftIndex];
  }

  deleteShift(id) {
    const shiftIndex = this.shifts.findIndex(shift => shift._id == id);
    if (shiftIndex === -1) return false;
    
    this.shifts.splice(shiftIndex, 1);
    return true;
  }

  // Config methods
  getConfig() {
    if (this.configs.length === 0) {
      // Create default config
      const defaultConfig = {
        _id: this.nextId++,
        company_name: 'Industrial Monitoring System',
        logo_url: '',
        micro_stop_threshold: 5,
        downtime_reasons: [
          { _id: this.nextId++, name: 'Maintenance', description: 'Scheduled maintenance', color: '#FF9800' },
          { _id: this.nextId++, name: 'Material Shortage', description: 'Lack of raw materials', color: '#F44336' },
          { _id: this.nextId++, name: 'Equipment Failure', description: 'Mechanical breakdown', color: '#E91E63' }
        ],
        shift_schedules: [
          { _id: this.nextId++, name: 'Morning Shift', start_time: '06:00', end_time: '14:00' },
          { _id: this.nextId++, name: 'Afternoon Shift', start_time: '14:00', end_time: '22:00' },
          { _id: this.nextId++, name: 'Night Shift', start_time: '22:00', end_time: '06:00' }
        ],
        report_recipients: [],
        report_schedule: 'end_of_shift',
        created_at: new Date(),
        updated_at: new Date()
      };
      this.configs.push(defaultConfig);
    }
    return this.configs[0];
  }

  updateConfig(updates) {
    const config = this.getConfig();
    Object.assign(config, updates, { updated_at: new Date() });
    return config;
  }

  // Shift Pattern methods
  getAllShiftPatterns() {
    return this.shiftPatterns;
  }

  getShiftPatternsByUserId(userId) {
    return this.shiftPatterns.filter(pattern => pattern.user_account_id == userId);
  }

  getShiftPatternsByLoggerId(loggerId) {
    return this.shiftPatterns.filter(pattern => pattern.logger_id == loggerId);
  }

  findShiftPatternById(id) {
    return this.shiftPatterns.find(pattern => pattern._id == id);
  }

  createShiftPattern(patternData) {
    const pattern = {
      _id: this.nextId++,
      ...patternData,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.shiftPatterns.push(pattern);
    return pattern;
  }

  updateShiftPattern(id, updates) {
    const patternIndex = this.shiftPatterns.findIndex(pattern => pattern._id == id);
    if (patternIndex === -1) return null;
    
    this.shiftPatterns[patternIndex] = { 
      ...this.shiftPatterns[patternIndex], 
      ...updates, 
      updated_at: new Date() 
    };
    return this.shiftPatterns[patternIndex];
  }

  deleteShiftPattern(id) {
    const patternIndex = this.shiftPatterns.findIndex(pattern => pattern._id == id);
    if (patternIndex === -1) return false;
    
    this.shiftPatterns.splice(patternIndex, 1);
    return true;
  }

  // Shift Report methods
  getAllShiftReports() {
    return this.shiftReports;
  }

  getShiftReportsByUserId(userId) {
    return this.shiftReports.filter(report => report.user_account_id == userId);
  }

  getShiftReportsByLoggerId(loggerId) {
    return this.shiftReports.filter(report => report.logger_id == loggerId);
  }

  findShiftReportById(id) {
    return this.shiftReports.find(report => report._id == id);
  }

  createShiftReport(reportData) {
    const report = {
      _id: this.nextId++,
      ...reportData,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.shiftReports.push(report);
    return report;
  }

  updateShiftReport(id, updates) {
    const reportIndex = this.shiftReports.findIndex(report => report._id == id);
    if (reportIndex === -1) return null;
    
    this.shiftReports[reportIndex] = { 
      ...this.shiftReports[reportIndex], 
      ...updates, 
      updated_at: new Date() 
    };
    return this.shiftReports[reportIndex];
  }

  deleteShiftReport(id) {
    const reportIndex = this.shiftReports.findIndex(report => report._id == id);
    if (reportIndex === -1) return false;
    
    this.shiftReports.splice(reportIndex, 1);
    return true;
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
      created_at: new Date(),
      updated_at: new Date()
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
  getBackups() {
    return this.backups;
  }

  getBackupById(id) {
    return this.backups.find(backup => backup._id == id);
  }

  createBackup(backupData) {
    const backup = {
      _id: this.nextId++,
      ...backupData,
      created_at: new Date(),
      updated_at: new Date()
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

  // Restore methods for backups
  restoreUsers(users) {
    this.users = users;
  }

  // Clean up duplicate events and invalid timestamps
  cleanupEvents() {
    // Remove events with invalid timestamps (before 2000-01-01)
    this.events = this.events.filter(e => {
      const ts = new Date(e.timestamp);
      return ts.getFullYear() >= 2000;
    });

    // Remove duplicate events by keeping only the first occurrence of each _id
    const seenIds = new Set();
    this.events = this.events.filter(e => {
      if (seenIds.has(e._id)) {
        console.log(`Removing duplicate event with ID: ${e._id}`);
        return false;
      }
      seenIds.add(e._id);
      return true;
    });

    console.log(`Events after cleanup: ${this.events.length} events remaining`);
  }

  restoreEvents(events) {
    this.events = events;
    this.cleanupEvents();
    // Ensure nextId is always greater than any existing event _id
    const eventIds = events.map(e => typeof e._id === 'number' ? e._id : 0);
    if (eventIds.length > 0) {
      this.nextId = Math.max(this.nextId, ...eventIds) + 1;
    }
  }

  restoreAssets(assets) {
    this.assets = assets;
  }

  restoreSettings(settings) {
    this.configs = [settings];
  }

  restoreShifts(shifts) {
    this.shifts = shifts;
  }

  restoreReports(reports) {
    this.reports = reports;
  }

  restoreArchives(archives) {
    this.archives = archives;
  }

  // Report methods
  getReports() {
    return this.reports;
  }

  getSettings() {
    return this.getConfig();
  }
}

// Create singleton instance
const memoryDB = new MemoryDB();

module.exports = memoryDB;