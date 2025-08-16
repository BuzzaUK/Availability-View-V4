const databaseService = require('./src/backend/services/databaseService');
const { Shift } = require('./src/backend/models/database');

async function debugCountdown() {
  try {
    console.log('🔍 Debugging countdown timer issue...');
    console.log('Current time:', new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }));
    
    // Get current notification settings
    const settings = await databaseService.getNotificationSettings();
    console.log('\n📋 Notification settings:');
    console.log('Shift times:', settings.shiftSettings?.shiftTimes);
    console.log('Enabled:', settings.shiftSettings?.enabled);
    
    // Get current shift from database
    const currentShift = await Shift.findOne({
      where: {
        is_current: true
      }
    });
    
    console.log('\n📊 Current shift from database:');
    if (currentShift) {
      console.log('Start time:', currentShift.start_time);
      console.log('End time:', currentShift.end_time);
      console.log('Is current:', currentShift.is_current);
      
      // Calculate expected countdown
      const now = new Date();
      const endTime = new Date(currentShift.end_time);
      const timeDiff = endTime - now;
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      console.log('\n⏰ Expected countdown calculation:');
      console.log('Now:', now.toLocaleString('en-GB', { timeZone: 'Europe/London' }));
      console.log('Shift end:', endTime.toLocaleString('en-GB', { timeZone: 'Europe/London' }));
      console.log('Time difference (ms):', timeDiff);
      console.log('Expected countdown:', `${hours}H ${minutes}M`);
    } else {
      console.log('No current shift found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugCountdown();