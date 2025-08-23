const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

/**
 * Debug script to identify the discrepancy between shift reports and event archives
 * This investigates why events appear in emailed shift reports but not in event archives
 */
async function debugEventFilteringDiscrepancy() {
  try {
    console.log('🔍 DEBUGGING EVENT FILTERING DISCREPANCY');
    console.log('=' .repeat(60));
    
    // Get the most recent completed shift
    const allShifts = await databaseService.getAllShifts();
    const completedShifts = allShifts.filter(shift => shift.status === 'completed');
    
    if (completedShifts.length === 0) {
      console.log('❌ No completed shifts found');
      return;
    }
    
    const recentShift = completedShifts[0];
    console.log(`\n📋 Analyzing shift: ${recentShift.shift_name} (ID: ${recentShift.id})`);
    console.log(`   Start: ${recentShift.start_time}`);
    console.log(`   End: ${recentShift.end_time}`);
    
    // Method 1: How SHIFT REPORTS filter events (reportService.generateShiftReport)
    console.log('\n🔍 METHOD 1: SHIFT REPORT EVENT FILTERING');
    console.log('   (Uses getAllEvents + timestamp filtering)');
    
    const allEvents = await databaseService.getAllEvents();
    const allEventsArray = allEvents.rows || allEvents;
    
    const shiftStart = new Date(recentShift.start_time);
    const shiftEnd = recentShift.end_time ? new Date(recentShift.end_time) : new Date();
    
    const reportEvents = allEventsArray.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= shiftStart && eventDate <= shiftEnd;
    });
    
    console.log(`   Total events in database: ${allEventsArray.length}`);
    console.log(`   Events in shift time range: ${reportEvents.length}`);
    
    if (reportEvents.length > 0) {
      console.log('   Event types found:');
      const eventTypes = {};
      reportEvents.forEach(event => {
        eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
      });
      Object.entries(eventTypes).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
      
      console.log('\n   Sample events:');
      reportEvents.slice(0, 5).forEach((event, index) => {
        console.log(`     ${index + 1}. ${event.event_type} - ${event.timestamp} (shift_id: ${event.shift_id || 'NULL'})`);
      });
    }
    
    // Method 2: How EVENT ARCHIVES filter events (getEventsForArchiving)
    console.log('\n🔍 METHOD 2: EVENT ARCHIVE FILTERING');
    console.log('   (Uses getEventsForArchiving with timestamp + shift_id filtering)');
    
    const archiveQuery = {
      startDate: recentShift.start_time,
      endDate: recentShift.end_time || new Date(),
      shift_id: recentShift.id
    };
    
    console.log('   Archive query parameters:', archiveQuery);
    
    const archiveResult = await databaseService.getEventsForArchiving(archiveQuery);
    const archiveEvents = archiveResult.events || [];
    
    console.log(`   Events found for archiving: ${archiveEvents.length}`);
    
    if (archiveEvents.length > 0) {
      console.log('   Event types found:');
      const archiveEventTypes = {};
      archiveEvents.forEach(event => {
        archiveEventTypes[event.event_type] = (archiveEventTypes[event.event_type] || 0) + 1;
      });
      Object.entries(archiveEventTypes).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
      
      console.log('\n   Sample events:');
      archiveEvents.slice(0, 5).forEach((event, index) => {
        console.log(`     ${index + 1}. ${event.event_type} - ${event.timestamp} (shift_id: ${event.shift_id})`);
      });
    }
    
    // Method 3: Check events without shift_id filtering
    console.log('\n🔍 METHOD 3: TIMESTAMP-ONLY FILTERING (No shift_id requirement)');
    
    const timestampOnlyQuery = {
      startDate: recentShift.start_time,
      endDate: recentShift.end_time || new Date()
      // No shift_id filter
    };
    
    const timestampResult = await databaseService.getEventsForArchiving(timestampOnlyQuery);
    const timestampEvents = timestampResult.events || [];
    
    console.log(`   Events found with timestamp-only filter: ${timestampEvents.length}`);
    
    // Analysis: Compare the differences
    console.log('\n📊 DISCREPANCY ANALYSIS:');
    console.log(`   Shift Report Events: ${reportEvents.length}`);
    console.log(`   Archive Events (with shift_id): ${archiveEvents.length}`);
    console.log(`   Archive Events (timestamp-only): ${timestampEvents.length}`);
    
    const discrepancy = reportEvents.length - archiveEvents.length;
    if (discrepancy > 0) {
      console.log(`\n❗ DISCREPANCY FOUND: ${discrepancy} events missing from archives`);
      
      // Find events that are in shift reports but not in archives
      const reportEventIds = new Set(reportEvents.map(e => e.id));
      const archiveEventIds = new Set(archiveEvents.map(e => e.id));
      
      const missingEvents = reportEvents.filter(event => !archiveEventIds.has(event.id));
      
      console.log('\n🔍 MISSING EVENTS ANALYSIS:');
      console.log(`   Events in shift reports but NOT in archives: ${missingEvents.length}`);
      
      if (missingEvents.length > 0) {
        console.log('\n   Missing events details:');
        missingEvents.forEach((event, index) => {
          console.log(`     ${index + 1}. ${event.event_type} - ${event.timestamp}`);
          console.log(`        Asset: ${event.asset?.name || 'Unknown'}`);
          console.log(`        Shift ID: ${event.shift_id || 'NULL'} (Expected: ${recentShift.id})`);
          console.log(`        Previous State: ${event.previous_state}`);
          console.log(`        New State: ${event.new_state}`);
        });
        
        // Check if missing events have incorrect shift_id
        const eventsWithWrongShiftId = missingEvents.filter(event => 
          event.shift_id !== null && event.shift_id !== recentShift.id
        );
        const eventsWithNullShiftId = missingEvents.filter(event => 
          event.shift_id === null
        );
        
        console.log(`\n   Events with wrong shift_id: ${eventsWithWrongShiftId.length}`);
        console.log(`   Events with NULL shift_id: ${eventsWithNullShiftId.length}`);
        
        if (eventsWithNullShiftId.length > 0) {
          console.log('\n❗ ROOT CAUSE IDENTIFIED:');
          console.log('   Events are missing shift_id assignment!');
          console.log('   This causes them to be included in shift reports (timestamp filter)');
          console.log('   but excluded from event archives (requires shift_id match)');
        }
      }
    } else {
      console.log('\n✅ No discrepancy found - both methods return same event count');
    }
    
    // Check existing event archives for this shift
    console.log('\n📦 EXISTING EVENT ARCHIVES FOR THIS SHIFT:');
    const allArchives = await databaseService.getAllArchives();
    const eventArchives = allArchives.filter(archive => 
      archive.archive_type === 'EVENTS' && 
      archive.archived_data?.shift_info?.id === recentShift.id
    );
    
    console.log(`   Found ${eventArchives.length} event archives for this shift`);
    eventArchives.forEach((archive, index) => {
      const eventCount = archive.archived_data?.event_count || 0;
      console.log(`     ${index + 1}. ${archive.title} - ${eventCount} events`);
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 SUMMARY:');
    console.log('   This analysis reveals why events appear in shift reports');
    console.log('   but may be missing from event archives.');
    console.log('   The key difference is shift_id filtering in archives.');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Execute the analysis
debugEventFilteringDiscrepancy().then(() => {
  console.log('\n✅ Analysis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error.message);
  process.exit(1);
});