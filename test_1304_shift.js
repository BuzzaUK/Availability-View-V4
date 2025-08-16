const moment = require('moment');
const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

(async () => {
  try {
    console.log('🔄 Setting up 13:04 GMT shift trigger...');
    console.log('Current time:', new Date().toLocaleString());
    
    // Add 13:04 as a shift time
    const settings = await databaseService.getNotificationSettings();
    console.log('Current shift times:', settings.shiftSettings.shiftTimes);
    
    // Add 1304 (13:04) if not already present
    if (!settings.shiftSettings.shiftTimes.includes('1304')) {
      settings.shiftSettings.shiftTimes.push('1304');
      await databaseService.updateNotificationSettings(settings);
      console.log('✅ Added 13:04 shift time');
    } else {
      console.log('⚠️ 13:04 shift time already exists');
    }
    
    // Update scheduler with new times
    await shiftScheduler.updateSchedules();
    console.log('✅ Shift schedules updated');
    
    // Show active jobs
    const jobs = shiftScheduler.getScheduledJobs();
    console.log('Active scheduled jobs:', jobs);
    
    console.log('⏰ 13:04 shift will trigger automatically when the time comes');
    console.log('📋 This will:');
    console.log('   1. End current shift (if any)');
    console.log('   2. Archive shift events');
    console.log('   3. Generate shift report CSV');
    console.log('   4. Send email to configured recipients');
    console.log('   5. Start new shift');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();