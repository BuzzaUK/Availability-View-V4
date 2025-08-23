const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

// Suppress Sequelize logging
process.env.NODE_ENV = 'test';

(async () => {
  try {
    console.log('🔄 SIMPLE ARCHIVE TEST');
    console.log('=' .repeat(30));
    
    // Get current shift
    const currentShift = await databaseService.getCurrentShift();
    
    if (!currentShift) {
      console.log('❌ No active shift found');
      process.exit(1);
    }
    
    console.log(`✅ Testing with shift ID: ${currentShift.id}`);
    
    // Count events for this shift
    const allEvents = await databaseService.getAllEvents();
    const eventsArray = allEvents.rows || allEvents;
    const shiftEvents = eventsArray.filter(event => event.shift_id === currentShift.id);
    console.log(`📊 Events for shift ${currentShift.id}: ${shiftEvents.length}`);
    
    if (shiftEvents.length === 0) {
      console.log('⚠️ No events found for current shift - creating test event');
      
      // Create a test event
      await databaseService.createEvent({
        asset: 'Test Asset',
        event_type: 'TEST',
        description: 'Test event for archiving',
        shift_id: currentShift.id,
        timestamp: new Date()
      });
      
      console.log('✅ Test event created');
    }
    
    // Test archive creation
    console.log('\n📦 Creating archive...');
    const archiveResult = await shiftScheduler.archiveShiftEvents(currentShift.id);
    
    if (archiveResult && archiveResult.id) {
      console.log(`✅ Archive created: ID ${archiveResult.id}`);
      
      // Parse archived data
      if (archiveResult.archived_data) {
        try {
          let archivedData;
          if (typeof archiveResult.archived_data === 'string') {
            archivedData = JSON.parse(archiveResult.archived_data);
          } else {
            archivedData = archiveResult.archived_data;
          }
          console.log(`📊 Archived events: ${archivedData.events ? archivedData.events.length : 0}`);
        } catch (parseError) {
          console.log(`⚠️ Could not parse archived data: ${parseError.message}`);
          console.log(`📊 Archive data type: ${typeof archiveResult.archived_data}`);
        }
      }
      
      // Clean up
      await databaseService.deleteArchive(archiveResult.id);
      console.log('🧹 Test archive cleaned up');
      
      console.log('\n✅ ARCHIVE TEST PASSED');
    } else {
      console.log('❌ Archive creation failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();