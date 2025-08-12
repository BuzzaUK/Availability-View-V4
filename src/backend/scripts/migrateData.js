const { sequelize } = require('../config/database');
const { User, Logger, Asset, Event, Shift, Archive, Settings } = require('../models/database');
const memoryDB = require('../utils/memoryDB');

async function migrateData() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Starting data migration from memory to PostgreSQL...');
    
    // Migrate Users
    console.log('👥 Migrating users...');
    const memoryUsers = memoryDB.getAllUsers();
    for (const user of memoryUsers) {
      await User.create({
        id: user._id,
        name: user.name,
        email: user.email,
        password: user.password, // Already hashed
        role: user.role,
        isActive: user.isActive,
        receive_reports: user.receive_reports,
        shiftReportPreferences: user.shiftReportPreferences,
        last_login: user.last_login,
        created_at: user.created_at,
        updated_at: user.updated_at
      }, { 
        transaction,
        hooks: false // Skip password hashing since it's already hashed
      });
    }
    console.log(`✅ Migrated ${memoryUsers.length} users`);

    // Migrate Loggers
    console.log('📡 Migrating loggers...');
    const memoryLoggers = memoryDB.getAllLoggers();
    for (const logger of memoryLoggers) {
      await Logger.create({
        id: logger._id,
        logger_id: logger.logger_id,
        user_account_id: logger.user_account_id,
        logger_name: logger.logger_name,
        status: logger.status,
        ip_address: logger.ip_address,
        firmware_version: logger.firmware_version,
        last_seen: logger.last_seen,
        location: logger.location,
        description: logger.description,
        wifi_ssid: logger.wifi_ssid,
        wifi_password: logger.wifi_password,
        server_url: logger.server_url,
        created_at: logger.created_at,
        updated_at: logger.updated_at
      }, { transaction });
    }
    console.log(`✅ Migrated ${memoryLoggers.length} loggers`);

    // Migrate Assets
    console.log('🏭 Migrating assets...');
    const memoryAssets = memoryDB.getAllAssets();
    for (const asset of memoryAssets) {
      await Asset.create({
        id: asset._id,
        name: asset.name,
        type: asset.type,
        pin_number: asset.pin_number,
        logger_id: asset.logger_id,
        description: asset.description,
        current_state: asset.current_state,
        availability_percentage: asset.availability_percentage,
        runtime: asset.runtime,
        downtime: asset.downtime,
        total_stops: asset.total_stops,
        short_stop_threshold: asset.short_stop_threshold,
        long_stop_threshold: asset.long_stop_threshold,
        downtime_reasons: asset.downtime_reasons,
        last_state_change: asset.last_state_change,
        location: asset.location,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serial_number: asset.serial_number,
        created_at: asset.created_at,
        updated_at: asset.updated_at
      }, { transaction });
    }
    console.log(`✅ Migrated ${memoryAssets.length} assets`);

    // Migrate Events
    console.log('📊 Migrating events...');
    const memoryEvents = memoryDB.getAllEvents();
    for (const event of memoryEvents) {
      await Event.create({
        id: event._id,
        asset_id: event.asset_id,
        logger_id: event.logger_id,
        event_type: event.event_type,
        previous_state: event.previous_state,
        new_state: event.new_state,
        duration: event.duration,
        stop_reason: event.stop_reason,
        metadata: event.metadata || {},
        timestamp: event.timestamp,
        processed: event.processed || false,
        shift_id: event.shift_id,
        created_at: event.created_at || event.timestamp,
        updated_at: event.updated_at || event.timestamp
      }, { transaction });
    }
    console.log(`✅ Migrated ${memoryEvents.length} events`);

    // Migrate Settings
    console.log('⚙️ Migrating settings...');
    const memorySettings = memoryDB.getSettings();
    if (memorySettings) {
      // Convert memory settings to database format
      const settingsToMigrate = [
        {
          key: 'notification_settings',
          value: memorySettings,
          type: 'notification',
          description: 'Notification and email settings'
        },
        {
          key: 'data_retention_days',
          value: { days: memorySettings.dataRetentionDays || 90 },
          type: 'system',
          description: 'Data retention period in days'
        }
      ];

      for (const setting of settingsToMigrate) {
        await Settings.create(setting, { transaction });
      }
      console.log(`✅ Migrated settings`);
    }

    await transaction.commit();
    console.log('🎉 Data migration completed successfully!');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Data migration failed:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateData().then(() => {
    console.log('✅ Data migration process completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

module.exports = migrateData;