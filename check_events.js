const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 CHECKING EVENTS IN DATABASE');
console.log('============================================================');

// First check total count
db.get('SELECT COUNT(*) as count FROM events', (err, row) => {
    if (err) {
        console.error('❌ Error:', err.message);
        db.close();
        return;
    }
    
    console.log(`Total events in database: ${row.count}`);
    console.log('');
    
    if (row.count === 0) {
        console.log('❌ No events found in database!');
        db.close();
        return;
    }
    
    // Get recent events
    db.all(`
        SELECT e.id, e.timestamp, e.event_type, e.new_state, e.shift_id, 
               e.asset_id, a.name as asset_name
        FROM events e
        LEFT JOIN assets a ON e.asset_id = a.id
        ORDER BY e.timestamp DESC 
        LIMIT 10
    `, (err2, events) => {
        if (err2) {
            console.error('❌ Error:', err2.message);
        } else {
            console.log('Recent events:');
            events.forEach((event, i) => {
                console.log(`  ${i+1}. ID: ${event.id}`);
                console.log(`     Timestamp: ${event.timestamp}`);
                console.log(`     Asset: ${event.asset_name || 'Unknown'} (ID: ${event.asset_id})`);
                console.log(`     Type: ${event.event_type}`);
                console.log(`     State: ${event.new_state}`);
                console.log(`     Shift ID: ${event.shift_id || 'NULL'}`);
                console.log('');
            });
        }
        
        // Check events for shift 62 specifically
        db.all(`
            SELECT e.id, e.timestamp, e.event_type, e.new_state, e.shift_id, 
                   e.asset_id, a.name as asset_name
            FROM events e
            LEFT JOIN assets a ON e.asset_id = a.id
            WHERE e.timestamp >= '2025-08-23 13:00:00' 
              AND e.timestamp <= '2025-08-23 13:24:09'
            ORDER BY e.timestamp
        `, (err3, shiftEvents) => {
            if (err3) {
                console.error('❌ Error:', err3.message);
            } else {
                console.log(`Events in shift 62 timeframe (2025-08-23 13:00:00 to 13:24:09): ${shiftEvents.length}`);
                shiftEvents.forEach((event, i) => {
                    console.log(`  ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (shift_id: ${event.shift_id || 'NULL'})`);
                });
            }
            db.close();
        });
    });
});