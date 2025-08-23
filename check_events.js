const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'src', 'backend', 'database.sqlite'),
  logging: false
});

(async () => {
  try {
    console.log('Checking Events Table...');
    
    // Check if events table exists and get recent events
    const [events] = await sequelize.query(
      'SELECT asset_id, event_type, new_state, duration, timestamp FROM events ORDER BY timestamp DESC LIMIT 20'
    );
    
    console.log(`\nFound ${events.length} recent events:`);
    events.forEach(event => {
      console.log(`Asset ${event.asset_id}: ${event.event_type} -> ${event.new_state}, Duration: ${event.duration}s, Time: ${event.timestamp}`);
    });
    
    // Get total events count
    const [countResult] = await sequelize.query('SELECT COUNT(*) as total FROM events');
    console.log(`\nTotal events in database: ${countResult[0].total}`);
    
    // Check events by asset
    const [eventsByAsset] = await sequelize.query(
      'SELECT asset_id, COUNT(*) as event_count FROM events GROUP BY asset_id'
    );
    
    console.log('\nEvents by Asset:');
    eventsByAsset.forEach(row => {
      console.log(`Asset ${row.asset_id}: ${row.event_count} events`);
    });
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    await sequelize.close();
  }
})();