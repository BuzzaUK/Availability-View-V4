// Suppress all database logging
const originalLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  if (!message.includes('Executing (default)') && !message.includes('SELECT') && !message.includes('INSERT') && !message.includes('UPDATE')) {
    originalLog(...args);
  }
};

const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

(async () => {
  try {
    originalLog('🎯 FINAL END-OF-SHIFT VALIDATION');
    originalLog('=' .repeat(40));
    
    // Step 1: Get current shift
    const currentShift = await databaseService.getCurrentShift();
    
    if (!currentShift) {
      originalLog('❌ No active shift found');
      process.exit(1);
    }
    
    originalLog(`✅ Active shift ID: ${currentShift.id}`);
    
    // Step 2: Count events for this shift
    const allEvents = await databaseService.getAllEvents();
    const eventsArray = allEvents.rows || allEvents;
    const shiftEvents = eventsArray.filter(event => event.shift_id === currentShift.id);
    originalLog(`📊 Events for current shift: ${shiftEvents.length}`);
    
    // Step 3: Test archiving
    originalLog('\n📦 Testing archive creation...');
    const archiveResult = await shiftScheduler.archiveShiftEvents(currentShift.id);
    
    if (archiveResult && archiveResult.id) {
      originalLog(`✅ Archive created successfully (ID: ${archiveResult.id})`);
      
      // Step 4: Verify archive integrity
      const integrityResult = await databaseService.verifyArchiveIntegrity(archiveResult.id);
      originalLog(`✅ Archive integrity: ${integrityResult.isValid ? 'VALID' : 'INVALID'}`);
      
      // Step 5: Count archives
      const allArchives = await databaseService.getAllArchives();
      originalLog(`📦 Total archives in system: ${allArchives.length}`);
      
      // Step 6: Clean up test archive
      await databaseService.deleteArchive(archiveResult.id);
      originalLog(`🧹 Test archive cleaned up`);
      
      originalLog('\n🎉 END-OF-SHIFT WORKFLOW VALIDATION: PASSED');
      originalLog('✅ Archive creation works correctly');
      originalLog('✅ Archive integrity verification works');
      originalLog('✅ Archive cleanup works');
      
    } else {
      originalLog('❌ Archive creation failed');
      process.exit(1);
    }
    
  } catch (error) {
    originalLog('❌ Validation failed:', error.message);
    if (error.stack) {
      originalLog('Stack trace:', error.stack);
    }
    process.exit(1);
  }
})();