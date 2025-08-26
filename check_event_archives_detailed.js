const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== CHECKING EVENT ARCHIVES ===\n');

// Check all event archives
db.all(`
  SELECT 
    id, 
    title, 
    description,
    archive_type, 
    date_range_start,
    date_range_end,
    archived_data,
    created_at
  FROM archives 
  WHERE archive_type = 'EVENTS'
  ORDER BY created_at DESC
`, (err, archives) => {
  if (err) {
    console.error('Error querying archives:', err);
    return;
  }
  
  console.log(`Found ${archives.length} event archives:`);
  console.log('=' .repeat(80));
  
  if (archives.length === 0) {
    console.log('No event archives found.');
  } else {
    archives.forEach((archive, index) => {
      console.log(`${index + 1}. Archive ID: ${archive.id}`);
      console.log(`   Title: ${archive.title}`);
      console.log(`   Description: ${archive.description}`);
      console.log(`   Date Range: ${archive.date_range_start} to ${archive.date_range_end}`);
      console.log(`   Created: ${new Date(archive.created_at).toLocaleString()}`);
      
      try {
        const data = JSON.parse(archive.archived_data);
        console.log(`   Event Count: ${data.event_count || 'N/A'}`);
        console.log(`   Shift ID: ${data.shift_id || data.shift_info?.id || 'N/A'}`);
        
        // Check if this archive contains Aug 23 events
        if (data.events && Array.isArray(data.events)) {
          const aug23Events = data.events.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate.getMonth() === 7 && eventDate.getDate() === 23; // August 23
          });
          
          if (aug23Events.length > 0) {
            console.log(`   🎯 CONTAINS ${aug23Events.length} AUG 23 EVENTS!`);
            console.log('   Aug 23 events in this archive:');
            aug23Events.forEach((event, i) => {
              const timestamp = new Date(event.timestamp);
              console.log(`     ${i + 1}. ${timestamp.toLocaleString()} | Asset: ${event.asset_name || event.asset_id} | Type: ${event.event_type} | State: ${event.new_state}`);
            });
            
            // Check for events around 22:00
            const eveningEvents = aug23Events.filter(event => {
              const timestamp = new Date(event.timestamp);
              const hour = timestamp.getHours();
              return hour >= 21 && hour <= 23;
            });
            
            if (eveningEvents.length > 0) {
              console.log(`   🕙 ${eveningEvents.length} events around 22:00 (21:00-23:00)`);
            }
          }
        }
        
      } catch (e) {
        console.log(`   ❌ Error parsing archived_data: ${e.message}`);
      }
      
      console.log('---');
    });
  }
  
  // Also check if there are any archives with Aug 23 in the date range
  console.log('\nARCHIVES COVERING AUG 23:');
  console.log('=' .repeat(80));
  
  const aug23Archives = archives.filter(archive => {
    const startDate = new Date(archive.date_range_start);
    const endDate = new Date(archive.date_range_end);
    const aug23 = new Date('2025-08-23');
    
    return startDate <= aug23 && endDate >= aug23;
  });
  
  if (aug23Archives.length === 0) {
    console.log('No archives found that cover Aug 23, 2025.');
  } else {
    console.log(`Found ${aug23Archives.length} archives covering Aug 23:`);
    aug23Archives.forEach(archive => {
      console.log(`- ${archive.title} (ID: ${archive.id})`);
      console.log(`  Range: ${archive.date_range_start} to ${archive.date_range_end}`);
    });
  }
  
  db.close();
});