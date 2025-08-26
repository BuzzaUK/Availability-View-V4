const databaseService = require('./src/backend/services/databaseService');

async function debugEventShiftAssignment() {
  try {
    console.log('🔍 Debugging Event-Shift Assignment');
    console.log('=' .repeat(60));
    
    // Get all shifts
    const allShifts = await databaseService.getAllShifts();
    console.log(`\n📅 Available Shifts:`);
    allShifts.forEach(shift => {
      console.log(`   Shift ${shift.id}: ${shift.shift_name} (${shift.start_time} - ${shift.end_time})`);
    });
    
    // Get all events
    const allEvents = await databaseService.getAllEvents();
    const allEventsArray = allEvents.rows || allEvents;
    
    console.log(`\n📊 Total Events: ${allEventsArray.length}`);
    
    // Group events by shift_id
    const eventsByShift = {};
    const eventsWithoutShift = [];
    
    allEventsArray.forEach(event => {
      if (event.shift_id) {
        if (!eventsByShift[event.shift_id]) {
          eventsByShift[event.shift_id] = [];
        }
        eventsByShift[event.shift_id].push(event);
      } else {
        eventsWithoutShift.push(event);
      }
    });
    
    console.log(`\n📈 Events by Shift ID:`);
    Object.keys(eventsByShift).sort((a, b) => parseInt(a) - parseInt(b)).forEach(shiftId => {
      const events = eventsByShift[shiftId];
      console.log(`   Shift ${shiftId}: ${events.length} events`);
      
      // Show first few events
      if (events.length > 0) {
        console.log(`     Sample events:`);
        events.slice(0, 3).forEach((event, index) => {
          console.log(`       ${index + 1}. ${event.timestamp} - Asset ${event.asset_id} - ${event.event_type} - ${event.new_state || event.previous_state}`);
        });
      }
    });
    
    if (eventsWithoutShift.length > 0) {
      console.log(`\n⚠️  Events without shift_id: ${eventsWithoutShift.length}`);
      eventsWithoutShift.slice(0, 5).forEach((event, index) => {
        console.log(`     ${index + 1}. ${event.timestamp} - Asset ${event.asset_id} - ${event.event_type}`);
      });
    }
    
    // Check specific shifts 74, 75, 76
    console.log(`\n🎯 Target Shifts Analysis:`);
    [74, 75, 76].forEach(shiftId => {
      const events = eventsByShift[shiftId] || [];
      const shift = allShifts.find(s => s.id === shiftId);
      
      console.log(`\n   Shift ${shiftId}:`);
      if (shift) {
        console.log(`     Name: ${shift.shift_name}`);
        console.log(`     Period: ${shift.start_time} - ${shift.end_time}`);
        console.log(`     Events: ${events.length}`);
        
        if (events.length > 0) {
          // Check event timestamps vs shift period
          const shiftStart = new Date(shift.start_time);
          const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
          
          const eventsInPeriod = events.filter(event => {
            const eventTime = new Date(event.timestamp);
            return eventTime >= shiftStart && eventTime <= shiftEnd;
          });
          
          console.log(`     Events in shift period: ${eventsInPeriod.length}`);
          console.log(`     Events outside period: ${events.length - eventsInPeriod.length}`);
          
          if (eventsInPeriod.length > 0) {
            console.log(`     Sample in-period events:`);
            eventsInPeriod.slice(0, 3).forEach((event, index) => {
              console.log(`       ${index + 1}. ${event.timestamp} - Asset ${event.asset_id} - ${event.event_type} - ${event.new_state}`);
            });
          }
        }
      } else {
        console.log(`     ❌ Shift not found`);
      }
    });
    
    // Check if there are events that should belong to shifts 74-76 based on timestamp
    console.log(`\n🕐 Timestamp-based Analysis:`);
    const targetShifts = allShifts.filter(s => [74, 75, 76].includes(s.id));
    
    targetShifts.forEach(shift => {
      const shiftStart = new Date(shift.start_time);
      const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
      
      console.log(`\n   Shift ${shift.id} period: ${shiftStart.toISOString()} - ${shiftEnd.toISOString()}`);
      
      // Find events in this time period regardless of shift_id
      const eventsInPeriod = allEventsArray.filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= shiftStart && eventTime <= shiftEnd;
      });
      
      console.log(`     Events in time period: ${eventsInPeriod.length}`);
      
      if (eventsInPeriod.length > 0) {
        const byShiftId = {};
        eventsInPeriod.forEach(event => {
          const sid = event.shift_id || 'null';
          byShiftId[sid] = (byShiftId[sid] || 0) + 1;
        });
        
        console.log(`     Shift ID distribution:`);
        Object.entries(byShiftId).forEach(([sid, count]) => {
          console.log(`       shift_id ${sid}: ${count} events`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugEventShiftAssignment();