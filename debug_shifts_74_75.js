const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Check if database file exists
const dbPath = path.join(__dirname, 'src', 'backend', 'database.db');
console.log('🔍 Database path:', dbPath);
console.log('📁 Database exists:', fs.existsSync(dbPath));

if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log('📊 Database size:', stats.size, 'bytes');
}

// Initialize database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: console.log // Enable logging to see actual queries
});

async function debugShifts74And75() {
  try {
    console.log('\n🔍 Debugging Shifts 74 & 75 KPI Data Issues...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // First, check what tables exist
    const [tables] = await sequelize.query(`
      SELECT name FROM sqlite_master WHERE type='table'
    `);
    
    console.log('\n📋 Available Tables:');
    if (tables.length === 0) {
      console.log('❌ No tables found in database');
      return;
    }
    
    tables.forEach(table => console.log(`  - ${table.name}`));
    
    // Find the correct shifts table name (case insensitive)
    const shiftsTable = tables.find(t => t.name.toLowerCase().includes('shift'));
    if (!shiftsTable) {
      console.log('❌ No shifts table found');
      
      // Show all table schemas
      for (const table of tables) {
        console.log(`\n🔍 Schema for ${table.name}:`);
        const [schema] = await sequelize.query(`PRAGMA table_info(${table.name})`);
        schema.forEach(col => {
          console.log(`  - ${col.name}: ${col.type}`);
        });
      }
      return;
    }
    
    console.log(`\n🔍 Using table: ${shiftsTable.name}`);
    
    // Show table schema
    const [schema] = await sequelize.query(`PRAGMA table_info(${shiftsTable.name})`);
    console.log('\n📋 Table Schema:');
    schema.forEach(col => {
      console.log(`  - ${col.name}: ${col.type}`);
    });
    
    // Check if shifts exist
    const [shifts] = await sequelize.query(`
      SELECT * FROM ${shiftsTable.name} 
      WHERE id IN (74, 75)
      ORDER BY id
    `);
    
    console.log('\n📋 Shift Records:');
    if (shifts.length === 0) {
      console.log('❌ No shifts found with IDs 74 or 75');
      
      // Check what shift IDs do exist
      const [allShifts] = await sequelize.query(`
        SELECT id, shift_number, name, shift_name, start_time, end_time
        FROM ${shiftsTable.name}
        ORDER BY id DESC
        LIMIT 10
      `);
      
      console.log('\n📋 Recent Shifts:');
      allShifts.forEach(shift => {
        console.log(`  Shift ${shift.id}: ${shift.name || shift.shift_name || 'N/A'} (${shift.shift_number || 'No number'})`);
      });
    } else {
      shifts.forEach(shift => {
        console.log(`Shift ${shift.id}:`);
        Object.keys(shift).forEach(key => {
          console.log(`  - ${key}: ${shift[key]}`);
        });
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging shifts:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

debugShifts74And75();