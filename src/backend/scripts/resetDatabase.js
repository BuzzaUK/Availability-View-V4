const fs = require('fs');
const path = require('path');
const { sequelize, testConnection } = require('../config/database');

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'development') {
      // For SQLite, delete the database file completely
      const dbPath = path.join(__dirname, '..', 'database.sqlite');
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('✅ SQLite database file deleted');
      }
    } else {
      // For PostgreSQL, drop all tables
      console.log('🗑️ Dropping all tables...');
      await sequelize.drop();
      console.log('✅ All tables dropped');
    }
    
    // Now initialize fresh database
    await initializeFreshDatabase();
    
    console.log('🎉 Database reset completed successfully!');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

async function initializeFreshDatabase() {
  try {
    console.log('🔄 Initializing fresh database...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Import models after connection is established
    const models = require('../models/database');
    const bcrypt = require('bcryptjs');

    // Create all tables fresh (force: true drops and recreates)
    console.log('📋 Creating database schema...');
    await sequelize.sync({ force: true });
    console.log('✅ Database schema created');

    // Create essential data
    console.log('👤 Creating admin user...');
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

    console.log('📡 Creating ESP32_001 logger...');
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

    console.log('⚙️ Creating default settings...');
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
    
  } catch (error) {
    console.error('❌ Error initializing fresh database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('Database reset completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database reset failed:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabase };