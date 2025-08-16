const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

async function cleanShiftTimes() {
  try {
    console.log('🧹 Cleaning up legacy shift times...');
    
    // Get current notification settings
    const settings = await databaseService.getNotificationSettings();
    console.log('\n📋 Current shift times:', settings.shiftSettings?.shiftTimes);
    
    // Define standard shift times (3-shift pattern)
    const standardShiftTimes = ['06:00', '14:00', '22:00'];
    
    // Update the settings with clean shift times
    const updatedSettings = {
      ...settings,
      shiftSettings: {
        ...settings.shiftSettings,
        shiftTimes: standardShiftTimes
      }
    };
    
    console.log('\n🔄 Updating shift times to:', standardShiftTimes);
    await databaseService.updateNotificationSettings(updatedSettings);
    console.log('✅ Shift times updated in database');
    
    // Update the shift scheduler with the new times
    console.log('\n🔄 Updating shift scheduler...');
    await shiftScheduler.updateSchedules();
    console.log('✅ Shift scheduler updated');
    
    // Verify the changes
    const verifySettings = await databaseService.getNotificationSettings();
    console.log('\n✅ Verification - Updated shift times:', verifySettings.shiftSettings?.shiftTimes);
    
    console.log('\n🎉 Cleanup complete!');
    console.log('\n📝 Summary:');
    console.log('- Removed legacy shift times (like 1352)');
    console.log('- Set standard 3-shift pattern: 06:00, 14:00, 22:00');
    console.log('- Updated shift scheduler with new times');
    console.log('- The Edit User section will now show only the standard shift times');
    
  } catch (error) {
    console.error('❌ Error cleaning shift times:', error.message);
  }
}

cleanShiftTimes();