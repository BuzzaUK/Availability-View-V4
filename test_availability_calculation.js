const { Event, Shift, Asset } = require('./src/backend/models/database');
const moment = require('moment');

async function testAvailabilityCalculation() {
  try {
    console.log('🧮 Testing Availability Calculation');
    console.log('=' .repeat(60));
    
    const targetShifts = [74, 75, 76];
    
    for (const shiftId of targetShifts) {
      console.log(`\n📊 Testing Shift ${shiftId}:`);
      
      // Get shift details
      const shift = await Shift.findByPk(shiftId);
      if (!shift) {
        console.log(`   ❌ Shift ${shiftId} not found`);
        continue;
      }
      
      console.log(`   Name: ${shift.shift_name}`);
      console.log(`   Start: ${shift.start_time}`);
      console.log(`   End: ${shift.end_time}`);
      
      const shiftStart = moment(shift.start_time);
      const shiftEnd = moment(shift.end_time);
      const totalShiftMinutes = shiftEnd.diff(shiftStart, 'minutes');
      
      console.log(`   Total Duration: ${totalShiftMinutes} minutes (${(totalShiftMinutes/60).toFixed(1)} hours)`);
      
      // Get events for this shift
      const events = await Event.findAll({
        where: { shift_id: shiftId },
        order: [['timestamp', 'ASC']]
      });
      
      console.log(`   Events: ${events.length}`);
      
      if (events.length === 0) {
        console.log(`   ⚠️ No events found - Availability: 0%`);
        continue;
      }
      
      // Analyze events
      let runningMinutes = 0;
      let downtimeMinutes = 0;
      let stopCount = 0;
      let currentState = 'RUNNING'; // Assume shift starts running
      let lastEventTime = shiftStart;
      
      console.log(`\n   📋 Event Analysis:`);
      
      events.forEach((event, index) => {
        const eventTime = moment(event.timestamp);
        const timeSinceLastEvent = eventTime.diff(lastEventTime, 'minutes');
        
        console.log(`     ${index + 1}. ${eventTime.format('HH:mm:ss')} - ${event.event_type} (${event.new_state || 'N/A'}) - Duration since last: ${timeSinceLastEvent}min`);
        
        // Add time in current state
        if (currentState === 'RUNNING') {
          runningMinutes += timeSinceLastEvent;
        } else {
          downtimeMinutes += timeSinceLastEvent;
        }
        
        // Update state based on event
        if (event.event_type === 'STATE_CHANGE') {
          if (event.new_state === 'STOPPED' || event.new_state === 'IDLE') {
            currentState = 'STOPPED';
            stopCount++;
          } else if (event.new_state === 'RUNNING') {
            currentState = 'RUNNING';
          }
        } else if (event.event_type === 'MICRO_STOP' || event.event_type === 'DOWNTIME') {
          currentState = 'STOPPED';
          stopCount++;
        }
        
        lastEventTime = eventTime;
      });
      
      // Add remaining time in current state until shift end
      const remainingMinutes = shiftEnd.diff(lastEventTime, 'minutes');
      if (remainingMinutes > 0) {
        if (currentState === 'RUNNING') {
          runningMinutes += remainingMinutes;
        } else {
          downtimeMinutes += remainingMinutes;
        }
        console.log(`     Final: ${remainingMinutes}min remaining in ${currentState} state`);
      }
      
      // Calculate availability
      const totalAccountedMinutes = runningMinutes + downtimeMinutes;
      const availability = totalAccountedMinutes > 0 ? (runningMinutes / totalAccountedMinutes) * 100 : 0;
      
      console.log(`\n   📈 Calculated Metrics:`);
      console.log(`     Running Time: ${runningMinutes} minutes (${(runningMinutes/60).toFixed(1)} hours)`);
      console.log(`     Downtime: ${downtimeMinutes} minutes (${(downtimeMinutes/60).toFixed(1)} hours)`);
      console.log(`     Total Accounted: ${totalAccountedMinutes} minutes`);
      console.log(`     Stop Count: ${stopCount}`);
      console.log(`     Availability: ${availability.toFixed(1)}%`);
      
      // Compare with shift duration
      if (totalAccountedMinutes !== totalShiftMinutes) {
        console.log(`     ⚠️ Discrepancy: Shift duration (${totalShiftMinutes}min) vs Accounted time (${totalAccountedMinutes}min)`);
      }
      
      // Get assets for this shift
      const assets = await Asset.findAll();
      console.log(`\n   🏭 Assets: ${assets.length} total`);
      
      // Check events by asset
      const eventsByAsset = {};
      events.forEach(event => {
        const assetId = event.asset_id || 'unknown';
        eventsByAsset[assetId] = (eventsByAsset[assetId] || 0) + 1;
      });
      
      console.log(`   📊 Events by Asset:`);
      Object.entries(eventsByAsset).forEach(([assetId, count]) => {
        const asset = assets.find(a => a.id == assetId);
        const assetName = asset ? asset.name : `Asset ${assetId}`;
        console.log(`     ${assetName}: ${count} events`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testAvailabilityCalculation();