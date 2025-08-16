const databaseService = require('./src/backend/services/databaseService');

async function checkCurrentShiftStatus() {
  try {
    console.log('🔍 CHECKING CURRENT SHIFT STATUS');
    console.log('='.repeat(40));
    
    // Check current shift
    console.log('\n1. Getting current shift from database...');
    const currentShift = await databaseService.getCurrentShift();
    
    if (currentShift) {
      console.log('✅ Current shift found:');
      console.log(`   ID: ${currentShift.id}`);
      console.log(`   Name: ${currentShift.shift_name}`);
      console.log(`   Start: ${currentShift.start_time}`);
      console.log(`   End: ${currentShift.end_time}`);
      console.log(`   Status: ${currentShift.status}`);
      console.log(`   Created: ${currentShift.created_at}`);
      console.log(`   Updated: ${currentShift.updated_at}`);
    } else {
      console.log('❌ No current shift found');
    }
    
    // Check shift 20 specifically (from the events)
    console.log('\n2. Checking Shift 20 specifically...');
    const shift20 = await databaseService.findShiftById(20);
    
    if (shift20) {
      console.log('✅ Shift 20 found:');
      console.log(`   ID: ${shift20.id}`);
      console.log(`   Name: ${shift20.shift_name}`);
      console.log(`   Start: ${shift20.start_time}`);
      console.log(`   End: ${shift20.end_time}`);
      console.log(`   Status: ${shift20.status}`);
      console.log(`   Created: ${shift20.created_at}`);
      console.log(`   Updated: ${shift20.updated_at}`);
    } else {
      console.log('❌ Shift 20 not found');
    }
    
    // Check all active shifts
    console.log('\n3. Checking all active shifts...');
    const allShifts = await databaseService.getAllShifts();
    const activeShifts = allShifts.filter(s => s.status === 'active' || s.status === 'in_progress' || s.end_time === null);
    
    console.log(`Found ${activeShifts.length} potentially active shifts:`);
    activeShifts.forEach(shift => {
      console.log(`   Shift ${shift.id}: ${shift.shift_name} - Status: ${shift.status} - End: ${shift.end_time}`);
    });
    
    // Check the most recent shift
    console.log('\n4. Checking most recent shift...');
    const recentShifts = allShifts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const mostRecent = recentShifts[0];
    
    if (mostRecent) {
      console.log('Most recent shift:');
      console.log(`   ID: ${mostRecent.id}`);
      console.log(`   Name: ${mostRecent.shift_name}`);
      console.log(`   Status: ${mostRecent.status}`);
      console.log(`   Start: ${mostRecent.start_time}`);
      console.log(`   End: ${mostRecent.end_time}`);
    }
    
    // Check events for shift 20
    console.log('\n5. Checking events for Shift 20...');
    const shift20Events = await databaseService.getAllEvents({ where: { shift_id: 20 } });
    const events = shift20Events?.rows || shift20Events || [];
    
    console.log(`Found ${events.length} events for Shift 20`);
    if (events.length > 0) {
      console.log('Recent events:');
      events.slice(0, 3).forEach(event => {
        console.log(`   ${event.timestamp}: ${event.asset?.name} - ${event.event_type} - ${event.new_state}`);
      });
    }
    
    // Check what getCurrentShift method actually does
    console.log('\n6. Analyzing getCurrentShift method...');
    console.log('getCurrentShift method exists:', typeof databaseService.getCurrentShift === 'function');
    
    console.log('\n='.repeat(40));
    console.log('✅ Current shift status check complete');
    
  } catch (error) {
    console.error('❌ Error checking current shift status:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the check
checkCurrentShiftStatus().then(() => {
  console.log('\n✅ Check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});