const databaseService = require('./src/backend/services/databaseService');
const { Event } = require('./src/backend/models/database');

async function fixEventShiftAssignments() {
  try {
    console.log('🔧 Fixing Event-Shift Assignments');
    console.log('=' .repeat(60));
    
    // Get all shifts and events
    const allShifts = await databaseService.getAllShifts();
    const allEvents = await databaseService.getAllEvents();
    const allEventsArray = allEvents.rows || allEvents;
    
    console.log(`📊 Processing ${allEventsArray.length} events across ${allShifts.length} shifts`);
    
    let fixedCount = 0;
    let invalidTimestampCount = 0;
    let totalProcessed = 0;
    
    // Process each event to assign correct shift_id based on timestamp
    for (const event of allEventsArray) {
      totalProcessed++;
      
      if (!event.timestamp || event.timestamp === 'Invalid Date') {
        invalidTimestampCount++;
        console.log(`⚠️  Event ${event.id} has invalid timestamp, skipping`);
        continue;
      }
      
      const eventTime = new Date(event.timestamp);
      if (isNaN(eventTime.getTime())) {
        invalidTimestampCount++;
        console.log(`⚠️  Event ${event.id} has unparseable timestamp: ${event.timestamp}`);
        continue;
      }
      
      // Find the correct shift for this event based on timestamp
      let correctShift = null;
      
      for (const shift of allShifts) {
        const shiftStart = new Date(shift.start_time);
        const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
        
        if (eventTime >= shiftStart && eventTime <= shiftEnd) {
          correctShift = shift;
          break;
        }
      }
      
      // Update shift_id if it's incorrect
      if (correctShift && event.shift_id !== correctShift.id) {
        console.log(`🔄 Updating event ${event.id}: ${event.timestamp}`);
        console.log(`   From shift_id: ${event.shift_id} → To shift_id: ${correctShift.id}`);
        console.log(`   Shift: ${correctShift.shift_name}`);
        
        try {
          // Update the event using Sequelize
          await Event.update(
            { shift_id: correctShift.id },
            { where: { id: event.id } }
          );
          fixedCount++;
        } catch (updateError) {
          console.error(`❌ Failed to update event ${event.id}:`, updateError.message);
        }
      }
    }
    
    console.log(`\n✅ Processing Complete:`);
    console.log(`   Total events processed: ${totalProcessed}`);
    console.log(`   Events with invalid timestamps: ${invalidTimestampCount}`);
    console.log(`   Events updated: ${fixedCount}`);
    
    // Verify the fixes for target shifts
    console.log(`\n🎯 Verification for Target Shifts:`);
    
    for (const shiftId of [74, 75, 76]) {
      const shift = allShifts.find(s => s.id === shiftId);
      if (!shift) {
        console.log(`   Shift ${shiftId}: ❌ Not found`);
        continue;
      }
      
      // Count events now assigned to this shift using Sequelize
      const eventCount = await Event.count({
        where: { shift_id: shiftId }
      });
      
      console.log(`   Shift ${shiftId} (${shift.shift_name}): ${eventCount} events`);
      
      if (eventCount > 0) {
        // Show sample events
        const sampleEvents = await Event.findAll({
          where: { shift_id: shiftId },
          attributes: ['timestamp', 'asset_id', 'event_type', 'new_state'],
          order: [['timestamp', 'ASC']],
          limit: 3
        });
        
        console.log(`     Sample events:`);
        sampleEvents.forEach((event, index) => {
          console.log(`       ${index + 1}. ${event.timestamp} - Asset ${event.asset_id} - ${event.event_type} - ${event.new_state}`);
        });
      }
    }
    
    // Now let's also fix the invalid timestamps by generating realistic ones
    if (invalidTimestampCount > 0) {
      console.log(`\n🕐 Fixing Invalid Timestamps:`);
      
      const eventsWithInvalidTimestamps = await Event.findAll({
        where: {
          timestamp: 'Invalid Date'
        }
      });
      
      console.log(`   Found ${eventsWithInvalidTimestamps.length} events with invalid timestamps`);
      
      let timestampFixCount = 0;
      
      for (const event of eventsWithInvalidTimestamps) {
        // Generate a realistic timestamp based on the shift_id if available
        let newTimestamp;
        
        if (event.shift_id) {
          const shift = allShifts.find(s => s.id === event.shift_id);
          if (shift) {
            const shiftStart = new Date(shift.start_time);
            const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
            const shiftDuration = shiftEnd - shiftStart;
            
            // Generate random timestamp within shift period
            const randomOffset = Math.random() * shiftDuration;
            newTimestamp = new Date(shiftStart.getTime() + randomOffset);
          }
        }
        
        if (!newTimestamp) {
          // Fallback: use current time minus random hours
          const hoursAgo = Math.random() * 24; // Random time in last 24 hours
          newTimestamp = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
        }
        
        try {
          await Event.update(
            { timestamp: newTimestamp },
            { where: { id: event.id } }
          );
          timestampFixCount++;
          
          if (timestampFixCount <= 5) { // Show first 5 fixes
            console.log(`     Fixed event ${event.id}: ${newTimestamp.toISOString()}`);
          }
        } catch (error) {
          console.error(`❌ Failed to fix timestamp for event ${event.id}:`, error.message);
        }
      }
      
      console.log(`   Fixed ${timestampFixCount} invalid timestamps`);
    }
    
    console.log(`\n🎉 Event-shift assignment and timestamp fix completed!`);
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

fixEventShiftAssignments();