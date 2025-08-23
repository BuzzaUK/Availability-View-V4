const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

(async () => {
  try {
    console.log('🔄 FOCUSED END-OF-SHIFT ARCHIVING TEST');
    console.log('=' .repeat(50));
    
    // Step 1: Get current shift
    console.log('\n📋 Step 1: Getting current shift...');
    const currentShift = await databaseService.getCurrentShift();
    
    if (!currentShift) {
      console.log('❌ No active shift found. Cannot test end-of-shift without an active shift.');
      process.exit(1);
    }
    
    console.log(`✅ Active shift: ${currentShift.name} (ID: ${currentShift.id})`);
    console.log(`📅 Started: ${currentShift.start_time}`);
    
    // Step 2: Count events for this shift
    console.log('\n📋 Step 2: Counting events for current shift...');
    const allEvents = await databaseService.getAllEvents();
    const eventsArray = allEvents.rows || allEvents;
    const shiftEvents = eventsArray.filter(event => event.shift_id === currentShift.id);
    console.log(`📊 Events with shift_id ${currentShift.id}: ${shiftEvents.length}`);
    
    // Step 3: Count archives before
    console.log('\n📋 Step 3: Counting archives before ending shift...');
    const archivesBefore = await databaseService.getAllArchives();
    console.log(`📦 Archives before: ${archivesBefore.length}`);
    
    // Step 4: Test archive creation without ending shift
    console.log('\n📋 Step 4: Testing archive creation for current shift...');
    try {
      const archiveResult = await shiftScheduler.archiveShiftEvents(currentShift.id);
      console.log(`✅ Archive created successfully`);
      console.log(`📦 Archive ID: ${archiveResult.id}`);
      console.log(`📦 Archive Title: ${archiveResult.title}`);
      
      if (archiveResult.archived_data) {
        const archivedData = JSON.parse(archiveResult.archived_data);
        console.log(`📊 Events archived: ${archivedData.events ? archivedData.events.length : 0}`);
        console.log(`📊 Assets archived: ${archivedData.assets ? archivedData.assets.length : 0}`);
      }
      
      // Step 5: Verify archive integrity
      console.log('\n📋 Step 5: Verifying archive integrity...');
      const integrityResult = await databaseService.verifyArchiveIntegrity(archiveResult.id);
      console.log(`✅ Archive integrity: ${integrityResult.isValid ? 'Valid' : 'Invalid'}`);
      
      if (!integrityResult.isValid) {
        console.log(`❌ Integrity issues: ${integrityResult.errors.join(', ')}`);
      }
      
      // Step 6: Count archives after
      console.log('\n📋 Step 6: Counting archives after creation...');
      const archivesAfter = await databaseService.getAllArchives();
      console.log(`📦 Archives after: ${archivesAfter.length}`);
      console.log(`📈 Archive count increase: ${archivesAfter.length - archivesBefore.length}`);
      
      // Step 7: Clean up test archive
      console.log('\n📋 Step 7: Cleaning up test archive...');
      await databaseService.deleteArchive(archiveResult.id);
      console.log(`🧹 Deleted test archive (ID: ${archiveResult.id})`);
      
      console.log('\n✅ FOCUSED END-OF-SHIFT TEST COMPLETED SUCCESSFULLY');
      
    } catch (error) {
      console.error('❌ Error during archive creation:', error.message);
      console.error('Stack:', error.stack);
    }
    
  } catch (error) {
    console.error('❌ Error in focused end-of-shift test:', error);
    process.exit(1);
  }
})();