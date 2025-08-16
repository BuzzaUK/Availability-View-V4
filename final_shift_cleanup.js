const databaseService = require('./src/backend/services/databaseService');

async function finalShiftCleanup() {
  console.log('🧹 Final shift times cleanup...');
  
  try {
    // Get current settings
    const currentSettings = await databaseService.getNotificationSettings();
    console.log('Current shift times:', currentSettings.shiftSettings.shiftTimes);
    
    // Force update to only the standard 3 shifts
    const cleanSettings = {
      ...currentSettings,
      shiftSettings: {
        ...currentSettings.shiftSettings,
        shiftTimes: ['06:00', '14:00', '22:00']
      }
    };
    
    console.log('🔄 Updating to clean shift times: ["0600", "1400", "2200"]');
    await databaseService.updateNotificationSettings(cleanSettings);
    
    // Verify the update
    const updatedSettings = await databaseService.getNotificationSettings();
    console.log('✅ Updated shift times:', updatedSettings.shiftSettings.shiftTimes);
    
    if (JSON.stringify(updatedSettings.shiftSettings.shiftTimes) === JSON.stringify(['0600', '1400', '2200'])) {
      console.log('✅ Shift times successfully cleaned!');
      console.log('🖥️ Frontend should now show only: 06:00 Shift, 14:00 Shift, 22:00 Shift');
    } else {
      console.log('❌ Cleanup may not have worked properly');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

finalShiftCleanup();