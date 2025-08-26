const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== CHECKING ROOT DATABASE ===\n');

// Check archives
db.all('SELECT id, title, archive_type, date_range_start, date_range_end FROM archives WHERE archive_type = "SHIFT_REPORT" ORDER BY id DESC', (err, archives) => {
  if (err) {
    console.error('Error querying archives:', err);
    return;
  }
  
  console.log(`Found ${archives.length} shift report archives:`);
  archives.forEach((archive, i) => {
    console.log(`${i+1}. ID: ${archive.id} - ${archive.title}`);
    console.log(`   Date range: ${archive.date_range_start} to ${archive.date_range_end}`);
  });
  
  // Check events
  db.all('SELECT timestamp, asset_name, event_type, new_state, duration FROM events ORDER BY timestamp DESC LIMIT 10', (err, events) => {
    if (err) {
      console.error('Error querying events:', err);
      return;
    }
    
    console.log(`\nFound ${events.length} recent events:`);
    events.forEach((event, i) => {
      console.log(`${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} - Duration: ${event.duration}`);
    });
    
    db.close();
  });
});