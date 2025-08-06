const memoryDB = require('../utils/memoryDB');

// Mock settings data
let generalSettings = {
  companyName: 'Industrial Monitoring Corp',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  language: 'en',
  theme: 'light',
  autoRefresh: true,
  refreshInterval: 30,
  enableNotifications: true,
  enableAuditing: true,
  sessionTimeout: 60,
  maxLoginAttempts: 5,
  passwordMinLength: 8,
  requirePasswordComplexity: true
};

let notificationSettings = {
  emailSettings: {
    enabled: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@company.com',
    fromName: 'Industrial Monitoring System'
  },
  smsSettings: {
    enabled: false,
    provider: 'twilio',
    apiKey: '',
    apiSecret: '',
    fromNumber: ''
  },
  alertSettings: {
    enableDowntimeAlerts: true,
    enablePerformanceAlerts: true,
    enableQualityAlerts: true,
    downtimeThreshold: 5,
    performanceThreshold: 80,
    qualityThreshold: 95,
    alertCooldown: 15
  },
  recipients: []
};

let backupSettings = {
  enabled: true,
  frequency: 'daily',
  time: '02:00',
  retentionDays: 30,
  location: 'local',
  cloudProvider: 'aws',
  cloudSettings: {
    accessKey: '',
    secretKey: '',
    bucket: '',
    region: 'us-east-1'
  },
  includeAssets: true,
  includeEvents: true,
  includeUsers: true,
  includeSettings: true,
  compression: true,
  encryption: false
};

// Get general settings
const getGeneralSettings = async (req, res) => {
  try {
    res.json(generalSettings);
  } catch (error) {
    console.error('Error fetching general settings:', error);
    res.status(500).json({ message: 'Failed to fetch general settings' });
  }
};

// Update general settings
const updateGeneralSettings = async (req, res) => {
  try {
    generalSettings = { ...generalSettings, ...req.body };
    res.json({ success: true, data: generalSettings });
  } catch (error) {
    console.error('Error updating general settings:', error);
    res.status(500).json({ message: 'Failed to update general settings' });
  }
};

// Get notification settings
const getNotificationSettings = async (req, res) => {
  try {
    res.json(notificationSettings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ message: 'Failed to fetch notification settings' });
  }
};

// Update notification settings
const updateNotificationSettings = async (req, res) => {
  try {
    notificationSettings = { ...notificationSettings, ...req.body };
    res.json({ success: true, data: notificationSettings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: 'Failed to update notification settings' });
  }
};

// Get backup settings
const getBackupSettings = async (req, res) => {
  try {
    res.json(backupSettings);
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    res.status(500).json({ message: 'Failed to fetch backup settings' });
  }
};

// Update backup settings
const updateBackupSettings = async (req, res) => {
  try {
    backupSettings = { ...backupSettings, ...req.body };
    res.json({ success: true, data: backupSettings });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(500).json({ message: 'Failed to update backup settings' });
  }
};

// Test email notification
const testEmailNotification = async (req, res) => {
  try {
    const { emailSettings } = req.body;
    
    // Simulate email test
    console.log('Testing email with settings:', emailSettings);
    
    // In a real implementation, you would send an actual test email here
    // For now, we'll just simulate success
    setTimeout(() => {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully to ' + emailSettings.fromEmail 
      });
    }, 1000);
    
  } catch (error) {
    console.error('Error testing email notification:', error);
    res.status(500).json({ message: 'Failed to send test email' });
  }
};

// Test SMS notification
const testSmsNotification = async (req, res) => {
  try {
    const { smsSettings } = req.body;
    
    // Simulate SMS test
    console.log('Testing SMS with settings:', smsSettings);
    
    // In a real implementation, you would send an actual test SMS here
    // For now, we'll just simulate success
    setTimeout(() => {
      res.json({ 
        success: true, 
        message: 'Test SMS sent successfully to ' + smsSettings.fromNumber 
      });
    }, 1000);
    
  } catch (error) {
    console.error('Error testing SMS notification:', error);
    res.status(500).json({ message: 'Failed to send test SMS' });
  }
};

module.exports = {
  getGeneralSettings,
  updateGeneralSettings,
  getNotificationSettings,
  updateNotificationSettings,
  getBackupSettings,
  updateBackupSettings,
  testEmailNotification,
  testSmsNotification
};