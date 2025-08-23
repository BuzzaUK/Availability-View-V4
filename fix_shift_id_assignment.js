const databaseService = require('./src/backend/services/databaseService');
const { sequelize } = require('./src/backend/config/database');

// Fix shift_id assignment for events that are missing it
async function fixShiftIdAssignment() {
  console.log('🔧 FIXING SHIFT_ID ASSIGNMENT FOR EVENTS');
  console.log('=' .repeat(50));
  
  try {
    // Wait for database to be ready
    await databaseService.initializeDatabase();
    
    // 1. Find events without shift_id
    console.log('\n🔍 FINDING EVENTS WITHOUT SHIFT_ID:');
    const [eventsWithoutShiftId] = await sequelize.query(`
      SELECT 
        id, 
        asset_id, 
        event_type, 
        timestamp, 
        shift_id,
        created_at
      FROM events 
      WHERE shift_id IS NULL
      ORDER BY timestamp DESC
    `);
    
    console.log(`Found ${eventsWithoutShiftId.length} events without shift_id:`);
    eventsWithoutShiftId.forEach((event, index) => {
      console.log(`  ${index + 1}. ID: ${event.id} - ${event.event_type} - ${new Date(event.timestamp).toLocaleString()}`);
    });
    
    if (eventsWithoutShiftId.length === 0) {
      console.log('✅ All events have shift_id assigned!');
      return;
    }
    
    // 2. Get current active shift
    const currentShift = await databaseService.getCurrentShift();
    if (!currentShift) {
      console.log('❌ No active shift found to assign events to');
      return;
    }
    
    console.log(`\n🔄 Current active shift: ${currentShift.shift_name} (ID: ${currentShift.id})`);
    console.log(`   Started: ${currentShift.start_time}`);
    
    // 3. Check which events fall within the current shift timeframe
    const shiftStartTime = new Date(currentShift.start_time);
    const eventsToUpdate = [];
    
    console.log('\n📊 ANALYZING EVENTS FOR SHIFT ASSIGNMENT:');
    eventsWithoutShiftId.forEach(event => {
      const eventTime = new Date(event.timestamp);
      const isWithinShift = eventTime >= shiftStartTime;
      
      console.log(`  Event ${event.id} (${event.event_type}): ${eventTime.toLocaleString()}`);
      console.log(`    Within current shift: ${isWithinShift ? '✅ YES' : '❌ NO'}`);
      
      if (isWithinShift) {
        eventsToUpdate.push(event);
      }
    });
    
    if (eventsToUpdate.length === 0) {
      console.log('\n❌ No events found within current shift timeframe');
      return;
    }
    
    // 4. Update events with correct shift_id
    console.log(`\n🔧 UPDATING ${eventsToUpdate.length} EVENTS WITH SHIFT_ID:`);
    
    for (const event of eventsToUpdate) {
      await sequelize.query(`
        UPDATE events 
        SET shift_id = ?
        WHERE id = ?
      `, {
        replacements: [currentShift.id, event.id]
      });
      
      console.log(`  ✅ Updated event ${event.id} (${event.event_type}) with shift_id ${currentShift.id}`);
    }
    
    // 5. Verify the fix
    console.log('\n🔍 VERIFYING THE FIX:');
    const [updatedStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(shift_id) as events_with_shift_id,
        COUNT(CASE WHEN shift_id IS NULL THEN 1 END) as events_without_shift_id
      FROM events
    `);
    
    const stats = updatedStats[0];
    console.log(`  Total events: ${stats.total_events}`);
    console.log(`  Events with shift_id: ${stats.events_with_shift_id}`);
    console.log(`  Events without shift_id: ${stats.events_without_shift_id}`);
    
    if (stats.events_without_shift_id === 0) {
      console.log('\n🎉 SUCCESS! All events now have shift_id assigned!');
    } else {
      console.log(`\n⚠️  Still ${stats.events_without_shift_id} events without shift_id`);
    }
    
    // 6. Show current shift events
    console.log('\n📋 CURRENT SHIFT EVENTS AFTER FIX:');
    const [currentShiftEvents] = await sequelize.query(`
      SELECT 
        id, 
        event_type, 
        timestamp, 
        shift_id
      FROM events 
      WHERE shift_id = ?
      ORDER BY timestamp ASC
    `, {
      replacements: [currentShift.id]
    });
    
    console.log(`Current shift now has ${currentShiftEvents.length} events:`);
    currentShiftEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${new Date(event.timestamp).toLocaleTimeString()} - ${event.event_type}`);
    });
    
    console.log('\n✅ SHIFT_ID ASSIGNMENT FIX COMPLETED!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Test archive creation again to verify all events are captured');
    console.log('   2. Check CSV export to ensure all events are included');
    console.log('   3. Verify frontend displays all events correctly');
    
  } catch (error) {
    console.error('❌ Error fixing shift_id assignment:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

fixShiftIdAssignment().catch(console.error);