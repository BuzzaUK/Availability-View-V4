const databaseService = require('./services/databaseService');
const shiftScheduler = require('./services/shiftScheduler');

async function fixShiftTimeFormat() {
  try {
    console.log('🔧 Fixing shift time format...');
    
    // Get current settings
    const settings = await databaseService.getNotificationSettings();
    console.log('\n📋 Current shift times:', settings.shiftSettings?.shiftTimes);
    
    // Convert 4-digit format to HH:MM format
    const currentTimes = settings.shiftSettings?.shiftTimes || [];
    const formattedTimes = currentTimes.map(time => {
      if (time.length === 4 && !time.includes(':')) {
        return `${time.substring(0, 2)}:${time.substring(2)}`;
      }
      return time;
    });
    
    console.log('\n🔄 Converting to proper format:', formattedTimes);
    
    // Update the settings with properly formatted times
    const updatedSettings = {
      ...settings,
      shiftSettings: {
        ...settings.shiftSettings,
        shiftTimes: formattedTimes
      }
    };
    
    await databaseService.updateNotificationSettings(updatedSettings);
    console.log('✅ Shift times updated in database');
    
    // Update the shift scheduler
    console.log('\n🔄 Updating shift scheduler...');
    await shiftScheduler.updateSchedules();
    console.log('✅ Shift scheduler updated');
    
    // Verify the changes
    const verifySettings = await databaseService.getNotificationSettings();
    console.log('\n✅ Verification - Updated shift times:', verifySettings.shiftSettings?.shiftTimes);
    
    console.log('\n🎉 Format fix complete!');
    console.log('\n📝 Summary:');
    console.log('- Converted 4-digit format (0600, 1400, 2200) to HH:MM format (06:00, 14:00, 22:00)');
    console.log('- Updated shift scheduler with new format');
    console.log('- The User Management dropdown should now show properly formatted times');
    
  } catch (error) {
    console.error('❌ Error fixing shift format:', error.message);
  }
  
  process.exit(0);
}

fixShiftTimeFormat();