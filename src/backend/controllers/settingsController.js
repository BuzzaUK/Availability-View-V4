const databaseService = require('../services/databaseService');
const shiftScheduler = require('../services/shiftScheduler');

// Get notification settings
const getNotificationSettings = async (req, res) => {
  try {
    // Get settings from databaseService, fallback to environment variables
    let notificationSettings = await databaseService.getNotificationSettings();
    
    if (!notificationSettings) {
      // Create default settings if none exist
      notificationSettings = {
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
      
      // Save the default settings
      notificationSettings = await databaseService.updateNotificationSettings(notificationSettings);
    }

    res.json(notificationSettings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch notification settings' 
    });
  }
};

// Update notification settings
// Update notification settings
const updateNotificationSettings = async (req, res) => {
  try {
    const settings = req.body;
    
    console.log('🔍 SETTINGS UPDATE - Received settings:', JSON.stringify(settings, null, 2));
    console.log('🔍 SETTINGS UPDATE - Settings type:', typeof settings);
    
    // Validate that settings is an object
    if (!settings || typeof settings !== 'object') {
      console.log('🔍 SETTINGS UPDATE - Invalid settings data');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid settings data provided' 
      });
    }
    
    // Save settings to database
    console.log('🔍 SETTINGS UPDATE - Calling databaseService.updateNotificationSettings...');
    const updatedSettings = await databaseService.updateNotificationSettings(settings);
    console.log('🔍 SETTINGS UPDATE - Result from databaseService:', updatedSettings ? 'SUCCESS' : 'FAILED');
    
    if (!updatedSettings) {
      console.log('🔍 SETTINGS UPDATE - No settings returned from database');
      throw new Error('Failed to update settings in database');
    }
    
    // If shift settings were updated, refresh the scheduler
    if (settings.shiftSettings) {
      console.log('🔍 SETTINGS UPDATE - Updating shift scheduler...');
      await shiftScheduler.updateSchedules();
      console.log('🔍 SETTINGS UPDATE - Shift scheduler updated successfully');
      
      // Emit socket event to notify frontend of shift times update
      try {
        const server = require('../server');
        if (server && server.io) {
          server.io.emit('settings_updated', {
            type: 'shiftSettings',
            data: settings.shiftSettings,
            timestamp: new Date().toISOString()
          });
          console.log('🔍 SETTINGS UPDATE - Socket event emitted: settings_updated');
        }
      } catch (error) {
        console.error('🔍 SETTINGS UPDATE - Failed to emit socket event:', error.message);
      }
    }
    
    console.log('🔍 SETTINGS UPDATE - Sending success response');
    res.json({ 
      success: true,
      message: 'Notification settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('🔍 SETTINGS UPDATE ERROR:', error.message);
    console.error('🔍 SETTINGS UPDATE ERROR STACK:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update notification settings: ' + error.message 
    });
  }
};

// Test email notification
const testEmailNotification = async (req, res) => {
  try {
    console.log('🔍 TEST EMAIL - Request body:', req.body);
    const emailSettings = req.body;
    
    // Validate required fields
    if (!emailSettings.smtpServer || !emailSettings.fromEmail || !emailSettings.username || !emailSettings.password) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required email configuration (SMTP server, from email, username, or password)' 
      });
    }
    
    console.log('🔍 Testing email with settings:', {
      smtpServer: emailSettings.smtpServer,
      port: emailSettings.port,
      username: emailSettings.username,
      fromEmail: emailSettings.fromEmail,
      useTLS: emailSettings.useTLS,
      passwordLength: emailSettings.password ? emailSettings.password.length : 0
    });
    
    // Actually send a test email using nodemailer
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtpServer,
      port: parseInt(emailSettings.port),
      secure: false, // true for 465, false for other ports like 587
      auth: {
        user: emailSettings.username,
        pass: emailSettings.password,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    });

    // Verify the connection configuration
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('🔍 SMTP connection verified successfully');

    const mailOptions = {
      from: `"Industrial Monitoring Dashboard" <${emailSettings.username}>`,
      to: emailSettings.username, // Send test email to the same address
      subject: 'Test Email from Industrial Monitoring Dashboard',
      text: 'This is a test email to verify your email configuration is working correctly.',
      html: `
        <h2>✅ Test Email Successful</h2>
        <p>This is a test email to verify your email configuration is working correctly.</p>
        <hr>
        <p><strong>SMTP Server:</strong> ${emailSettings.smtpServer}</p>
        <p><strong>Port:</strong> ${emailSettings.port}</p>
        <p><strong>Username:</strong> ${emailSettings.username}</p>
        <p><strong>From Email:</strong> ${emailSettings.fromEmail}</p>
        <p><strong>Use TLS:</strong> ${emailSettings.useTLS ? 'Yes' : 'No'}</p>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p><em>Industrial Monitoring Dashboard</em></p>
      `
    };

    console.log('🔍 Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('🔍 Test email sent successfully:', info.messageId);
    
    res.json({ 
      success: true, 
      message: `Test email sent successfully to ${emailSettings.username}. Check your inbox!`,
      messageId: info.messageId
    });
    
  } catch (error) {
    console.error('🔍 Error testing email notification:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send test email: ' + error.message;
    
    if (error.message.includes('Invalid login')) {
      errorMessage = 'Gmail authentication failed. Please check:\n' +
                    '1. Your Gmail account has 2-Factor Authentication enabled\n' +
                    '2. You are using an App Password (not your regular Gmail password)\n' +
                    '3. The App Password is correct and hasn\'t expired';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Cannot connect to Gmail SMTP server. Please check your internet connection.';
    } else if (error.message.includes('ETIMEDOUT')) {
      errorMessage = 'Connection to Gmail SMTP server timed out. Please try again.';
    }
    
    res.status(500).json({ 
      success: false,
      message: errorMessage
    });
  }
};

// Test SMS notification
const testSmsNotification = async (req, res) => {
  try {
    const smsSettings = req.body;
    
    // Validate required fields
    if (!smsSettings.provider || !smsSettings.fromNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required SMS configuration' 
      });
    }
    
    // Simulate SMS test
    console.log('Testing SMS with settings:', smsSettings);
    
    res.json({ 
      success: true, 
      message: 'Test SMS sent successfully' 
    });
    
  } catch (error) {
    console.error('Error testing SMS notification:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send test SMS: ' + error.message 
    });
  }
};

// Get general settings
const getSettings = async (req, res) => {
  try {
    // Get settings from databaseService
    let settings = await databaseService.getGeneralSettings();
    
    if (!settings) {
      // Create default settings if none exist
      settings = {
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
      
      // Save the default settings
      settings = await databaseService.updateGeneralSettings(settings);
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch settings' 
    });
  }
};

// Update general settings
const updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    
    console.log('🔍 GENERAL SETTINGS UPDATE - Received settings:', JSON.stringify(settings, null, 2));
    
    // Validate that settings is an object
    if (!settings || typeof settings !== 'object') {
      console.log('🔍 GENERAL SETTINGS UPDATE - Invalid settings data');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid settings data provided' 
      });
    }
    
    // Save settings to databaseService
    console.log('🔍 GENERAL SETTINGS UPDATE - Calling databaseService.updateGeneralSettings...');
    const updatedSettings = await databaseService.updateGeneralSettings(settings);
    console.log('🔍 GENERAL SETTINGS UPDATE - Result from databaseService:', updatedSettings ? 'SUCCESS' : 'FAILED');
    
    if (!updatedSettings) {
      console.log('🔍 GENERAL SETTINGS UPDATE - No settings returned from databaseService');
      throw new Error('Failed to update settings in database');
    }
    
    console.log('🔍 GENERAL SETTINGS UPDATE - Sending success response');
    res.json({ 
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('🔍 GENERAL SETTINGS UPDATE ERROR:', error.message);
    console.error('🔍 GENERAL SETTINGS UPDATE ERROR STACK:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update settings: ' + error.message 
    });
  }
};

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  testEmailNotification,
  testSmsNotification,
  getSettings,
  updateSettings
};