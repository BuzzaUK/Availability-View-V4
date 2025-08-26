const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path (SQLite in development)
const dbPath = path.join(__dirname, 'database.sqlite');

async function analyzeShiftReports() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('🔍 Analyzing shift reports and dropdown issue...');
    
    // Get all shifts
    db.all('SELECT id, shift_name, start_time, end_time, status FROM shifts ORDER BY id', (err, shifts) => {
      if (err) {
        console.error('❌ Error fetching shifts:', err);
        db.close();
        return reject(err);
      }
      
      console.log(`✅ Found ${shifts.length} total shifts`);
      
      // Get all archived shift reports
      db.all(`SELECT * FROM archives`, (err, archives) => {
        if (err) {
          console.error('❌ Error fetching archives:', err);
          db.close();
          return reject(err);
        }
        
        console.log(`✅ Found ${archives.length} archived shift reports`);
        
        // Parse archived data to get shift IDs
        const archivedShiftIds = [];
        const archiveDetails = [];
        
        archives.forEach(archive => {
          try {
            const data = JSON.parse(archive.archived_data);
            if (data.shift_info && data.shift_info.id) {
              archivedShiftIds.push(data.shift_info.id);
              archiveDetails.push({
                archiveId: archive.id,
                shiftId: data.shift_info.id,
                shiftName: data.shift_info.name,
                startTime: data.shift_info.start_time,
                endTime: data.shift_info.end_time,
                status: data.shift_info.status
              });
            }
          } catch (e) {
            console.warn(`⚠️  Could not parse archived data for archive id ${archive.id}`);
          }
        });
        
        console.log('\n📊 Archived Shift Reports:');
        archiveDetails.forEach(detail => {
          console.log(`  - Archive ID ${detail.archiveId}: Shift ${detail.shiftId} (${detail.shiftName})`);
        });
        
        // Find shifts without archives
        const allShiftIds = shifts.map(s => s.id);
        const shiftsWithoutArchives = allShiftIds.filter(id => !archivedShiftIds.includes(id));
        
        console.log('\n📋 Analysis Summary:');
        console.log(`  - Total shifts in database: ${shifts.length}`);
        console.log(`  - Shifts with archived reports: ${archivedShiftIds.length}`);
        console.log(`  - Shifts without archived reports: ${shiftsWithoutArchives.length}`);
        
        if (shiftsWithoutArchives.length > 0) {
          console.log(`  - Shift IDs without reports: [${shiftsWithoutArchives.join(', ')}]`);
          
          console.log('\n🔍 Details of shifts without archived reports:');
          shiftsWithoutArchives.forEach(shiftId => {
            const shift = shifts.find(s => s.id === shiftId);
            if (shift) {
              console.log(`    - Shift ${shift.id}: ${shift.shift_name} (${shift.status})`);
              console.log(`      Start: ${shift.start_time}`);
              console.log(`      End: ${shift.end_time || 'Still active'}`);
            }
          });
        }
        
        // Check for completed shifts that should have reports
        const completedShiftsWithoutReports = shifts.filter(shift => 
          shift.status === 'completed' && !archivedShiftIds.includes(shift.id)
        );
        
        console.log('\n🎯 Key Finding - Completed shifts without archived reports:');
        if (completedShiftsWithoutReports.length === 0) {
          console.log('  ✅ All completed shifts have archived reports');
        } else {
          console.log(`  ❌ ${completedShiftsWithoutReports.length} completed shifts are missing archived reports:`);
          completedShiftsWithoutReports.forEach(shift => {
            console.log(`    - Shift ${shift.id}: ${shift.shift_name}`);
          });
        }
        
        // Check for active shifts
        const activeShifts = shifts.filter(shift => shift.status === 'active');
        console.log(`\n🔄 Active shifts (should not have archived reports): ${activeShifts.length}`);
        activeShifts.forEach(shift => {
          console.log(`  - Shift ${shift.id}: ${shift.shift_name}`);
        });
        
        db.close();
        resolve({
          totalShifts: shifts.length,
          archivedShifts: archivedShiftIds.length,
          shiftsWithoutArchives,
          completedShiftsWithoutReports: completedShiftsWithoutReports.map(s => s.id),
          activeShifts: activeShifts.map(s => s.id),
          archiveDetails
        });
      });
    });
  });
}

// Run the analysis
analyzeShiftReports()
  .then(result => {
    console.log('\n🎉 Shift reports analysis completed!');
    
    // Provide recommendations
    console.log('\n💡 Recommendations:');
    if (result.completedShiftsWithoutReports.length > 0) {
      console.log('  1. Generate archived reports for completed shifts without reports');
      console.log(`     Shift IDs: [${result.completedShiftsWithoutReports.join(', ')}]`);
    }
    
    if (result.totalShifts > result.archivedShifts) {
      console.log('  2. The Natural Language dropdown should show all completed shifts with archived reports');
      console.log(`     Expected dropdown items: ${result.archivedShifts} (currently archived shifts)`);
    }
    
    console.log('  3. Verify that the frontend is correctly filtering shifts for the dropdown');
  })
  .catch(error => {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  });