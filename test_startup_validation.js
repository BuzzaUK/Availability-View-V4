const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

(async () => {
  try {
    console.log('🧪 TESTING STARTUP SHIFT VALIDATION');
    console.log('=' .repeat(50));
    
    // Wait for database initialization
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!databaseService.initialized && attempts < maxAttempts) {
      console.log(`⏳ Waiting for database initialization... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (!databaseService.initialized) {
      console.log('❌ Database initialization timeout - proceeding anyway');
    }
    
    // Test the startup validation method directly
    console.log('\n🔍 Testing validateShiftStateOnStartup method...');
    
    // Get current shift before validation
    const currentShiftBefore = await databaseService.getCurrentShift();
    console.log('\n📊 Current shift before validation:', currentShiftBefore ? {
      id: currentShiftBefore.id,
      name: currentShiftBefore.shift_name,
      start_time: currentShiftBefore.start_time,
      status: currentShiftBefore.status
    } : 'None');
    
    // Initialize shift scheduler (this will call validateShiftStateOnStartup)
    await shiftScheduler.initialize();
    
    // Get current shift after validation
    const currentShiftAfter = await databaseService.getCurrentShift();
    console.log('\n📊 Current shift after validation:', currentShiftAfter ? {
      id: currentShiftAfter.id,
      name: currentShiftAfter.shift_name,
      start_time: currentShiftAfter.start_time,
      status: currentShiftAfter.status
    } : 'None');
    
    // Check if validation triggered any changes
    if (!currentShiftBefore && currentShiftAfter) {
      console.log('\n✅ VALIDATION RESULT: New shift was created');
    } else if (currentShiftBefore && currentShiftAfter && currentShiftBefore.id !== currentShiftAfter.id) {
      console.log('\n✅ VALIDATION RESULT: Shift was changed');
    } else if (currentShiftBefore && currentShiftAfter && currentShiftBefore.id === currentShiftAfter.id) {
      console.log('\n✅ VALIDATION RESULT: No change needed - current shift is correct');
    } else {
      console.log('\n⚠️ VALIDATION RESULT: Unexpected state');
    }
    
    // Show current time and expected shift
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    console.log('\n🕐 Current time analysis:');
    console.log(`- Current time: ${Math.floor(currentTime / 100).toString().padStart(2, '0')}:${(currentTime % 100).toString().padStart(2, '0')}`);
    
    if (currentTime >= 600 && currentTime < 1400) {
      console.log('- Expected shift: Morning (06:00-14:00)');
    } else if (currentTime >= 1400 && currentTime < 2200) {
      console.log('- Expected shift: Afternoon (14:00-22:00)');
    } else {
      console.log('- Expected shift: Night (22:00-06:00)');
    }
    
    console.log('\n✅ Startup validation test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  process.exit(0);
})();