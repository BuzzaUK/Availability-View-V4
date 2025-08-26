const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');

async function checkActualShifts() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('🔍 Checking actual shifts in database...');
    
    // Get all shifts
    db.all(`SELECT id, shift_name, shift_number, start_time, end_time, status FROM shifts ORDER BY id`, (err, shifts) => {
      if (err) {
        console.error('Error fetching shifts:', err);
        return reject(err);
      }
      
      console.log(`\n📊 Found ${shifts.length} total shifts:`);
      shifts.forEach(shift => {
        console.log(`  - ID: ${shift.id}, Name: ${shift.shift_name}, Number: ${shift.shift_number}, Status: ${shift.status}`);
        console.log(`    Start: ${shift.start_time}, End: ${shift.end_time}`);
      });
      
      // Get all existing shift report archives
      db.all(`SELECT id, title, archived_data FROM archives WHERE archive_type = 'SHIFT_REPORT'`, (err, archives) => {
        if (err) {
          console.error('Error fetching archives:', err);
          return reject(err);
        }
        
        console.log(`\n📋 Found ${archives.length} existing shift report archives:`);
        archives.forEach(archive => {
          try {
            const data = JSON.parse(archive.archived_data);
            console.log(`  - Archive ID: ${archive.id}, Title: ${archive.title}`);
            console.log(`    Shift ID: ${data.shift_id}, Shift Name: ${data.shift_name}`);
          } catch (e) {
            console.log(`  - Archive ID: ${archive.id}, Title: ${archive.title}`);
            console.log(`    Could not parse archived_data: ${e.message}`);
          }
        });
        
        // Extract shift IDs from existing archives
        const existingShiftIds = new Set();
        archives.forEach(archive => {
          try {
            const data = JSON.parse(archive.archived_data);
            if (data.shift_id) {
              existingShiftIds.add(data.shift_id);
            }
          } catch (e) {
            console.warn('Could not parse archive data:', e.message);
          }
        });
        
        console.log('\n📝 Existing shift IDs with reports:', Array.from(existingShiftIds));
        
        // Find shifts without reports
        const shiftsWithoutReports = shifts.filter(shift => !existingShiftIds.has(shift.id));
        
        console.log(`\n🎯 Shifts without archived reports (${shiftsWithoutReports.length}):`);
        shiftsWithoutReports.forEach(shift => {
          console.log(`  - Shift ${shift.id}: ${shift.shift_name} (${shift.start_time} - ${shift.end_time})`);
        });
        
        db.close();
        resolve();
      });
    });
  });
}

// Run the script
if (require.main === module) {
  checkActualShifts()
    .then(() => {
      console.log('\n✅ Check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkActualShifts };