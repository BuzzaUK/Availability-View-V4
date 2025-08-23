const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function debugDatabaseSchema() {
  try {
    console.log('🔍 Debugging Database Schema...');
    
    // Get all tables
    const [tables] = await sequelize.query(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `);
    
    console.log(`\n📊 Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Check events table structure
    if (tables.some(t => t.name === 'events')) {
      console.log('\n📋 Events table structure:');
      const [eventColumns] = await sequelize.query(`PRAGMA table_info(events)`);
      eventColumns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Count events
      const [eventCount] = await sequelize.query(`SELECT COUNT(*) as count FROM events`);
      console.log(`\n📊 Total events in table: ${eventCount[0].count}`);
    }
    
    // Check shifts table structure
    if (tables.some(t => t.name === 'shifts')) {
      console.log('\n📋 Shifts table structure:');
      const [shiftColumns] = await sequelize.query(`PRAGMA table_info(shifts)`);
      shiftColumns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Count shifts
      const [shiftCount] = await sequelize.query(`SELECT COUNT(*) as count FROM shifts`);
      console.log(`\n📊 Total shifts in table: ${shiftCount[0].count}`);
      
      // Show recent shifts
      const [recentShifts] = await sequelize.query(`
        SELECT 
          id,
          shift_name,
          start_time,
          end_time,
          status,
          created_at
        FROM shifts
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      console.log('\n📋 Recent shifts:');
      recentShifts.forEach((shift, index) => {
        const startTime = new Date(shift.start_time).toLocaleString();
        const endTime = shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Not ended';
        console.log(`  ${index + 1}. ${shift.shift_name} (${shift.status}) | ${startTime} - ${endTime}`);
      });
    }
    
    // Check assets table
    if (tables.some(t => t.name === 'assets')) {
      console.log('\n📋 Assets table structure:');
      const [assetColumns] = await sequelize.query(`PRAGMA table_info(assets)`);
      assetColumns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Count and show assets
      const [assetCount] = await sequelize.query(`SELECT COUNT(*) as count FROM assets`);
      console.log(`\n📊 Total assets in table: ${assetCount[0].count}`);
      
      const [assets] = await sequelize.query(`
        SELECT id, name, status, created_at
        FROM assets
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      console.log('\n📋 Assets:');
      assets.forEach((asset, index) => {
        console.log(`  ${index + 1}. ${asset.name} (${asset.status}) - ID: ${asset.id}`);
      });
    }
    
    // Check archives table
    if (tables.some(t => t.name === 'archives')) {
      console.log('\n📋 Archives table structure:');
      const [archiveColumns] = await sequelize.query(`PRAGMA table_info(archives)`);
      archiveColumns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // Count archives by type
      const [archiveStats] = await sequelize.query(`
        SELECT archive_type, COUNT(*) as count
        FROM archives
        GROUP BY archive_type
        ORDER BY count DESC
      `);
      
      console.log('\n📊 Archives by type:');
      archiveStats.forEach(stat => {
        console.log(`  ${stat.archive_type}: ${stat.count}`);
      });
    }
    
    // Check if there are any loggers table (ESP32 data)
    if (tables.some(t => t.name === 'loggers')) {
      console.log('\n📋 Loggers table structure:');
      const [loggerColumns] = await sequelize.query(`PRAGMA table_info(loggers)`);
      loggerColumns.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      const [loggerCount] = await sequelize.query(`SELECT COUNT(*) as count FROM loggers`);
      console.log(`\n📊 Total loggers in table: ${loggerCount[0].count}`);
      
      if (loggerCount[0].count > 0) {
        const [loggers] = await sequelize.query(`
          SELECT id, logger_id, status, last_seen, created_at
          FROM loggers
          ORDER BY last_seen DESC
          LIMIT 5
        `);
        
        console.log('\n📋 Recent loggers:');
        loggers.forEach((logger, index) => {
          const lastSeen = logger.last_seen ? new Date(logger.last_seen).toLocaleString() : 'Never';
          console.log(`  ${index + 1}. Logger ${logger.logger_id} (${logger.status}) - Last seen: ${lastSeen}`);
        });
      }
    }
    
    // Look for any other event-related tables
    const eventRelatedTables = tables.filter(t => 
      t.name.toLowerCase().includes('event') || 
      t.name.toLowerCase().includes('log') ||
      t.name.toLowerCase().includes('data')
    );
    
    if (eventRelatedTables.length > 0) {
      console.log('\n🔍 Event-related tables found:');
      eventRelatedTables.forEach(table => {
        console.log(`  - ${table.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

debugDatabaseSchema();