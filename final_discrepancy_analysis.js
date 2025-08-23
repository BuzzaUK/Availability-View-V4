const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 FINAL DISCREPANCY ANALYSIS');
console.log('============================================================');
console.log('This analysis demonstrates why events appear in shift reports');
console.log('but are missing from event archives.');
console.log('');

// Get shift 62 details
db.get(`
    SELECT id, shift_name, start_time, end_time 
    FROM shifts 
    WHERE id = 62
`, (err, shift) => {
    if (err) {
        console.error('❌ Error:', err.message);
        db.close();
        return;
    }
    
    if (!shift) {
        console.log('❌ Shift 62 not found');
        db.close();
        return;
    }
    
    console.log(`📋 ANALYZING SHIFT: ${shift.shift_name} (ID: ${shift.id})`);
    console.log(`   Start: ${shift.start_time}`);
    console.log(`   End: ${shift.end_time}`);
    console.log('');
    
    // METHOD 1: How shift reports get events (by timestamp only)
    console.log('🔍 METHOD 1: SHIFT REPORT LOGIC (Timestamp filtering only)');
    console.log('   Query: SELECT events WHERE timestamp BETWEEN start_time AND end_time');
    console.log('');
    
    db.all(`
        SELECT e.id, e.timestamp, e.event_type, e.new_state, e.shift_id, 
               a.name as asset_name
        FROM events e
        LEFT JOIN assets a ON e.asset_id = a.id
        WHERE e.timestamp >= ? AND e.timestamp <= ?
        ORDER BY e.timestamp
    `, [shift.start_time, shift.end_time], (err1, reportEvents) => {
        if (err1) {
            console.error('❌ Error:', err1.message);
            db.close();
            return;
        }
        
        console.log(`   📊 RESULT: Found ${reportEvents.length} events`);
        reportEvents.forEach((event, i) => {
            console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (shift_id: ${event.shift_id || 'NULL'})`);
        });
        console.log('');
        
        // METHOD 2: How event archives get events (by timestamp AND shift_id)
        console.log('🔍 METHOD 2: EVENT ARCHIVE LOGIC (Timestamp + Shift ID filtering)');
        console.log('   Query: SELECT events WHERE timestamp BETWEEN start_time AND end_time AND shift_id = shift.id');
        console.log('');
        
        db.all(`
            SELECT e.id, e.timestamp, e.event_type, e.new_state, e.shift_id, 
                   a.name as asset_name
            FROM events e
            LEFT JOIN assets a ON e.asset_id = a.id
            WHERE e.timestamp >= ? AND e.timestamp <= ? AND e.shift_id = ?
            ORDER BY e.timestamp
        `, [shift.start_time, shift.end_time, shift.id], (err2, archiveEvents) => {
            if (err2) {
                console.error('❌ Error:', err2.message);
                db.close();
                return;
            }
            
            console.log(`   📊 RESULT: Found ${archiveEvents.length} events`);
            archiveEvents.forEach((event, i) => {
                console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (shift_id: ${event.shift_id})`);
            });
            console.log('');
            
            // ANALYSIS
            console.log('⚖️ COMPARISON & ROOT CAUSE ANALYSIS');
            console.log('============================================================');
            console.log(`   Shift Report Events: ${reportEvents.length}`);
            console.log(`   Event Archive Events: ${archiveEvents.length}`);
            console.log('');
            
            if (reportEvents.length !== archiveEvents.length) {
                console.log('   ❌ DISCREPANCY CONFIRMED!');
                console.log('');
                
                const reportEventIds = new Set(reportEvents.map(e => e.id));
                const archiveEventIds = new Set(archiveEvents.map(e => e.id));
                
                const missingFromArchive = reportEvents.filter(e => !archiveEventIds.has(e.id));
                
                if (missingFromArchive.length > 0) {
                    console.log(`   📋 EVENTS IN SHIFT REPORT BUT NOT IN ARCHIVE (${missingFromArchive.length}):`);
                    missingFromArchive.forEach((event, i) => {
                        console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state}`);
                        console.log(`        ⚠️  shift_id: ${event.shift_id || 'NULL'} (This is why it's missing!)`);
                    });
                    console.log('');
                }
                
                console.log('   🎯 ROOT CAUSE:');
                console.log('     • Shift reports use getAllEvents() + timestamp filtering');
                console.log('     • Event archives use getEventsForArchiving() + shift_id filtering');
                console.log('     • Events with NULL shift_id appear in reports but not archives!');
                console.log('');
                console.log('   💡 SOLUTION:');
                console.log('     • Update event creation to always set shift_id for events during shifts');
                console.log('     • OR modify archive logic to include events by timestamp only');
                console.log('     • OR modify shift report logic to filter by shift_id like archives');
                
            } else {
                console.log('   ✅ No discrepancy found - both methods return same events');
            }
            
            console.log('');
            console.log('✅ Analysis complete');
            db.close();
        });
    });
});