const moment = require('moment-timezone');
const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

(async () => {
  try {
    console.log('🔍 SHIFT SCHEDULER DEBUG SESSION');
    console.log('=' .repeat(50));
    
    // 1. Check current time and timezone
    const now = new Date();
    console.log('\n⏰ TIME INFORMATION:');
    console.log('System time:', now.toLocaleString());
    console.log('UTC time:', now.toISOString());
    console.log('London time:', moment().tz('Europe/London').format('YYYY-MM-DD HH:mm:ss'));
    console.log('Current hour:', now.getHours());
    console.log('Current minute:', now.getMinutes());
    
    // 2. Check notification settings
    console.log('\n📋 NOTIFICATION SETTINGS:');
    const settings = await databaseService.getNotificationSettings();
    console.log('Auto-send enabled:', settings.autoSend);
    console.log('Recipients:', settings.recipients);
    console.log('Current shift times:', settings.shiftSettings.shiftTimes);
    console.log('Timezone in settings:', settings.timezone || 'Not set');
    
    // 3. Check current active shift
    console.log('\n📊 CURRENT SHIFT STATUS:');
    const currentShift = await databaseService.getCurrentShift();
    if (currentShift) {
      console.log('Active shift:', currentShift.name);
      console.log('Started at:', new Date(currentShift.start_time).toLocaleString());
      console.log('Shift ID:', currentShift.id);
    } else {
      console.log('No active shift found');
    }
    
    // 4. Check shift scheduler status
    console.log('\n🔧 SHIFT SCHEDULER STATUS:');
    try {
      // Get the internal state of the scheduler
      const schedulerState = shiftScheduler.getSchedulerState ? shiftScheduler.getSchedulerState() : 'State not available';
      console.log('Scheduler state:', schedulerState);
    } catch (e) {
      console.log('Could not get scheduler state:', e.message);
    }
    
    // 5. Add 13:30 shift time for testing
    console.log('\n🎯 SETTING UP 13:30 TEST TRIGGER:');
    const testShiftTime = '1330';
    if (!settings.shiftSettings.shiftTimes.includes(testShiftTime)) {
      settings.shiftSettings.shiftTimes.push(testShiftTime);
      await databaseService.updateNotificationSettings(settings);
      console.log('✅ Added 13:30 shift time');
    } else {
      console.log('ℹ️ 13:30 shift time already exists');
    }
    
    // 6. Reinitialize scheduler with debug logging
    console.log('\n🔄 REINITIALIZING SHIFT SCHEDULER:');
    await shiftScheduler.initialize();
    console.log('✅ Shift scheduler reinitialized');
    
    // 7. Update schedules
    console.log('\n📅 UPDATING SCHEDULES:');
    await shiftScheduler.updateSchedules();
    console.log('✅ Schedules updated');
    
    // 8. Manual test of handleAutomaticShiftChange
    console.log('\n🧪 TESTING MANUAL SHIFT CHANGE:');
    console.log('This will manually trigger the shift change process...');
    
    // Wait a moment then trigger manually
    setTimeout(async () => {
      try {
        console.log('\n🚀 MANUALLY TRIGGERING SHIFT CHANGE:');
        await shiftScheduler.handleAutomaticShiftChange();
        console.log('✅ Manual shift change completed');
        
        // Check if new shift was created
        const newShift = await databaseService.getCurrentShift();
        if (newShift) {
          console.log('New active shift:', newShift.name);
          console.log('Started at:', new Date(newShift.start_time).toLocaleString());
        }
        
        // Check for new reports
        console.log('\n📄 CHECKING FOR NEW REPORTS:');
        const fs = require('fs');
        const path = require('path');
        const reportsDir = path.join(__dirname, 'src', 'backend', 'reports');
        if (fs.existsSync(reportsDir)) {
          const files = fs.readdirSync(reportsDir);
          const csvFiles = files.filter(f => f.endsWith('.csv'));
          console.log('CSV reports found:', csvFiles.length);
          csvFiles.forEach(file => console.log('  -', file));
        }
        
      } catch (error) {
        console.error('❌ Manual shift change failed:', error.message);
        console.error(error.stack);
      }
    }, 2000);
    
    console.log('\n⏳ MONITORING SETUP COMPLETE');
    console.log('Waiting for 13:30 automatic trigger...');
    console.log('Manual test will run in 2 seconds...');
    
  } catch (error) {
    console.error('❌ Debug session failed:', error.message);
    console.error(error.stack);
  }
})();

// Keep the process alive to monitor
setInterval(() => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  if (now.getMinutes() % 5 === 0 && now.getSeconds() === 0) {
    console.log(`\n⏰ ${timeStr} - Still monitoring for shift triggers...`);
  }
}, 1000);