const { sequelize } = require('./src/backend/config/database');
const databaseService = require('./src/backend/services/databaseService');

async function fixNullShiftIds() {
  console.log('🔧 FIXING NULL SHIFT_ID EVENTS');
  console.log('=' .repeat(50));
  
  try {
    await databaseService.initializeDatabase();
    
    // Get all events with NULL shift_id
    const [nullShiftEvents] = await sequelize.query(`
      SELECT 
        id,
        timestamp,
        event_type,
        asset_id
      FROM events 
      WHERE shift_id IS NULL
      ORDER BY timestamp ASC
    `);
    
    console.log(`📊 Found ${nullShiftEvents.length} events with NULL shift_id`);
    
    if (nullShiftEvents.length === 0) {
      console.log('✅ No events need fixing!');
      return;
    }
    
    // Get all shifts ordered by start time
    const [shifts] = await sequelize.query(`
      SELECT 
        id,
        shift_name,
        start_time,
        end_time
      FROM shifts
      ORDER BY start_time ASC
    `);
    
    console.log(`📋 Found ${shifts.length} shifts to match against`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const event of nullShiftEvents) {
      const eventTime = new Date(event.timestamp);
      let matchedShift = null;
      
      // Find the shift that contains this event's timestamp
      for (const shift of shifts) {
        const shiftStart = new Date(shift.start_time);
        const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date(); // Use current time if shift is still active
        
        if (eventTime >= shiftStart && eventTime <= shiftEnd) {
          matchedShift = shift;
          break;
        }
      }
      
      if (matchedShift) {
        // Update the event with the matched shift_id
        await sequelize.query(`
          UPDATE events 
          SET shift_id = ?
          WHERE id = ?
        `, {
          replacements: [matchedShift.id, event.id]
        });
        
        console.log(`  ✅ Event ${event.id} (${event.event_type}) assigned to shift ${matchedShift.id} (${matchedShift.shift_name})`);
        fixedCount++;
      } else {
        console.log(`  ⚠️ Event ${event.id} (${event.event_type}) at ${eventTime.toISOString()} - no matching shift found`);
        skippedCount++;
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`  ✅ Fixed: ${fixedCount} events`);
    console.log(`  ⚠️ Skipped: ${skippedCount} events`);
    
    // Verify the fix
    const [remainingNullEvents] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM events 
      WHERE shift_id IS NULL
    `);
    
    console.log(`\n🔍 VERIFICATION:`);
    console.log(`  Remaining NULL shift_id events: ${remainingNullEvents[0].count}`);
    
    if (remainingNullEvents[0].count === 0) {
      console.log('\n🎉 SUCCESS: All events now have shift_id assigned!');
    } else {
      console.log('\n⚠️ Some events still have NULL shift_id (likely events outside any shift timeframe)');
    }
    
  } catch (error) {
    console.error('❌ Error fixing NULL shift_id events:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

fixNullShiftIds().catch(console.error);