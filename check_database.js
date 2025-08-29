const { Sequelize } = require('sequelize');
const path = require('path');

// Direct SQLite connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database for loggers and assets...');
    
    // Query loggers
    const [loggers] = await sequelize.query(`
      SELECT id, logger_id, status, last_seen
      FROM loggers
    `);
    
    console.log(`\n📡 Found ${loggers.length} loggers:`);
    loggers.forEach(logger => {
      console.log(`  - ID: ${logger.id}, Logger ID: ${logger.logger_id}, Status: ${logger.status}`);
    });
    
    // Query assets
    const [assets] = await sequelize.query(`
      SELECT id, name, pin_number, logger_id, current_state
      FROM assets
    `);
    
    console.log(`\n🏭 Found ${assets.length} assets:`);
    assets.forEach(asset => {
      console.log(`  - ID: ${asset.id}, Name: ${asset.name}, Pin: ${asset.pin_number}, Logger ID: ${asset.logger_id}, State: ${asset.current_state}`);
    });
    
    // Query recent events
    const [events] = await sequelize.query(`
      SELECT event_type, previous_state, new_state, timestamp, duration
      FROM events
      ORDER BY timestamp DESC
      LIMIT 10
    `);
    
    console.log(`\n📋 Recent events (last 10):`);
    events.forEach(event => {
      console.log(`  - ${event.event_type}: ${event.previous_state} → ${event.new_state} (${event.duration}s) at ${event.timestamp}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkDatabase();