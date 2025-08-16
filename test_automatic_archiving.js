const shiftScheduler = require('./src/backend/services/shiftScheduler');
const databaseService = require('./src/backend/services/databaseService');

(async () => {
  try {
    console.log('🧪 Testing automatic shift end and archiving functionality...');
    
    // First, let's check the current state
    console.log('\n📋 Current System State:');
    const currentShift = await shiftScheduler.getCurrentShift();
    console.log('- Active shift:', currentShift ? {
      id: currentShift.id,
      name: currentShift.shift_name,
      start_time: currentShift.start_time,
      status: currentShift.status
    } : 'None');
    
    const settings = await databaseService.getSettings();
    const shiftDuration = settings?.shiftDuration || 480; // Default 8 hours
    console.log('- Shift duration setting:', shiftDuration, 'minutes');
    
    if (currentShift && currentShift.status === 'active') {
      const now = new Date();
      const shiftStartTime = new Date(currentShift.start_time);
      const elapsedMinutes = Math.floor((now - shiftStartTime) / (1000 * 60));
      
      console.log('\n⏱️ Timing Analysis:');
      console.log('- Shift started:', shiftStartTime.toLocaleString());
      console.log('- Current time:', now.toLocaleString());
      console.log('- Elapsed time:', elapsedMinutes, 'minutes');
      console.log('- Configured duration:', shiftDuration, 'minutes');
      console.log('- Time remaining:', Math.max(0, shiftDuration - elapsedMinutes), 'minutes');
      console.log('- Duration exceeded:', elapsedMinutes >= shiftDuration ? '✅ YES' : '❌ NO');
      
      // Test the monitoring function directly
      console.log('\n🔍 Testing checkShiftDurationAndTriggerArchiving...');
      await shiftScheduler.checkShiftDurationAndTriggerArchiving();
      
      // Check if shift status changed
      const updatedShift = await shiftScheduler.getCurrentShift();
      console.log('\n📊 Post-Check Results:');
      console.log('- Shift status before:', currentShift.status);
      console.log('- Shift status after:', updatedShift.status);
      
      if (updatedShift.status === 'completed' && currentShift.status === 'active') {
        console.log('\n🎉 SUCCESS: Automatic archiving was triggered!');
        console.log('- Shift ended at:', updatedShift.end_time);
        console.log('- Archive path:', updatedShift.archive_path || 'Not set');
      } else if (elapsedMinutes >= shiftDuration) {
        console.log('\n⚠️ WARNING: Shift duration exceeded but archiving was not triggered');
      } else {
        console.log('\n✅ OK: Shift is within duration limits, no archiving needed');
      }
    } else {
      console.log('\n⚠️ No active shift found to test');
    }
    
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
})();