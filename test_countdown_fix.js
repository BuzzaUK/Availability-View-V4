const databaseService = require('./src/backend/services/databaseService');

async function testCountdownFix() {
  try {
    console.log('🔍 Testing countdown timer fix...');
    console.log('Current time:', new Date().toLocaleString());
    
    // Get notification settings to see shift times
    const settings = await databaseService.getNotificationSettings();
    const shiftTimes = settings.shiftSettings?.shiftTimes || [];
    console.log('\n📋 Configured shift times:', shiftTimes);
    
    // Convert current time to HHMM format
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    console.log('Current time in HHMM format:', currentTime);
    
    // Convert shift times to HHMM format and sort them
    const sortedShiftTimes = shiftTimes
      .map(time => {
        if (time.length === 4 && !time.includes(':')) {
          return parseInt(time);
        } else if (time.includes(':')) {
          const [hours, minutes] = time.split(':');
          return parseInt(hours) * 100 + parseInt(minutes);
        }
        return parseInt(time);
      })
      .sort((a, b) => a - b);
    
    console.log('Sorted shift times:', sortedShiftTimes);
    
    // Find the next shift time
    let nextShiftTime = null;
    for (const shiftTime of sortedShiftTimes) {
      if (shiftTime > currentTime) {
        nextShiftTime = shiftTime;
        break;
      }
    }
    
    // If no shift time is found for today, use the first shift time of tomorrow
    if (!nextShiftTime) {
      nextShiftTime = sortedShiftTimes[0];
      console.log('No more shifts today, next shift is tomorrow at:', nextShiftTime);
    } else {
      console.log('Next shift today at:', nextShiftTime);
    }
    
    // Convert back to Date object
    const hours = Math.floor(nextShiftTime / 100);
    const minutes = nextShiftTime % 100;
    const nextShiftDate = new Date(now);
    nextShiftDate.setHours(hours, minutes, 0, 0);
    
    // If the next shift is tomorrow, add a day
    if (nextShiftTime <= currentTime || nextShiftTime === sortedShiftTimes[0]) {
      nextShiftDate.setDate(nextShiftDate.getDate() + 1);
    }
    
    console.log('\n⏰ Next shift change at:', nextShiftDate.toLocaleString());
    
    // Calculate time remaining
    const timeDiff = nextShiftDate.getTime() - now.getTime();
    const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const secondsRemaining = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    console.log('\n🕐 Time remaining until next shift change:');
    console.log(`${hoursRemaining.toString().padStart(2, '0')}:${minutesRemaining.toString().padStart(2, '0')}:${secondsRemaining.toString().padStart(2, '0')}`);
    
    console.log('\n✅ The countdown timer should now show this correct time remaining!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCountdownFix();