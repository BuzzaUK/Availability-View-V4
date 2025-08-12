const { sequelize, testConnection } = require('../config/database');
const models = require('../models/database');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Sync all models (create tables if they don't exist, don't alter existing ones)
    console.log('📋 Creating/updating database schema...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Database schema synchronized');

    // Create essential data
    await createEssentialData();
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function createEssentialData() {
  try {
    // Create admin user if it doesn't exist
    const existingAdmin = await models.User.findOne({ 
      where: { email: 'admin@example.com' } 
    });
    
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const admin = await models.User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        receive_reports: false
      });
      console.log('✅ Admin user created (email: admin@example.com, password: admin123)');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // Create ESP32_001 logger if it doesn't exist
    const existingLogger = await models.Logger.findOne({ 
      where: { logger_id: 'ESP32_001' } 
    });
    
    if (!existingLogger) {
      const admin = await models.User.findOne({ 
        where: { email: 'admin@example.com' } 
      });
      
      await models.Logger.create({
        logger_id: 'ESP32_001',
        user_account_id: admin.id,
        logger_name: 'Production Floor Logger',
        status: 'offline',
        ip_address: '192.168.1.100',
        firmware_version: '2.0.0',
        last_seen: new Date()
      });
      console.log('✅ ESP32_001 logger created');
    } else {
      console.log('ℹ️ ESP32_001 logger already exists');
    }

    // Create default settings if they don't exist
    const existingSettings = await models.Settings.findOne({ 
      where: { key: 'notification_settings' } 
    });
    
    if (!existingSettings) {
      await models.Settings.create({
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
    } else {
      console.log('ℹ️ Notification settings already exist');
    }

  } catch (error) {
    console.error('❌ Error creating essential data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase, createEssentialData };