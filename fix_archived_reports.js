const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path (SQLite in development)
const dbPath = path.join(__dirname, 'database.sqlite');

async function fixArchivedReports() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('🔍 Starting archived reports cleanup...');
    
    // First, get all existing shift IDs
    db.all('SELECT id FROM shifts ORDER BY id', (err, shifts) => {
      if (err) {
        console.error('❌ Error fetching shifts:', err);
        db.close();
        return reject(err);
      }
      
      const existingShiftIds = shifts.map(shift => shift.id);
      console.log('✅ Existing shift IDs:', existingShiftIds);
      
      // Get all archived reports
      db.all('SELECT * FROM archives ORDER BY shift_id', (err, reports) => {
        if (err) {
          console.error('❌ Error fetching archived reports:', err);
          db.close();
          return reject(err);
        }
        
        console.log('📊 Current archived reports:');
        reports.forEach(report => {
          const exists = existingShiftIds.includes(report.shift_id);
          console.log(`  - Report ID ${report.id}: Shift ${report.shift_id} ${exists ? '✅ EXISTS' : '❌ INVALID'}`);
        });
        
        // Find reports with invalid shift IDs
        const invalidReports = reports.filter(report => !existingShiftIds.includes(report.shift_id));
        
        if (invalidReports.length > 0) {
          console.log(`\n🗑️  Deleting ${invalidReports.length} invalid archived reports...`);
          
          const invalidIds = invalidReports.map(report => report.id);
          const placeholders = invalidIds.map(() => '?').join(',');
          
          db.run(`DELETE FROM archives WHERE id IN (${placeholders})`, invalidIds, function(err) {
            if (err) {
              console.error('❌ Error deleting invalid reports:', err);
              db.close();
              return reject(err);
            }
            
            console.log(`✅ Deleted ${this.changes} invalid archived reports`);
            
            // Now check which existing shifts need reports
            db.all('SELECT shift_id FROM archives', (err, remainingReports) => {
              if (err) {
                console.error('❌ Error fetching remaining reports:', err);
                db.close();
                return reject(err);
              }
              
              const shiftsWithReports = remainingReports.map(report => report.shift_id);
              const shiftsNeedingReports = existingShiftIds.filter(id => !shiftsWithReports.includes(id));
              
              console.log('\n📋 Summary:');
              console.log(`  - Total existing shifts: ${existingShiftIds.length}`);
              console.log(`  - Shifts with reports: ${shiftsWithReports.length}`);
              console.log(`  - Shifts needing reports: ${shiftsNeedingReports.length}`);
              
              if (shiftsNeedingReports.length > 0) {
                console.log(`  - Shift IDs needing reports: [${shiftsNeedingReports.join(', ')}]`);
              }
              
              db.close();
              resolve({
                existingShifts: existingShiftIds,
                shiftsWithReports,
                shiftsNeedingReports,
                deletedInvalidReports: invalidReports.length
              });
            });
          });
        } else {
          console.log('\n✅ No invalid reports found');
          
          // Check which existing shifts need reports
          const shiftsWithReports = reports.map(report => report.shift_id);
          const shiftsNeedingReports = existingShiftIds.filter(id => !shiftsWithReports.includes(id));
          
          console.log('\n📋 Summary:');
          console.log(`  - Total existing shifts: ${existingShiftIds.length}`);
          console.log(`  - Shifts with reports: ${shiftsWithReports.length}`);
          console.log(`  - Shifts needing reports: ${shiftsNeedingReports.length}`);
          
          if (shiftsNeedingReports.length > 0) {
            console.log(`  - Shift IDs needing reports: [${shiftsNeedingReports.join(', ')}]`);
          }
          
          db.close();
          resolve({
            existingShifts: existingShiftIds,
            shiftsWithReports,
            shiftsNeedingReports,
            deletedInvalidReports: 0
          });
        }
      });
    });
  });
}

// Run the cleanup
fixArchivedReports()
  .then(result => {
    console.log('\n🎉 Archived reports cleanup completed successfully!');
    console.log('Result:', result);
  })
  .catch(error => {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  });