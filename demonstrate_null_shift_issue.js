const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 DEMONSTRATING NULL SHIFT_ID ISSUE');
console.log('============================================================');
console.log('This demonstrates the core issue: events with NULL shift_id');
console.log('appear in shift reports but not in event archives.');
console.log('');

// Let's create a hypothetical scenario using the current shift (63) which is still running
db.get(`
    SELECT id, shift_name, start_time, end_time 
    FROM shifts 
    WHERE id = 63
`, (err, shift) => {
    if (err) {
        console.error('❌ Error:', err.message);
        db.close();
        return;
    }
    
    if (!shift) {
        console.log('❌ Shift 63 not found');
        db.close();
        return;
    }
    
    console.log(`📋 ANALYZING CURRENT SHIFT: ${shift.shift_name} (ID: ${shift.id})`);
    console.log(`   Start: ${shift.start_time}`);
    console.log(`   End: ${shift.end_time || 'Still running'}`);
    console.log('');
    
    // Look for events that occurred after this shift started
    console.log('🔍 EVENTS SINCE SHIFT START:');
    console.log('');
    
    db.all(`
        SELECT e.id, e.timestamp, e.event_type, e.new_state, e.shift_id, 
               a.name as asset_name
        FROM events e
        LEFT JOIN assets a ON e.asset_id = a.id
        WHERE e.timestamp >= ?
        ORDER BY e.timestamp
    `, [shift.start_time], (err1, allEvents) => {
        if (err1) {
            console.error('❌ Error:', err1.message);
            db.close();
            return;
        }
        
        console.log(`   📊 Total events since shift start: ${allEvents.length}`);
        allEvents.forEach((event, i) => {
            const shiftStatus = event.shift_id ? `shift_id: ${event.shift_id}` : '⚠️  shift_id: NULL';
            console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (${shiftStatus})`);
        });
        console.log('');
        
        // Now show what would be in shift report vs archive
        const eventsWithShiftId = allEvents.filter(e => e.shift_id === shift.id);
        const eventsWithNullShiftId = allEvents.filter(e => e.shift_id === null);
        
        console.log('⚖️ FILTERING COMPARISON:');
        console.log('============================================================');
        console.log('');
        
        console.log('📋 SHIFT REPORT LOGIC (timestamp filtering):');
        console.log(`   Would include ALL ${allEvents.length} events above`);
        console.log('   ✅ Includes events with shift_id = 63');
        console.log('   ✅ Includes events with shift_id = NULL');
        console.log('');
        
        console.log('📋 EVENT ARCHIVE LOGIC (timestamp + shift_id filtering):');
        console.log(`   Would include ONLY ${eventsWithShiftId.length} events with shift_id = ${shift.id}`);
        console.log('   ✅ Includes events with shift_id = 63');
        console.log('   ❌ EXCLUDES events with shift_id = NULL');
        console.log('');
        
        if (eventsWithNullShiftId.length > 0) {
            console.log(`🚨 MISSING FROM ARCHIVES: ${eventsWithNullShiftId.length} events with NULL shift_id`);
            eventsWithNullShiftId.forEach((event, i) => {
                console.log(`   ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state}`);
            });
            console.log('');
            console.log('   🎯 These events appear in emailed shift reports but NOT in event archives!');
            console.log('');
        }
        
        console.log('💡 ROOT CAUSE EXPLANATION:');
        console.log('============================================================');
        console.log('1. When events are created during a shift, some get shift_id assigned, others don\'t');
        console.log('2. Shift reports use reportService.generateShiftReport() which:');
        console.log('   - Calls getAllEvents() to get ALL events');
        console.log('   - Filters by timestamp range only');
        console.log('   - Includes events with NULL shift_id');
        console.log('');
        console.log('3. Event archives use shiftScheduler.archiveShiftEvents() which:');
        console.log('   - Calls getEventsForArchiving() with shift_id parameter');
        console.log('   - Filters by timestamp AND shift_id');
        console.log('   - EXCLUDES events with NULL shift_id');
        console.log('');
        console.log('4. Result: Events with NULL shift_id appear in reports but not archives!');
        console.log('');
        
        console.log('🔧 SOLUTION OPTIONS:');
        console.log('============================================================');
        console.log('A. Fix event creation to always assign shift_id during shifts');
        console.log('B. Modify archive logic to include events by timestamp only');
        console.log('C. Modify report logic to filter by shift_id like archives');
        console.log('');
        console.log('✅ Analysis complete - Root cause identified!');
        
        db.close();
    });
});