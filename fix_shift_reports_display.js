const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');

async function fixShiftReportsDisplay() {
  const db = new sqlite3.Database(dbPath);
  
  console.log('=== Fixing Shift Reports Display Issues ===\n');
  
  // First, let's check the current archived shift report
  console.log('1. Current archived shift report:');
  db.all(`SELECT * FROM archives WHERE archive_type = 'SHIFT_REPORT'`, (err, archives) => {
    if (err) {
      console.error('Error querying archives:', err);
      return;
    }
    
    console.log(`Found ${archives.length} shift report archives:`);
    archives.forEach(archive => {
      console.log(`- ID: ${archive.id}, Title: ${archive.title}`);
      console.log(`- Created: ${archive.created_at}`);
      console.log(`- Status: ${archive.status}`);
      
      // Parse the archived data
      try {
        const archivedData = JSON.parse(archive.archived_data);
        console.log(`- Start Time: ${archivedData.start_time}`);
        console.log(`- End Time: ${archivedData.end_time}`);
        console.log(`- Duration: ${archivedData.duration}`);
        console.log(`- Availability: ${archivedData.availability}`);
        console.log(`- Performance: ${archivedData.performance}`);
        console.log(`- Quality: ${archivedData.quality}`);
        console.log(`- OEE: ${archivedData.oee}`);
        console.log('---');
      } catch (parseErr) {
        console.error('Error parsing archived_data:', parseErr);
      }
    });
    
    // Now check the corresponding shift
    console.log('\n2. Checking corresponding shifts:');
    db.all(`SELECT * FROM shifts ORDER BY id DESC LIMIT 5`, (err, shifts) => {
      if (err) {
        console.error('Error querying shifts:', err);
        return;
      }
      
      console.log(`Found ${shifts.length} recent shifts:`);
      shifts.forEach(shift => {
        console.log(`- Shift ID: ${shift.id}`);
        console.log(`- Start Time: ${shift.start_time}`);
        console.log(`- End Time: ${shift.end_time}`);
        console.log(`- Status: ${shift.status}`);
        console.log('---');
      });
      
      // Fix the archived data if needed
      console.log('\n3. Fixing archived data with null end_time:');
      
      archives.forEach(archive => {
        try {
          const archivedData = JSON.parse(archive.archived_data);
          
          if (!archivedData.end_time) {
            console.log(`Fixing archive ID ${archive.id} with null end_time...`);
            
            // Find the corresponding shift
            const correspondingShift = shifts.find(s => s.id.toString() === archivedData.shift_id?.toString());
            
            if (correspondingShift && correspondingShift.end_time) {
              console.log(`Found corresponding shift with end_time: ${correspondingShift.end_time}`);
              
              // Update the archived data
              archivedData.end_time = correspondingShift.end_time;
              
              // Recalculate duration if needed
              if (archivedData.start_time && archivedData.end_time) {
                const startTime = new Date(archivedData.start_time);
                const endTime = new Date(archivedData.end_time);
                archivedData.duration = endTime.getTime() - startTime.getTime();
                console.log(`Recalculated duration: ${archivedData.duration} ms`);
              }
              
              // Update the database
              const updatedArchivedData = JSON.stringify(archivedData);
              
              db.run(
                `UPDATE archives SET archived_data = ? WHERE id = ?`,
                [updatedArchivedData, archive.id],
                function(updateErr) {
                  if (updateErr) {
                    console.error('Error updating archive:', updateErr);
                  } else {
                    console.log(`Successfully updated archive ID ${archive.id}`);
                  }
                }
              );
            } else {
              console.log(`No corresponding shift found or shift has no end_time`);
            }
          } else {
            console.log(`Archive ID ${archive.id} already has end_time: ${archivedData.end_time}`);
          }
        } catch (parseErr) {
          console.error(`Error processing archive ID ${archive.id}:`, parseErr);
        }
      });
      
      // Close database after a delay to allow updates to complete
      setTimeout(() => {
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('\n=== Fix completed ===');
          }
        });
      }, 1000);
    });
  });
}

fixShiftReportsDisplay().catch(console.error);