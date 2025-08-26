const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path - use the ROOT database.sqlite file that the backend actually uses
const dbPath = path.join(__dirname, 'database.sqlite');

async function checkDatabaseBinary() {
  const db = new sqlite3.Database(dbPath);
  
  console.log('=== Checking ROOT Database for 24/08/2025 Data ===\n');
  console.log('Database path:', dbPath);
  
  // Check shifts table for any 24/08/2025 data
  console.log('\n1. Checking shifts table for 24/08/2025:');
  db.all(`SELECT * FROM shifts WHERE start_time LIKE '%2025-08-24%' OR start_time LIKE '%24/08/2025%' OR shift_name LIKE '%24/08/2025%'`, (err, shifts) => {
    if (err) {
      console.error('Error querying shifts:', err);
    } else {
      console.log(`Found ${shifts.length} shifts for 24/08/2025`);
      shifts.forEach(shift => {
        console.log(`  ID: ${shift.id}, Name: ${shift.shift_name}, Start: ${shift.start_time}, End: ${shift.end_time}`);
      });
    }
    
    // Check archives table for any 24/08/2025 data
    console.log('\n2. Checking archives table for 24/08/2025:');
    db.all(`SELECT * FROM archives WHERE title LIKE '%24/08/2025%' OR archived_data LIKE '%24/08/2025%' OR date_range_start LIKE '%2025-08-24%'`, (err, archives) => {
      if (err) {
        console.error('Error querying archives:', err);
      } else {
        console.log(`Found ${archives.length} archives for 24/08/2025`);
        archives.forEach(archive => {
          console.log(`  ID: ${archive.id}, Title: ${archive.title}`);
          console.log(`  Date Range: ${archive.date_range_start} to ${archive.date_range_end}`);
          console.log(`  Archive Type: ${archive.archive_type}`);
          
          // Try to parse archived_data
          try {
            const data = JSON.parse(archive.archived_data);
            console.log(`  Shift Info:`, data.shift_info || 'N/A');
            console.log(`  Generation Time:`, data.generation_metadata?.generation_time || 'N/A');
          } catch (e) {
            console.log(`  Archived Data: ${archive.archived_data.substring(0, 100)}...`);
          }
          console.log('  ---');
        });
      }
      
      // Check events table for any 24/08/2025 data
      console.log('\n3. Checking events table for 24/08/2025:');
      db.all(`SELECT COUNT(*) as count FROM events WHERE timestamp LIKE '%2025-08-24%'`, (err, eventCount) => {
        if (err) {
          console.error('Error querying events:', err);
        } else {
          console.log(`Found ${eventCount[0].count} events for 24/08/2025`);
        }
        
        // Check for any recent archives that might contain the data
        console.log('\n4. Checking all recent SHIFT_REPORT archives:');
        db.all(`SELECT * FROM archives WHERE archive_type = 'SHIFT_REPORT' ORDER BY created_at DESC LIMIT 10`, (err, recentArchives) => {
          if (err) {
            console.error('Error querying recent archives:', err);
          } else {
            console.log(`Found ${recentArchives.length} recent shift report archives`);
            recentArchives.forEach(archive => {
              console.log(`  ID: ${archive.id}, Title: ${archive.title}`);
              console.log(`  Created: ${archive.created_at}`);
              console.log(`  Date Range: ${archive.date_range_start} to ${archive.date_range_end}`);
              
              // Parse archived_data to look for shift info
              try {
                const data = JSON.parse(archive.archived_data);
                if (data.shift_info) {
                  console.log(`  Shift Name: ${data.shift_info.shift_name}`);
                  console.log(`  Shift Start: ${data.shift_info.start_time}`);
                  console.log(`  Shift End: ${data.shift_info.end_time}`);
                }
              } catch (e) {
                console.log(`  Could not parse archived_data`);
              }
              console.log('  ---');
            });
          }
          
          db.close();
        });
      });
    });
  });
}

checkDatabaseBinary().catch(console.error);