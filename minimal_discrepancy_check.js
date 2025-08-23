const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkDiscrepancy() {
    const dbPath = path.join(__dirname, 'database.sqlite');
    const db = new sqlite3.Database(dbPath);
    
    console.log('🔍 CHECKING EVENT DISCREPANCY');
    console.log('============================================================');
    
    try {
        // Get shift ID 62 (the one from the user's image)
        const shift = await new Promise((resolve, reject) => {
            db.get(`
                SELECT id, shift_name, start_time, end_time 
                FROM shifts 
                WHERE id = 62
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!shift) {
            console.log('❌ No shifts found');
            return;
        }
        
        console.log(`📋 Analyzing shift: ${shift.shift_name} (ID: ${shift.id})`);
        console.log(`   Start: ${shift.start_time}`);
        console.log(`   End: ${shift.end_time}`);
        console.log('');
        
        // METHOD 1: Events by timestamp only (like shift reports)
        const eventsByTimestamp = await new Promise((resolve, reject) => {
            db.all(`
                SELECT e.id, e.timestamp, e.event_type, e.new_state, e.shift_id, a.name as asset_name
                FROM events e
                JOIN assets a ON e.asset_id = a.id
                WHERE e.timestamp >= ? AND e.timestamp <= ?
                ORDER BY e.timestamp
            `, [shift.start_time, shift.end_time], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('🔍 METHOD 1: EVENTS BY TIMESTAMP ONLY (Shift Report Logic)');
        console.log(`   Found ${eventsByTimestamp.length} events:`);
        eventsByTimestamp.forEach((event, i) => {
            console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (shift_id: ${event.shift_id || 'NULL'})`);
        });
        console.log('');
        
        // METHOD 2: Events by timestamp AND shift_id (like event archives)
        const eventsByShiftId = await new Promise((resolve, reject) => {
            db.all(`
                SELECT e.id, e.timestamp, e.event_type, e.new_state, e.shift_id, a.name as asset_name
                FROM events e
                JOIN assets a ON e.asset_id = a.id
                WHERE e.timestamp >= ? AND e.timestamp <= ? AND e.shift_id = ?
                ORDER BY e.timestamp
            `, [shift.start_time, shift.end_time, shift.id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('🔍 METHOD 2: EVENTS BY TIMESTAMP + SHIFT_ID (Archive Logic)');
        console.log(`   Found ${eventsByShiftId.length} events:`);
        eventsByShiftId.forEach((event, i) => {
            console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (shift_id: ${event.shift_id})`);
        });
        console.log('');
        
        // COMPARISON
        console.log('⚖️ COMPARISON:');
        console.log(`   Events by Timestamp Only: ${eventsByTimestamp.length}`);
        console.log(`   Events by Timestamp + Shift ID: ${eventsByShiftId.length}`);
        
        if (eventsByTimestamp.length !== eventsByShiftId.length) {
            console.log('   ❌ DISCREPANCY FOUND!');
            console.log('');
            
            const timestampEventIds = new Set(eventsByTimestamp.map(e => e.id));
            const shiftIdEventIds = new Set(eventsByShiftId.map(e => e.id));
            
            const missingFromArchive = eventsByTimestamp.filter(e => !shiftIdEventIds.has(e.id));
            
            if (missingFromArchive.length > 0) {
                console.log(`   📋 Events in SHIFT REPORT but NOT in ARCHIVE (${missingFromArchive.length}):`);
                missingFromArchive.forEach((event, i) => {
                    console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (shift_id: ${event.shift_id || 'NULL'})`);
                });
                console.log('');
                console.log('   🎯 ROOT CAUSE: These events have NULL shift_id!');
                console.log('      - Shift reports include ALL events in time range');
                console.log('      - Event archives only include events with matching shift_id');
                console.log('      - Events without shift_id appear in reports but not archives');
            }
        } else {
            console.log('   ✅ No discrepancy found');
        }
        
        console.log('');
        console.log('✅ Analysis complete');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        db.close();
    }
}

checkDiscrepancy();