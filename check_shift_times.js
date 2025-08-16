const databaseService = require('./src/backend/services/databaseService');

async function checkShiftTimes() {
  try {
    console.log('🔍 Checking current shift times in notification settings...');
    
    // Get current notification settings
    const settings = await databaseService.getNotificationSettings();
    console.log('\n📋 Current notification settings:');
    console.log('Shift settings enabled:', settings.shiftSettings?.enabled);
    console.log('Current shift times:', settings.shiftSettings?.shiftTimes);
    console.log('Auto send enabled:', settings.shiftSettings?.autoSend);
    
    // Check if there are any legacy shift times
    const currentShiftTimes = settings.shiftSettings?.shiftTimes || [];
    const legacyTimes = currentShiftTimes.filter(time => {
      // Legacy times are those that don't match standard shift patterns
      // Standard times should be like '0600', '1400', '2200', '0800', '1600', '0000'
      const standardTimes = ['0600', '1400', '2200', '0800', '1600', '0000'];
      return !standardTimes.includes(time);
    });
    
    if (legacyTimes.length > 0) {
      console.log('\n⚠️ Found legacy shift times:', legacyTimes);
      console.log('These were likely added by test scripts and should be cleaned up.');
      
      // Suggest cleanup
      const cleanShiftTimes = ['0600', '1400', '2200']; // Standard 3-shift pattern
      console.log('\n🧹 Recommended clean shift times:', cleanShiftTimes);
      
      // Ask if user wants to clean up (we'll just show the command)
      console.log('\n💡 To clean up, you can run:');
      console.log('node clean_shift_times.js');
    } else {
      console.log('\n✅ No legacy shift times found. Current times look good.');
    }
    
    // Also check what's in the UI dropdown
    console.log('\n🖥️ The Edit User section will show these shift times in the dropdown.');
    console.log('If you see unexpected times like 13:22, 13:30, 13:52, they come from these settings.');
    
  } catch (error) {
    console.error('❌ Error checking shift times:', error.message);
  }
}

checkShiftTimes();