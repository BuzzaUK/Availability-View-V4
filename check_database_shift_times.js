const databaseService = require('./src/backend/services/databaseService');

async function checkDatabaseShiftTimes() {
  console.log('🔍 Checking all shift times in database...');
  
  try {
    const settings = await databaseService.getNotificationSettings();
    console.log('\nAll shift times in database:');
    console.log(JSON.stringify(settings.shiftSettings.shiftTimes, null, 2));
    console.log('\nTotal count:', settings.shiftSettings.shiftTimes.length);
    
    console.log('\nDetailed breakdown:');
    settings.shiftSettings.shiftTimes.forEach((time, index) => {
      console.log(`${index}: '${time}' (${typeof time})`);
    });
    
    // Check if there are any unexpected times
    const expectedTimes = ['0600', '1400', '2200'];
    const unexpectedTimes = settings.shiftSettings.shiftTimes.filter(time => !expectedTimes.includes(time));
    
    if (unexpectedTimes.length > 0) {
      console.log('\n❌ Found unexpected shift times:', unexpectedTimes);
      console.log('These might be causing the legacy times in the frontend.');
    } else {
      console.log('\n✅ Only expected shift times found.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabaseShiftTimes();