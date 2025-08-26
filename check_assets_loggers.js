const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function checkAssetsAndLoggers() {
  try {
    console.log('🔍 Checking available assets and loggers...');
    
    // First check table schemas
    console.log('\n📊 Assets table schema:');
    const [assetsSchema] = await sequelize.query(`PRAGMA table_info(assets)`);
    assetsSchema.forEach(col => {
      console.log(`  ${col.name} (${col.type})`);
    });
    
    console.log('\n📊 Loggers table schema:');
    const [loggersSchema] = await sequelize.query(`PRAGMA table_info(loggers)`);
    loggersSchema.forEach(col => {
      console.log(`  ${col.name} (${col.type})`);
    });
    
    // Check assets with correct column names
    const [assets] = await sequelize.query(`SELECT * FROM assets LIMIT 5`);
    console.log('\n📊 Available Assets:');
    if (assets.length === 0) {
      console.log('  No assets found');
    } else {
      assets.forEach(asset => {
        console.log(`  Asset:`, asset);
      });
    }
    
    // Check loggers with correct column names
    const [loggers] = await sequelize.query(`SELECT * FROM loggers LIMIT 5`);
    console.log('\n📊 Available Loggers:');
    if (loggers.length === 0) {
      console.log('  No loggers found');
    } else {
      loggers.forEach(logger => {
        console.log(`  Logger:`, logger);
      });
    }
    
    // Check shifts 74 and 75
    const [shifts] = await sequelize.query(`
      SELECT id, start_time, end_time, status 
      FROM shifts 
      WHERE id IN (74, 75)
      ORDER BY id
    `);
    console.log('\n📊 Target Shifts:');
    if (shifts.length === 0) {
      console.log('  Shifts 74 and 75 not found');
    } else {
      shifts.forEach(shift => {
        console.log(`  Shift ${shift.id}: ${shift.start_time} to ${shift.end_time || 'ongoing'} (${shift.status})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkAssetsAndLoggers();