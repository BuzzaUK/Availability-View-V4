const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== CHECKING AUG 23 EVENTS ===\n');

// Check for events on Aug 23, 2025
db.all(`
  SELECT 
    id, 
    timestamp, 
    asset_id, 
    event_type, 
    new_state, 
    shift_id,
    DATE(timestamp) as event_date,
    TIME(timestamp) as event_time
  FROM events 
  WHERE DATE(timestamp) = '2025-08-23'
  ORDER BY timestamp
`, (err, events) => {
  if (err) {
    console.error('Error querying events:', err);
    return;
  }
  
  console.log(`Found ${events.length} events on Aug 23, 2025:`);
  console.log('=' .repeat(80));
  
  if (events.length === 0) {
    console.log('No events found for Aug 23, 2025.');
  } else {
    events.forEach((event, index) => {
      const timestamp = new Date(event.timestamp);
      console.log(`${index + 1}. ${timestamp.toLocaleString()} | Asset: ${event.asset_id} | Type: ${event.event_type} | State: ${event.new_state} | Shift: ${event.shift_id || 'NULL'}`);
    });
    
    // Check events around 22:00 (10 PM)
    const eveningEvents = events.filter(event => {
      const timestamp = new Date(event.timestamp);
      const hour = timestamp.getHours();
      return hour >= 21 && hour <= 23; // 9 PM to 11 PM range
    });
    
    console.log(`\nEvents around 22:00 (21:00-23:00): ${eveningEvents.length}`);
    if (eveningEvents.length > 0) {
      console.log('Evening events:');
      eveningEvents.forEach((event, index) => {
        const timestamp = new Date(event.timestamp);
        console.log(`  ${index + 1}. ${timestamp.toLocaleString()} | Asset: ${event.asset_id} | Type: ${event.event_type} | State: ${event.new_state}`);
      });
    }
  }
  
  // Check if there are any shifts that might cover Aug 23
  db.all(`
    SELECT 
      id, 
      shift_name, 
      start_time, 
      end_time, 
      status
    FROM shifts 
    WHERE 
      (DATE(start_time) <= '2025-08-23' AND (end_time IS NULL OR DATE(end_time) >= '2025-08-23'))
      OR DATE(start_time) = '2025-08-23'
      OR DATE(end_time) = '2025-08-23'
    ORDER BY start_time
  `, (err, shifts) => {
    if (err) {
      console.error('Error querying shifts:', err);
      return;
    }
    
    console.log(`\nShifts that might cover Aug 23: ${shifts.length}`);
    console.log('=' .repeat(80));
    
    if (shifts.length === 0) {
      console.log('No shifts found that cover Aug 23, 2025.');
      console.log('\n🚨 ISSUE IDENTIFIED:');
      console.log('   Events exist for Aug 23, but no shift covers that date!');
      console.log('   This means events cannot be associated with a shift for reporting.');
    } else {
      shifts.forEach(shift => {
        const startDate = new Date(shift.start_time);
        const endDate = shift.end_time ? new Date(shift.end_time) : null;
        console.log(`ID: ${shift.id} | ${shift.shift_name}`);
        console.log(`   Start: ${startDate.toLocaleString()}`);
        console.log(`   End: ${endDate ? endDate.toLocaleString() : 'Still active'}`);
        console.log(`   Status: ${shift.status}`);
        console.log('---');
      });
    }
    
    db.close();
  });
});