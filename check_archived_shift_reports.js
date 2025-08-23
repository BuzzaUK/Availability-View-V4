const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'src', 'backend', 'database.sqlite'),
  logging: false
});

async function checkArchivedShiftReports() {
  try {
    console.log('🔍 CHECKING ARCHIVED SHIFT REPORTS...\n');

    // Get all archives with type SHIFT_REPORT
    const [archives] = await sequelize.query(`
      SELECT 
        id,
        title,
        description,
        archive_type,
        date_range_start,
        date_range_end,
        created_at,
        archived_data
      FROM archives 
      WHERE archive_type = 'SHIFT_REPORT'
      ORDER BY created_at DESC
    `);

    console.log(`📊 Total archived shift reports found: ${archives.length}\n`);

    if (archives.length === 0) {
      console.log('❌ No archived shift reports found in the database.');
      return;
    }

    console.log('📋 ARCHIVED SHIFT REPORTS:');
    console.log('=' .repeat(80));

    archives.forEach((archive, index) => {
      console.log(`${index + 1}. ${archive.title}`);
      console.log(`   ID: ${archive.id}`);
      console.log(`   Description: ${archive.description}`);
      console.log(`   Date Range: ${archive.date_range_start} to ${archive.date_range_end}`);
      console.log(`   Created: ${new Date(archive.created_at).toLocaleString()}`);
      
      // Try to parse archived_data to get shift_id
      try {
        const archivedData = JSON.parse(archive.archived_data);
        if (archivedData.shift_id) {
          console.log(`   Original Shift ID: ${archivedData.shift_id}`);
        }
        if (archivedData.source_archive_id) {
          console.log(`   Source Archive ID: ${archivedData.source_archive_id}`);
        }
      } catch (e) {
        console.log(`   Archived Data: [Unable to parse JSON]`);
      }
      
      console.log('');
    });

    // Now get all shifts to compare
    console.log('\n🔍 CHECKING ALL AVAILABLE SHIFTS...\n');
    
    const [shifts] = await sequelize.query(`
      SELECT 
        id,
        shift_name,
        start_time,
        end_time,
        status,
        archived
      FROM shifts 
      WHERE archived = 0
      ORDER BY start_time DESC
    `);

    console.log(`📊 Total active shifts found: ${shifts.length}\n`);

    console.log('📋 ACTIVE SHIFTS:');
    console.log('=' .repeat(80));

    shifts.forEach((shift, index) => {
      console.log(`${index + 1}. ${shift.shift_name} (ID: ${shift.id})`);
      console.log(`   Start: ${shift.start_time}`);
      console.log(`   End: ${shift.end_time}`);
      console.log(`   Status: ${shift.status}`);
      console.log('');
    });

    // Check which shifts have archived reports
    console.log('\n🔗 MATCHING SHIFTS WITH ARCHIVED REPORTS...\n');
    
    const shiftsWithReports = [];
    const shiftsWithoutReports = [];

    for (const shift of shifts) {
      const hasReport = archives.some(archive => {
        try {
          const archivedData = JSON.parse(archive.archived_data);
          return archivedData.shift_id === shift.id;
        } catch (e) {
          return false;
        }
      });

      if (hasReport) {
        shiftsWithReports.push(shift);
      } else {
        shiftsWithoutReports.push(shift);
      }
    }

    console.log(`✅ Shifts WITH archived reports: ${shiftsWithReports.length}`);
    shiftsWithReports.forEach(shift => {
      console.log(`   - ${shift.shift_name} (ID: ${shift.id})`);
    });

    console.log(`\n❌ Shifts WITHOUT archived reports: ${shiftsWithoutReports.length}`);
    shiftsWithoutReports.forEach(shift => {
      console.log(`   - ${shift.shift_name} (ID: ${shift.id})`);
    });

    console.log('\n📝 SUMMARY:');
    console.log(`   Total Active Shifts: ${shifts.length}`);
    console.log(`   Archived Reports: ${archives.length}`);
    console.log(`   Shifts with Reports: ${shiftsWithReports.length}`);
    console.log(`   Shifts without Reports: ${shiftsWithoutReports.length}`);

  } catch (error) {
    console.error('❌ Error checking archived shift reports:', error);
  } finally {
    await sequelize.close();
  }
}

checkArchivedShiftReports();