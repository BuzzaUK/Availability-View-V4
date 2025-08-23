// Completely suppress Sequelize logging before requiring any modules
process.env.NODE_ENV = 'development';

// Override console methods before any database connections
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

// Null function to suppress all output
const nullLog = () => {};

// Suppress all console output
console.log = nullLog;
console.error = nullLog;
console.warn = nullLog;
console.info = nullLog;

// Now require the database service
const databaseService = require('./src/backend/services/databaseService');

// Test function
async function testShiftIdAssignment() {
  try {
    originalLog('🧪 SHIFT ID ASSIGNMENT VERIFICATION');
    originalLog('====================================\n');
    
    // Get current shift
    const currentShift = await databaseService.getCurrentShift();
    if (!currentShift) {
      originalLog('❌ No active shift found');
      process.exit(1);
    }
    originalLog(`✅ Active shift: ${currentShift.shift_name} (ID: ${currentShift.id})`);
    
    // Get test data
    const assets = await databaseService.getAllAssets();
    const loggers = await databaseService.getAllLoggers();
    
    if (!assets || assets.length === 0 || !loggers || loggers.length === 0) {
      originalLog('❌ Missing required test data (assets/loggers)');
      process.exit(1);
    }
    
    // Create test event
    const testEventData = {
      asset_id: assets[0].id,
      logger_id: loggers[0].id,
      event_type: 'STATE_CHANGE',
      previous_state: 'RUNNING',
      new_state: 'STOPPED',
      stop_reason: 'Shift ID verification test',
      timestamp: new Date()
      // Intentionally NOT setting shift_id to test auto-assignment
    };
    
    originalLog('\n🔄 Creating event without explicit shift_id...');
    const createdEvent = await databaseService.createEvent(testEventData);
    
    if (!createdEvent) {
      originalLog('❌ Failed to create test event');
      process.exit(1);
    }
    
    // Verify shift_id was assigned
    originalLog(`✅ Event created with ID: ${createdEvent.id}`);
    
    if (createdEvent.shift_id === currentShift.id) {
      originalLog(`✅ PASS: Event correctly assigned shift_id ${createdEvent.shift_id}`);
    } else {
      originalLog(`❌ FAIL: Event has shift_id ${createdEvent.shift_id}, expected ${currentShift.id}`);
      await databaseService.deleteEventsByIds([createdEvent.id]);
      process.exit(1);
    }
    
    // Verify event appears in Event Archive queries
    const allEventsResult = await databaseService.getAllEvents();
    const allEvents = allEventsResult.rows || allEventsResult;
    const shiftEvents = allEvents.filter(event => event.shift_id === currentShift.id);
    const ourEvent = shiftEvents.find(event => event.id === createdEvent.id);
    
    if (ourEvent) {
      originalLog('✅ PASS: Event visible in Event Archive queries');
    } else {
      originalLog('❌ FAIL: Event not found in Event Archive queries');
      await databaseService.deleteEventsByIds([createdEvent.id]);
      process.exit(1);
    }
    
    // Clean up
    await databaseService.deleteEventsByIds([createdEvent.id]);
    originalLog('🧹 Test event cleaned up');
    
    originalLog('\n🎉 VERIFICATION COMPLETE!');
    originalLog('✅ Events are correctly assigned shift_id when detected');
    originalLog('✅ Events appear properly in Event Archive');
    originalLog('\n📋 SUMMARY:');
    originalLog('   - New events automatically receive current shift_id');
    originalLog('   - Events are properly filtered and displayed in Event Archive');
    originalLog('   - Shift ID assignment functionality is working correctly');
    
  } catch (error) {
    originalLog(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
testShiftIdAssignment();