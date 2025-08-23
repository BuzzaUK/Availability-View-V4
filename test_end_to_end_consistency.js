const { sequelize } = require('./src/backend/config/database');
const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');
const reportService = require('./src/backend/services/reportService');

async function testEndToEndConsistency() {
  console.log('🧪 TESTING END-TO-END SHIFT CONSISTENCY');
  console.log('=' .repeat(60));
  
  try {
    await databaseService.initializeDatabase();
    
    // Step 1: Ensure we have an active shift
    let currentShift = await databaseService.getCurrentShift();
    if (!currentShift) {
      console.log('📝 Creating new test shift...');
      currentShift = await databaseService.createShift({
        shift_name: 'End-to-End Test Shift - ' + new Date().toLocaleDateString(),
        shift_number: 1,
        start_time: new Date(),
        status: 'active'
      });
      console.log(`✅ Created shift: ${currentShift.shift_name} (ID: ${currentShift.id})`);
    } else {
      console.log(`📊 Using existing shift: ${currentShift.shift_name} (ID: ${currentShift.id})`);
    }
    
    // Step 2: Create test events during the shift
    console.log('\n🎯 Creating test events during shift...');
    const testEvents = [];
    
    const eventTypes = [
      { type: 'STATE_CHANGE', prev: 'STOPPED', new: 'RUNNING', reason: 'Production started' },
      { type: 'STATE_CHANGE', prev: 'RUNNING', new: 'STOPPED', reason: 'Material shortage' },
      { type: 'STATE_CHANGE', prev: 'STOPPED', new: 'RUNNING', reason: 'Material replenished' },
      { type: 'QUALITY_CHECK', prev: 'RUNNING', new: 'RUNNING', reason: 'Quality inspection passed' },
      { type: 'STATE_CHANGE', prev: 'RUNNING', new: 'STOPPED', reason: 'End of production run' }
    ];
    
    for (let i = 0; i < eventTypes.length; i++) {
      const eventType = eventTypes[i];
      const eventTime = new Date(Date.now() + (i * 2 * 60 * 1000)); // 2 minutes apart
      
      const event = await databaseService.createEvent({
        asset_id: 1, // Assuming asset ID 1 exists
        event_type: eventType.type,
        previous_state: eventType.prev,
        new_state: eventType.new,
        timestamp: eventTime,
        duration: Math.floor(Math.random() * 300 + 60) * 1000, // 1-5 minutes
        stop_reason: eventType.reason,
        logger_id: 1
      });
      
      testEvents.push(event);
      console.log(`  ✅ Created event ${i+1}: ${eventType.type} (ID: ${event.id}, shift_id: ${event.shift_id})`);
    }
    
    // Step 3: Verify all events have shift_id assigned
    console.log('\n🔍 Verifying shift_id assignment...');
    const eventsWithoutShiftId = testEvents.filter(e => !e.shift_id);
    if (eventsWithoutShiftId.length === 0) {
      console.log('✅ All test events have shift_id assigned correctly');
    } else {
      console.log(`❌ ${eventsWithoutShiftId.length} events missing shift_id`);
    }
    
    // Step 4: Generate shift report (before ending shift)
    console.log('\n📋 Generating shift report...');
    const shiftReport = await reportService.generateShiftReport(currentShift.id);
    // The report returns events in the main object
    const reportEventCount = shiftReport.events ? shiftReport.events.length : 0;
    console.log(`📊 Shift report contains ${reportEventCount} events`);
    console.log(`📊 Report metrics: ${JSON.stringify(shiftReport.metrics, null, 2)}`);
    
    // Step 5: Count events using archive-style filtering
    const [archiveStyleCount] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM events 
      WHERE shift_id = ?
    `, {
      replacements: [currentShift.id]
    });
    
    console.log(`📦 Archive-style filtering finds ${archiveStyleCount[0].count} events`);
    
    // Step 6: Compare counts
    console.log('\n⚖️ CONSISTENCY CHECK:');
    if (reportEventCount === archiveStyleCount[0].count) {
      console.log('✅ CONSISTENT: Shift report and archive filtering return same count!');
    } else {
      console.log(`❌ INCONSISTENT: Report has ${reportEventCount}, Archive filtering has ${archiveStyleCount[0].count}`);
    }
    
    // Step 7: End the shift and create archive
    console.log('\n🏁 Ending shift and creating archive...');
    await databaseService.updateShift(currentShift.id, {
      end_time: new Date(),
      status: 'completed'
    });
    
    // Trigger archiving
    const archive = await shiftScheduler.archiveShiftEvents(currentShift.id);
    if (!archive) {
      console.log('❌ Archive creation failed or returned null');
      return;
    }
    
    console.log(`📦 Archive created with ID: ${archive.id}`);
    
    // Step 8: Verify archive contents
    const archiveData = archive.archived_data;
    const archivedEventCount = archiveData && archiveData.events ? archiveData.events.length : 0;
    
    console.log('\n🔍 FINAL VERIFICATION:');
    console.log(`📋 Shift Report Events: ${reportEventCount}`);
    console.log(`📦 Archived Events: ${archivedEventCount}`);
    console.log(`🔢 Database Query Count: ${archiveStyleCount[0].count}`);
    
    if (reportEventCount === archivedEventCount && archivedEventCount === archiveStyleCount[0].count) {
      console.log('\n🎉 SUCCESS: Perfect consistency across all methods!');
      console.log('✅ Shift reports and event archives now show identical data');
    } else {
      console.log('\n⚠️ INCONSISTENCY DETECTED:');
      console.log('   This indicates there may still be issues with the filtering logic');
    }
    
    // Step 9: Cleanup test events
    console.log('\n🧹 Cleaning up test events...');
    const testEventIds = testEvents.map(e => e.id);
    if (testEventIds.length > 0) {
      await databaseService.deleteEventsByIds(testEventIds);
      console.log(`✅ Cleaned up ${testEventIds.length} test events`);
    }
    
    // Also clean up the archive
    if (archive && archive.id) {
      await databaseService.deleteArchive(archive.id);
      console.log('✅ Cleaned up test archive');
    }
    
  } catch (error) {
    console.error('❌ Error in end-to-end test:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testEndToEndConsistency().catch(console.error);