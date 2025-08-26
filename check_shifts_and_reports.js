const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== CHECKING SHIFTS AND ARCHIVED REPORTS ===\n');

// Check recent shifts
db.all('SELECT id, shift_name, start_time, end_time, status FROM shifts ORDER BY start_time DESC LIMIT 10', (err, shifts) => {
  if (err) {
    console.error('Error querying shifts:', err);
    return;
  }
  
  console.log('RECENT SHIFTS:');
  console.log('=' .repeat(80));
  shifts.forEach(shift => {
    const startDate = new Date(shift.start_time);
    const endDate = shift.end_time ? new Date(shift.end_time) : null;
    console.log(`ID: ${shift.id} | ${shift.shift_name} | ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()} | Status: ${shift.status}`);
    if (endDate) {
      console.log(`   End: ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}`);
    }
    console.log('---');
  });
  
  // Check archived shift reports
  db.all('SELECT id, title, archive_type, archived_data FROM archives WHERE archive_type = "SHIFT_REPORT" ORDER BY created_at DESC', (err, reports) => {
    if (err) {
      console.error('Error querying archived reports:', err);
      return;
    }
    
    console.log('\nARCHIVED SHIFT REPORTS:');
    console.log('=' .repeat(80));
    
    if (reports.length === 0) {
      console.log('No archived shift reports found.');
    } else {
      reports.forEach(report => {
        try {
          const data = JSON.parse(report.archived_data);
          console.log(`Archive ID: ${report.id}`);
          console.log(`Title: ${report.title}`);
          console.log(`Shift ID: ${data.shift_id || 'N/A'}`);
          console.log('---');
        } catch (e) {
          console.log(`Archive ID: ${report.id} | Title: ${report.title} | Shift ID: Parse Error`);
          console.log('---');
        }
      });
    }
    
    // Check for Aug 23 shift specifically
    console.log('\nLOOKING FOR AUG 23 SHIFT:');
    console.log('=' .repeat(80));
    
    const aug23Shifts = shifts.filter(shift => {
      const startDate = new Date(shift.start_time);
      return startDate.getMonth() === 7 && startDate.getDate() === 23; // August is month 7
    });
    
    if (aug23Shifts.length > 0) {
      console.log('Found Aug 23 shifts:');
      aug23Shifts.forEach(shift => {
        const startDate = new Date(shift.start_time);
        console.log(`ID: ${shift.id} | ${shift.shift_name} | ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`);
        
        // Check if this shift has archived reports
        const hasReport = reports.some(report => {
          try {
            const data = JSON.parse(report.archived_data);
            return data.shift_id === shift.id;
          } catch (e) {
            return false;
          }
        });
        
        console.log(`   Has archived report: ${hasReport ? 'YES' : 'NO'}`);
      });
    } else {
      console.log('No Aug 23 shifts found in recent shifts.');
    }
    
    db.close();
  });
});