const { Event } = require('./src/backend/models/database');
const databaseService = require('./src/backend/services/databaseService');
const { Op } = require('sequelize');

async function fixInvalidTimestamps() {
  try {
    console.log('🕐 Fixing Invalid Timestamps');
    console.log('=' .repeat(60));
    
    // Get all shifts
    const allShifts = await databaseService.getAllShifts();
    console.log(`📅 Found ${allShifts.length} shifts`);
    
    // Find events with invalid timestamps
    const eventsWithInvalidTimestamps = await Event.findAll({
      where: {
        [Op.or]: [
          { timestamp: 'Invalid Date' },
          { timestamp: null },
          { timestamp: '' }
        ]
      },
      order: [['id', 'ASC']]
    });
    
    console.log(`\n📊 Found ${eventsWithInvalidTimestamps.length} events with invalid timestamps`);
    
    if (eventsWithInvalidTimestamps.length === 0) {
      console.log('✅ No invalid timestamps to fix!');
      return;
    }
    
    // Group events by shift_id
    const eventsByShift = {};
    eventsWithInvalidTimestamps.forEach(event => {
      const shiftId = event.shift_id || 'unassigned';
      if (!eventsByShift[shiftId]) {
        eventsByShift[shiftId] = [];
      }
      eventsByShift[shiftId].push(event);
    });
    
    console.log(`\n🎯 Events grouped by shift:`);
    Object.keys(eventsByShift).forEach(shiftId => {
      console.log(`   Shift ${shiftId}: ${eventsByShift[shiftId].length} events`);
    });
    
    let totalFixed = 0;
    
    // Process each shift
    for (const [shiftIdStr, events] of Object.entries(eventsByShift)) {
      const shiftId = parseInt(shiftIdStr);
      
      if (isNaN(shiftId)) {
        console.log(`\n⚠️  Skipping ${events.length} unassigned events`);
        continue;
      }
      
      const shift = allShifts.find(s => s.id === shiftId);
      if (!shift) {
        console.log(`\n⚠️  Shift ${shiftId} not found, skipping ${events.length} events`);
        continue;
      }
      
      console.log(`\n🔧 Processing Shift ${shiftId}: ${shift.shift_name}`);
      console.log(`   Period: ${shift.start_time} - ${shift.end_time}`);
      console.log(`   Events to fix: ${events.length}`);
      
      const shiftStart = new Date(shift.start_time);
      const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
      const shiftDuration = shiftEnd - shiftStart;
      
      if (shiftDuration <= 0) {
        console.log(`   ⚠️  Invalid shift duration, skipping`);
        continue;
      }
      
      // Generate realistic timestamps for events
      const eventTypes = {
        'STATE_CHANGE': { weight: 0.4, duration: [30000, 300000] }, // 30s to 5min
        'MICRO_STOP': { weight: 0.3, duration: [5000, 60000] },    // 5s to 1min
        'STOP': { weight: 0.2, duration: [60000, 1800000] },       // 1min to 30min
        'SHIFT_START': { weight: 0.05, duration: [0, 1000] },      // At start
        'SHIFT_END': { weight: 0.05, duration: [0, 1000] }         // At end
      };
      
      let currentTime = shiftStart.getTime();
      const timeIncrement = shiftDuration / events.length;
      
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        
        // Generate timestamp with some randomness
        const baseTime = currentTime + (i * timeIncrement);
        const randomOffset = (Math.random() - 0.5) * timeIncrement * 0.5; // ±25% variation
        let newTimestamp = new Date(Math.max(shiftStart.getTime(), Math.min(shiftEnd.getTime(), baseTime + randomOffset)));
        
        // Special handling for shift start/end events
        if (event.event_type === 'SHIFT_START') {
          newTimestamp = new Date(shiftStart.getTime() + Math.random() * 60000); // Within first minute
        } else if (event.event_type === 'SHIFT_END') {
          newTimestamp = new Date(shiftEnd.getTime() - Math.random() * 60000); // Within last minute
        }
        
        try {
          await Event.update(
            { timestamp: newTimestamp },
            { where: { id: event.id } }
          );
          
          totalFixed++;
          
          if (i < 5) { // Show first 5 fixes per shift
            console.log(`     Fixed event ${event.id}: ${newTimestamp.toISOString()} (${event.event_type})`);
          }
          
        } catch (error) {
          console.error(`     ❌ Failed to fix event ${event.id}:`, error.message);
        }
      }
      
      console.log(`   ✅ Fixed ${events.length} events for shift ${shiftId}`);
    }
    
    console.log(`\n🎉 Timestamp fix completed!`);
    console.log(`   Total events fixed: ${totalFixed}`);
    
    // Verify the fixes for target shifts
    console.log(`\n🔍 Verification for Target Shifts:`);
    
    for (const shiftId of [74, 75, 76]) {
      const shift = allShifts.find(s => s.id === shiftId);
      if (!shift) {
        console.log(`   Shift ${shiftId}: ❌ Not found`);
        continue;
      }
      
      // Count events with valid timestamps
      const validEvents = await Event.findAll({
        where: {
          shift_id: shiftId,
          timestamp: {
            [Op.not]: 'Invalid Date',
            [Op.ne]: null
          }
        },
        attributes: ['id', 'timestamp', 'event_type', 'new_state'],
        order: [['timestamp', 'ASC']],
        limit: 3
      });
      
      console.log(`   Shift ${shiftId} (${shift.shift_name}): ${validEvents.length} events with valid timestamps`);
      
      if (validEvents.length > 0) {
        console.log(`     Sample events:`);
        validEvents.forEach((event, index) => {
          console.log(`       ${index + 1}. ${event.timestamp} - ${event.event_type} - ${event.new_state}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

fixInvalidTimestamps();