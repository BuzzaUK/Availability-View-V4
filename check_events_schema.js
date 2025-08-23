const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function checkEventsSchema() {
  try {
    console.log('🔍 Checking events table schema...');
    
    // Get table schema
    const [schema] = await sequelize.query(`PRAGMA table_info(events)`);
    
    console.log('\n📊 Events table columns:');
    schema.forEach((column, index) => {
      console.log(`  ${index + 1}. ${column.name} (${column.type}) - ${column.notnull ? 'NOT NULL' : 'NULL'} - Default: ${column.dflt_value || 'None'}`);
    });
    
    // Check existing events structure
    const [sampleEvents] = await sequelize.query(`
      SELECT * FROM events LIMIT 3
    `);
    
    console.log('\n📋 Sample events:');
    if (sampleEvents.length === 0) {
      console.log('  No events found');
    } else {
      sampleEvents.forEach((event, index) => {
        console.log(`  Event ${index + 1}:`);
        Object.keys(event).forEach(key => {
          console.log(`    ${key}: ${event[key]}`);
        });
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkEventsSchema();