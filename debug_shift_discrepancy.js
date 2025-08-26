const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

async function checkShiftDiscrepancy() {
  try {
    console.log('🔍 Investigating Shift Data Discrepancy\n');
    
    // First, check table schemas
    console.log('📋 Checking table schemas...');
    const [shiftsColumns] = await sequelize.query('PRAGMA table_info(shifts)');
    console.log('Shifts table columns:');
    shiftsColumns.forEach(col => {
      console.log(`  - ${col.name}: ${col.type}`);
    });
    
    // Check all available tables
    const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('\n📋 Available tables:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Check total shifts in shifts table
    const [totalShifts] = await sequelize.query('SELECT COUNT(*) as total_shifts FROM shifts');
    console.log(`\n📊 Total shifts in database: ${totalShifts[0].total_shifts}`);
    
    // Check recent shifts (using correct column name)
    const [recentShifts] = await sequelize.query(
      'SELECT * FROM shifts ORDER BY start_time DESC LIMIT 5'
    );
    console.log('\n📅 Recent shifts:');
    recentShifts.forEach(shift => {
      console.log(`  - ID: ${shift.id}, Start: ${shift.start_time}, End: ${shift.end_time}, Status: ${shift.status}`);
    });
    
    // Check if there's a shift_reports table
    const shiftReportsExists = tables.find(t => t.name === 'shift_reports');
    if (shiftReportsExists) {
      const [shiftReports] = await sequelize.query('SELECT COUNT(*) as count FROM shift_reports');
      console.log(`\n📊 Shift reports count: ${shiftReports[0].count}`);
      
      const [recentReports] = await sequelize.query(
        'SELECT * FROM shift_reports ORDER BY created_at DESC LIMIT 5'
      );
      console.log('\n📋 Recent shift reports:');
      recentReports.forEach(report => {
        console.log(`  - Report ID: ${report.id}, Shift ID: ${report.shift_id}, Created: ${report.created_at}`);
      });
    }
    
    // Check if there's an archives table
    const archivesExists = tables.find(t => t.name === 'archives');
    if (archivesExists) {
      // Check archives table schema
      const [archivesColumns] = await sequelize.query('PRAGMA table_info(archives)');
      console.log('\n📋 Archives table columns:');
      archivesColumns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}`);
      });
      
      const [archives] = await sequelize.query('SELECT COUNT(*) as count FROM archives');
      console.log(`\n📦 Archives count: ${archives[0].count}`);
      
      const [recentArchives] = await sequelize.query(
        'SELECT * FROM archives ORDER BY created_at DESC LIMIT 5'
      );
      console.log('\n📋 Recent archives:');
      recentArchives.forEach(archive => {
        console.log(`  - Archive ID: ${archive.id}, Data: ${JSON.stringify(archive, null, 2)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

checkShiftDiscrepancy();