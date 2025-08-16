const databaseService = require('./src/backend/services/databaseService');
const shiftScheduler = require('./src/backend/services/shiftScheduler');

async function debugShiftStatus() {
  try {
    console.log('🔍 DEBUGGING SHIFT STATUS ISSUES');
    console.log('='.repeat(50));
    
    // 1. Check current time and expected shift
    const now = new Date();
    console.log(`\n📅 Current Time: ${now.toISOString()}`);
    console.log(`📅 Local Time: ${now.toLocaleString()}`);
    console.log(`🕐 Current Hour: ${now.getHours()}`);
    
    // 2. Check all shifts in database
    console.log('\n📊 CHECKING ALL SHIFTS IN DATABASE:');
    const allShifts = await databaseService.getAllShifts();
    console.log(`Total shifts found: ${allShifts.length}`);
    
    allShifts.forEach((shift, index) => {
      console.log(`\nShift ${index + 1}:`);
      console.log(`  ID: ${shift.id}`);
      console.log(`  Name: ${shift.shift_name}`);
      console.log(`  Start Time: ${shift.start_time}`);
      console.log(`  End Time: ${shift.end_time}`);
      console.log(`  Status: ${shift.status}`);
      console.log(`  Created: ${shift.created_at}`);
      console.log(`  Updated: ${shift.updated_at}`);
    });
    
    // 3. Check current active shift
    console.log('\n🔄 CHECKING CURRENT ACTIVE SHIFT:');
    const currentShift = await databaseService.getCurrentShift();
    if (currentShift) {
      console.log('✅ Current shift found:');
      console.log(`  ID: ${currentShift.id}`);
      console.log(`  Name: ${currentShift.shift_name}`);
      console.log(`  Start Time: ${currentShift.start_time}`);
      console.log(`  End Time: ${currentShift.end_time}`);
      console.log(`  Status: ${currentShift.status}`);
    } else {
      console.log('❌ No current shift found');
    }
    
    // 4. Check shift scheduler status
    console.log('\n⚙️ CHECKING SHIFT SCHEDULER:');
    try {
      // Check if shift scheduler has methods to get current status
      if (typeof shiftScheduler.getCurrentShiftStatus === 'function') {
        const schedulerStatus = await shiftScheduler.getCurrentShiftStatus();
        console.log('Scheduler Status:', schedulerStatus);
      } else {
        console.log('⚠️ getCurrentShiftStatus method not available');
      }
      
      if (typeof shiftScheduler.checkCurrentShift === 'function') {
        const shiftCheck = await shiftScheduler.checkCurrentShift();
        console.log('Shift Check Result:', shiftCheck);
      } else {
        console.log('⚠️ checkCurrentShift method not available');
      }
    } catch (error) {
      console.log('❌ Error checking shift scheduler:', error.message);
    }
    
    // 5. Check events in the current timeframe
    console.log('\n📋 CHECKING RECENT EVENTS:');
    const recentEvents = await databaseService.getAllEvents();
    const events = recentEvents?.rows || recentEvents || [];
    console.log(`Total events found: ${events.length}`);
    
    if (events.length > 0) {
      console.log('\nRecent events (last 5):');
      events.slice(-5).forEach((event, index) => {
        console.log(`  Event ${index + 1}:`);
        console.log(`    ID: ${event.id}`);
        console.log(`    Asset: ${event.asset?.name || 'Unknown'}`);
        console.log(`    Type: ${event.event_type}`);
        console.log(`    State: ${event.new_state}`);
        console.log(`    Timestamp: ${event.timestamp}`);
        console.log(`    Shift ID: ${event.shift_id}`);
      });
    }
    
    // 6. Check shift patterns
    console.log('\n🔄 CHECKING SHIFT PATTERNS:');
    try {
      const shiftPatterns = await databaseService.getAllShiftPatterns();
      console.log(`Total shift patterns: ${shiftPatterns.length}`);
      
      shiftPatterns.forEach((pattern, index) => {
        console.log(`\nPattern ${index + 1}:`);
        console.log(`  ID: ${pattern.id}`);
        console.log(`  Name: ${pattern.name}`);
        console.log(`  Start Time: ${pattern.start_time}`);
        console.log(`  End Time: ${pattern.end_time}`);
        console.log(`  Active: ${pattern.is_active}`);
      });
    } catch (error) {
      console.log('❌ Error checking shift patterns:', error.message);
    }
    
    // 7. Check for any shift-related settings
    console.log('\n⚙️ CHECKING SHIFT SETTINGS:');
    try {
      const settings = await databaseService.getAllSettings();
      const shiftSettings = settings.filter(s => s.key.includes('shift') || s.key.includes('schedule'));
      
      if (shiftSettings.length > 0) {
        shiftSettings.forEach(setting => {
          console.log(`  ${setting.key}: ${setting.value}`);
        });
      } else {
        console.log('  No shift-related settings found');
      }
    } catch (error) {
      console.log('❌ Error checking settings:', error.message);
    }
    
    // 8. Manual shift time check
    console.log('\n🕐 MANUAL SHIFT TIME ANALYSIS:');
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    console.log(`Current time: ${currentTime}`);
    console.log('Expected shift times:');
    console.log('  - 06:00-14:00 (Morning)');
    console.log('  - 14:00-22:00 (Afternoon)');
    console.log('  - 22:00-06:00 (Night)');
    
    if (currentHour >= 14 && currentHour < 22) {
      console.log('✅ Should be in AFTERNOON shift (14:00-22:00)');
    } else if (currentHour >= 6 && currentHour < 14) {
      console.log('✅ Should be in MORNING shift (06:00-14:00)');
    } else {
      console.log('✅ Should be in NIGHT shift (22:00-06:00)');
    }
    
    console.log('\n='.repeat(50));
    console.log('🔍 SHIFT STATUS DEBUG COMPLETE');
    
  } catch (error) {
    console.error('❌ Error during shift status debug:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugShiftStatus().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});