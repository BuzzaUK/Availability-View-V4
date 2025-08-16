const moment = require('moment');
const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

(async () => {
  try {
    console.log('🔄 Setting up 13:12 shift trigger...');
    console.log('Current time:', new Date().toLocaleString());
    
    // Get current notification settings
    const settings = await databaseService.getNotificationSettings();
    console.log('📋 Current shift times:', settings.shiftSettings.shiftTimes);
    
    // Add 13:12 to shift times if not already present
    const newShiftTime = '1312';
    if (!settings.shiftSettings.shiftTimes.includes(newShiftTime)) {
      settings.shiftSettings.shiftTimes.push(newShiftTime);
      await databaseService.updateNotificationSettings(settings);
      console.log('✅ Added 13:12 shift time to settings');
    } else {
      console.log('ℹ️ 13:12 shift time already exists');
    }
    
    // Update shift scheduler with new times
    await shiftScheduler.updateSchedules();
    console.log('✅ Shift scheduler updated with new times');
    
    // Display current active shift
    const currentShift = await databaseService.getCurrentShift();
    if (currentShift) {
      console.log('📊 Current active shift:', currentShift.name);
      console.log('   Started at:', new Date(currentShift.start_time).toLocaleString());
    } else {
      console.log('ℹ️ No active shift currently');
    }
    
    console.log('\n⏰ 13:12 trigger configured successfully!');
    console.log('📈 When 13:12 arrives, the system will:');
    console.log('   1. End the current active shift');
    console.log('   2. Archive all events from the ended shift');
    console.log('   3. Generate a CSV shift report');
    console.log('   4. Send email notification to configured recipients');
    console.log('   5. Start a new shift');
    
    console.log('\n🎯 Waiting for automatic trigger at 13:12...');
    
  } catch (error) {
    console.error('❌ Error setting up 13:12 shift trigger:', error.message);
    console.error(error.stack);
  }
})();