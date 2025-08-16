const databaseService = require('./services/databaseService');

async function checkShiftTimes() {
  try {
    console.log('🔍 Checking current shift times in database...');
    
    const settings = await databaseService.getNotificationSettings();
    console.log('\n📋 Current shift times:', settings.shiftSettings?.shiftTimes);
    console.log('Total count:', settings.shiftSettings?.shiftTimes?.length || 0);
    
    if (settings.shiftSettings?.shiftTimes) {
      console.log('\nDetailed breakdown:');
      settings.shiftSettings.shiftTimes.forEach((time, index) => {
        console.log(`${index}: '${time}' (${typeof time})`);
      });
    }
    
    // Check for unexpected times
    const expectedTimes = ['06:00', '14:00', '22:00'];
    const currentTimes = settings.shiftSettings?.shiftTimes || [];
    const unexpectedTimes = currentTimes.filter(time => !expectedTimes.includes(time));
    
    if (unexpectedTimes.length > 0) {
      console.log('\n❌ Found unexpected shift times:', unexpectedTimes);
      console.log('These are likely causing the legacy times in the frontend.');
    } else {
      console.log('\n✅ Only expected shift times found.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkShiftTimes();