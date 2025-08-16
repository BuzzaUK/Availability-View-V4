const shiftScheduler = require('./src/backend/services/shiftScheduler');
const databaseService = require('./src/backend/services/databaseService');

(async () => {
  try {
    console.log('🧪 Testing shift duration monitoring functionality...');
    
    // Get current shift info
    const currentShift = await shiftScheduler.getCurrentShift();
    console.log('\n📋 Current shift:', {
      id: currentShift?.id,
      name: currentShift?.shift_name,
      start_time: currentShift?.start_time,
      status: currentShift?.status
    });
    
    // Get shift duration settings
    const settings = await databaseService.getSettings();
    const shiftDuration = settings?.shiftDuration;
    console.log('\n⚙️ Shift duration setting:', shiftDuration, 'minutes');
    
    if (currentShift && currentShift.status === 'active') {
      // Calculate elapsed time
      const now = new Date();
      const shiftStartTime = new Date(currentShift.start_time);
      const elapsedMinutes = Math.floor((now - shiftStartTime) / (1000 * 60));
      const remainingMinutes = shiftDuration - elapsedMinutes;
      
      console.log('\n📊 Shift Duration Analysis:');
      console.log('- Start time:', shiftStartTime.toLocaleString());
      console.log('- Current time:', now.toLocaleString());
      console.log('- Elapsed time:', elapsedMinutes, 'minutes');
      console.log('- Configured duration:', shiftDuration, 'minutes');
      console.log('- Remaining time:', remainingMinutes, 'minutes');
      console.log('- Duration exceeded:', elapsedMinutes >= shiftDuration ? 'YES ⚠️' : 'NO ✅');
      
      if (elapsedMinutes >= shiftDuration) {
        console.log('\n⏰ SHIFT DURATION EXCEEDED - The monitoring system should trigger archiving!');
      } else {
        console.log('\n✅ Shift is within duration limits');
      }
    } else {
      console.log('\n⚠️ No active shift found for monitoring');
    }
    
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
})();