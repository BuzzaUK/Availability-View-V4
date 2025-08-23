const path = require('path');
const { DatabaseService } = require('./src/backend/services/databaseService');
const { ReportService } = require('./src/backend/services/reportService');

async function checkDiscrepancy() {
    try {
        console.log('🔍 CHECKING EVENT DISCREPANCY');
        console.log('============================================================');
        
        const databaseService = new DatabaseService();
        await databaseService.initialize();
        
        // Get the most recent shift
        const shifts = await databaseService.getShifts({ archived: false });
        if (shifts.length === 0) {
            console.log('❌ No shifts found');
            return;
        }
        
        const shift = shifts[0];
        console.log(`📋 Analyzing shift: ${shift.shift_name} (ID: ${shift.id})`);
        console.log(`   Start: ${shift.start_time}`);
        console.log(`   End: ${shift.end_time}`);
        console.log('');
        
        // METHOD 1: How shift reports get events (getAllEvents + filter by timestamp)
        console.log('🔍 METHOD 1: SHIFT REPORT EVENT FILTERING');
        console.log('   (Uses getAllEvents + timestamp filtering)');
        
        const reportService = new ReportService();
        const shiftReport = await reportService.generateShiftReport(shift.id);
        const reportEvents = shiftReport.events || [];
        
        console.log(`   Found ${reportEvents.length} events in shift report:`);
        reportEvents.forEach((event, i) => {
            console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state}`);
        });
        console.log('');
        
        // METHOD 2: How event archives get events (getEventsForArchiving with shift_id filter)
        console.log('🔍 METHOD 2: EVENT ARCHIVE FILTERING');
        console.log('   (Uses getEventsForArchiving with shift_id filter)');
        
        const archiveEvents = await databaseService.getEventsForArchiving(
            shift.start_time,
            shift.end_time,
            shift.id
        );
        
        console.log(`   Found ${archiveEvents.length} events for archiving:`);
        archiveEvents.forEach((event, i) => {
            console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (shift_id: ${event.shift_id})`);
        });
        console.log('');
        
        // COMPARISON
        console.log('⚖️ COMPARISON:');
        console.log(`   Shift Report Events: ${reportEvents.length}`);
        console.log(`   Archive Events: ${archiveEvents.length}`);
        
        if (reportEvents.length !== archiveEvents.length) {
            console.log('   ❌ DISCREPANCY FOUND!');
            console.log('');
            
            // Find events in report but not in archive
            const reportEventIds = new Set(reportEvents.map(e => e.id));
            const archiveEventIds = new Set(archiveEvents.map(e => e.id));
            
            const missingFromArchive = reportEvents.filter(e => !archiveEventIds.has(e.id));
            const extraInArchive = archiveEvents.filter(e => !reportEventIds.has(e.id));
            
            if (missingFromArchive.length > 0) {
                console.log(`   📋 Events in SHIFT REPORT but NOT in ARCHIVE (${missingFromArchive.length}):`);
                missingFromArchive.forEach((event, i) => {
                    console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (shift_id: ${event.shift_id || 'NULL'})`);
                });
                console.log('');
            }
            
            if (extraInArchive.length > 0) {
                console.log(`   📋 Events in ARCHIVE but NOT in SHIFT REPORT (${extraInArchive.length}):`);
                extraInArchive.forEach((event, i) => {
                    console.log(`     ${i+1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.new_state} (shift_id: ${event.shift_id})`);
                });
                console.log('');
            }
        } else {
            console.log('   ✅ No discrepancy found - same number of events');
        }
        
        console.log('============================================================');
        console.log('🎯 ROOT CAUSE:');
        console.log('   Shift reports use getAllEvents() + timestamp filtering');
        console.log('   Event archives use getEventsForArchiving() + shift_id filtering');
        console.log('   Events without shift_id appear in reports but not archives!');
        console.log('');
        console.log('✅ Analysis complete');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkDiscrepancy();