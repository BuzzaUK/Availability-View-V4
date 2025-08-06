// Simple in-memory database for development
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class MemoryDB {
  constructor() {
    this.users = [];
    this.assets = [];
    this.events = [];
    this.shifts = [];
    this.configs = [];
    this.archives = [];
    this.backups = [];
    this.reports = [];
    this.nextId = 1;
    
    // Create default admin user
    this.createDefaultUser();
    
    // Create sample data
    this.createSampleData();
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
    // Create sample assets
    const asset1 = this.createAsset({
      name: 'Conveyor Belt A',
      type: 'line',
      pin_number: 2,
      description: 'Main production line conveyor',
      current_state: 'RUNNING',
      availability_percentage: 85.5,
      runtime: 7200,
      downtime: 1200,
      total_stops: 3,
      last_state_change: new Date()
    });
    
    const asset2 = this.createAsset({
      name: 'Packaging Machine B',
      type: 'machine',
      pin_number: 4,
      description: 'Automated packaging unit',
      current_state: 'STOPPED',
      availability_percentage: 92.3,
      runtime: 6800,
      downtime: 600,
      total_stops: 2,
      last_state_change: new Date()
    });
    
    // Create sample events
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    
    this.createEvent({
      asset: asset1._id,
      asset_name: asset1.name,
      event_type: 'START',
      state: 'RUNNING',
      duration: 3600, // 1 hour in seconds
      note: 'Production started',
      timestamp: threeHoursAgo
    });
    
    this.createEvent({
      asset: asset1._id,
      asset_name: asset1.name,
      event_type: 'STOP',
      state: 'STOPPED',
      duration: 1800, // 30 minutes in seconds
      note: 'Maintenance break',
      timestamp: twoHoursAgo
    });
    
    this.createEvent({
      asset: asset1._id,
      asset_name: asset1.name,
      event_type: 'START',
      state: 'RUNNING',
      duration: 3600, // 1 hour in seconds
      note: 'Production resumed',
      timestamp: oneHourAgo
    });
    
    this.createEvent({
      asset: asset2._id,
      asset_name: asset2.name,
      event_type: 'START',
      state: 'RUNNING',
      duration: 7200, // 2 hours in seconds
      note: 'Packaging cycle started',
      timestamp: twoHoursAgo
    });
    
    this.createEvent({
      asset: asset2._id,
      asset_name: asset2.name,
      event_type: 'STOP',
      state: 'STOPPED',
      duration: 600, // 10 minutes in seconds
      note: 'Material shortage',
      timestamp: now
    });
    
    console.log('Sample data created: 2 assets and 5 events');
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
  
  // Asset methods
  getAllAssets() {
    return this.assets;
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
      current_state: assetData.current_state || 'STOPPED',
      availability_percentage: assetData.availability_percentage || 0,
      runtime: assetData.runtime || 0,
      downtime: assetData.downtime || 0,
      total_stops: assetData.total_stops || 0,
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
      timestamp: eventData.timestamp || new Date()
    };
    this.events.push(event);
    return event;
  }
  
  deleteEvent(eventId) {
    const index = this.events.findIndex(event => event._id == eventId);
    if (index !== -1) {
      this.events.splice(index, 1);
      return true;
    }
    return false;
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

  restoreEvents(events) {
    this.events = events;
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