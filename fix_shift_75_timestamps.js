const { Event, Shift } = require('./src/backend/models/database');
const moment = require('moment');

async function fixShift75Timestamps() {
  try {
    console.log('🔧 Fixing Shift 75 Timestamps');
    console.log('=' .repeat(60));
    
    // Get Shift 75 details
    const shift75 = await Shift.findByPk(75);
    if (!shift75) {
      console.log('❌ Shift 75 not found!');
      return;
    }
    
    console.log(`📊 Shift 75: ${shift75.shift_name}`);
    console.log(`   Start: ${shift75.start_time}`);
    console.log(`   End: ${shift75.end_time}`);
    
    // Parse shift times
    const shiftStart = moment(shift75.start_time);
    const shiftEnd = moment(shift75.end_time);
    const shiftDurationMinutes = shiftEnd.diff(shiftStart, 'minutes');
    
    console.log(`   Duration: ${shiftDurationMinutes} minutes (${(shiftDurationMinutes/60).toFixed(1)} hours)`);
    
    // Get all events for Shift 75
    const events = await Event.findAll({
      where: { shift_id: 75 },
      order: [['id', 'ASC']]
    });
    
    console.log(`\n📋 Found ${events.length} events for Shift 75`);
    
    if (events.length === 0) {
      console.log('❌ No events to fix!');
      return;
    }
    
    // Group events by type for realistic timing
    const eventsByType = {
      STATE_CHANGE: [],
      MICRO_STOP: [],
      DOWNTIME: []
    };
    
    events.forEach(event => {
      const type = event.event_type || 'STATE_CHANGE';
      if (eventsByType[type]) {
        eventsByType[type].push(event);
      } else {
        eventsByType.STATE_CHANGE.push(event);
      }
    });
    
    console.log(`\n📊 Event Distribution:`);
    console.log(`   STATE_CHANGE: ${eventsByType.STATE_CHANGE.length}`);
    console.log(`   MICRO_STOP: ${eventsByType.MICRO_STOP.length}`);
    console.log(`   DOWNTIME: ${eventsByType.DOWNTIME.length}`);
    
    let updatedCount = 0;
    let currentTime = shiftStart.clone();
    
    // Process STATE_CHANGE events first (spread throughout shift)
    if (eventsByType.STATE_CHANGE.length > 0) {
      console.log(`\n🔄 Processing ${eventsByType.STATE_CHANGE.length} STATE_CHANGE events...`);
      const stateChangeInterval = Math.floor(shiftDurationMinutes / (eventsByType.STATE_CHANGE.length + 1));
      
      for (let i = 0; i < eventsByType.STATE_CHANGE.length; i++) {
        const event = eventsByType.STATE_CHANGE[i];
        currentTime.add(stateChangeInterval, 'minutes');
        
        // Add some randomness (±5 minutes)
        const randomOffset = Math.floor(Math.random() * 11) - 5;
        const eventTime = currentTime.clone().add(randomOffset, 'minutes');
        
        // Ensure we don't go outside shift bounds
        if (eventTime.isBefore(shiftStart)) eventTime = shiftStart.clone().add(1, 'minute');
        if (eventTime.isAfter(shiftEnd)) eventTime = shiftEnd.clone().subtract(1, 'minute');
        
        await Event.update(
          { timestamp: eventTime.toDate() },
          { where: { id: event.id } }
        );
        
        console.log(`   ✅ Event ${event.id}: ${eventTime.format('YYYY-MM-DD HH:mm:ss')} (${event.new_state || 'N/A'})`);
        updatedCount++;
      }
    }
    
    // Process MICRO_STOP events (clustered in middle of shift)
    if (eventsByType.MICRO_STOP.length > 0) {
      console.log(`\n⏸️ Processing ${eventsByType.MICRO_STOP.length} MICRO_STOP events...`);
      const microStopStart = shiftStart.clone().add(Math.floor(shiftDurationMinutes * 0.3), 'minutes');
      const microStopEnd = shiftStart.clone().add(Math.floor(shiftDurationMinutes * 0.7), 'minutes');
      const microStopDuration = microStopEnd.diff(microStopStart, 'minutes');
      const microStopInterval = Math.floor(microStopDuration / (eventsByType.MICRO_STOP.length + 1));
      
      let microStopTime = microStopStart.clone();
      
      for (let i = 0; i < eventsByType.MICRO_STOP.length; i++) {
        const event = eventsByType.MICRO_STOP[i];
        microStopTime.add(microStopInterval, 'minutes');
        
        // Add some randomness (±2 minutes)
        const randomOffset = Math.floor(Math.random() * 5) - 2;
        const eventTime = microStopTime.clone().add(randomOffset, 'minutes');
        
        await Event.update(
          { timestamp: eventTime.toDate() },
          { where: { id: event.id } }
        );
        
        console.log(`   ✅ Event ${event.id}: ${eventTime.format('YYYY-MM-DD HH:mm:ss')} (MICRO_STOP)`);
        updatedCount++;
      }
    }
    
    // Process DOWNTIME events (spread throughout shift)
    if (eventsByType.DOWNTIME.length > 0) {
      console.log(`\n⏬ Processing ${eventsByType.DOWNTIME.length} DOWNTIME events...`);
      const downtimeInterval = Math.floor(shiftDurationMinutes / (eventsByType.DOWNTIME.length + 1));
      let downtimeTime = shiftStart.clone();
      
      for (let i = 0; i < eventsByType.DOWNTIME.length; i++) {
        const event = eventsByType.DOWNTIME[i];
        downtimeTime.add(downtimeInterval, 'minutes');
        
        // Add some randomness (±10 minutes)
        const randomOffset = Math.floor(Math.random() * 21) - 10;
        const eventTime = downtimeTime.clone().add(randomOffset, 'minutes');
        
        // Ensure we don't go outside shift bounds
        if (eventTime.isBefore(shiftStart)) eventTime = shiftStart.clone().add(2, 'minutes');
        if (eventTime.isAfter(shiftEnd)) eventTime = shiftEnd.clone().subtract(2, 'minutes');
        
        await Event.update(
          { timestamp: eventTime.toDate() },
          { where: { id: event.id } }
        );
        
        console.log(`   ✅ Event ${event.id}: ${eventTime.format('YYYY-MM-DD HH:mm:ss')} (DOWNTIME)`);
        updatedCount++;
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} events with realistic timestamps`);
    
    // Verify the fix
    console.log(`\n🔍 Verification:`);
    const updatedEvents = await Event.findAll({
      where: { shift_id: 75 },
      attributes: ['id', 'timestamp', 'event_type', 'new_state'],
      order: [['timestamp', 'ASC']]
    });
    
    console.log(`   Total events: ${updatedEvents.length}`);
    
    let validCount = 0;
    let invalidCount = 0;
    
    updatedEvents.forEach(event => {
      const date = new Date(event.timestamp);
      if (isNaN(date.getTime()) || String(event.timestamp) === 'Invalid Date') {
        invalidCount++;
      } else {
        validCount++;
      }
    });
    
    console.log(`   Valid timestamps: ${validCount}`);
    console.log(`   Invalid timestamps: ${invalidCount}`);
    
    if (validCount > 0) {
      console.log(`\n   Sample timestamps:`);
      updatedEvents.slice(0, 5).forEach((event, index) => {
        console.log(`     ${index + 1}. Event ${event.id}: ${moment(event.timestamp).format('YYYY-MM-DD HH:mm:ss')} (${event.event_type})`);
      });
    }
    
    console.log(`\n🎉 Shift 75 timestamp fix completed!`);
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

fixShift75Timestamps();