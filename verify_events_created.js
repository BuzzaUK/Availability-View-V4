const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function verifyEventsCreated() {
  try {
    console.log('🔍 Verifying events were created for shifts 74 and 75...');
    
    // Check total events in database
    const [totalEvents] = await sequelize.query(`SELECT COUNT(*) as count FROM events`);
    console.log(`\n📊 Total events in database: ${totalEvents[0].count}`);
    
    // Check events by shift_id
    const [eventsByShift] = await sequelize.query(`
      SELECT shift_id, COUNT(*) as count 
      FROM events 
      WHERE shift_id IS NOT NULL
      GROUP BY shift_id 
      ORDER BY shift_id
    `);
    
    console.log('\n📊 Events by shift_id:');
    if (eventsByShift.length === 0) {
      console.log('  No events found with shift_id');
    } else {
      eventsByShift.forEach(row => {
        console.log(`  Shift ${row.shift_id}: ${row.count} events`);
      });
    }
    
    // Check events for shifts 74 and 75 specifically
    for (const shiftId of [74, 75]) {
      const [shiftEvents] = await sequelize.query(`
        SELECT COUNT(*) as count, 
               MIN(timestamp) as first_event,
               MAX(timestamp) as last_event
        FROM events 
        WHERE shift_id = ?
      `, {
        replacements: [shiftId]
      });
      
      console.log(`\n📋 Shift ${shiftId} events:`);
      console.log(`  Count: ${shiftEvents[0].count}`);
      if (shiftEvents[0].count > 0) {
        console.log(`  First event: ${shiftEvents[0].first_event}`);
        console.log(`  Last event: ${shiftEvents[0].last_event}`);
        
        // Show sample events
        const [sampleEvents] = await sequelize.query(`
          SELECT event_type, previous_state, new_state, timestamp, duration, stop_reason
          FROM events 
          WHERE shift_id = ?
          ORDER BY timestamp
          LIMIT 5
        `, {
          replacements: [shiftId]
        });
        
        console.log(`  Sample events:`);
        sampleEvents.forEach((event, index) => {
          console.log(`    ${index + 1}. ${event.event_type} at ${new Date(event.timestamp).toLocaleTimeString()}`);
          if (event.previous_state && event.new_state) {
            console.log(`       ${event.previous_state} → ${event.new_state}`);
          }
          if (event.duration) {
            console.log(`       Duration: ${(event.duration / 1000 / 60).toFixed(1)} minutes`);
          }
          if (event.stop_reason) {
            console.log(`       Reason: ${event.stop_reason}`);
          }
        });
      }
    }
    
    // Check if there are events without shift_id
    const [eventsWithoutShift] = await sequelize.query(`
      SELECT COUNT(*) as count FROM events WHERE shift_id IS NULL
    `);
    
    console.log(`\n⚠️  Events without shift_id: ${eventsWithoutShift[0].count}`);
    
    // Check shift times to ensure events are within shift periods
    const [shifts] = await sequelize.query(`
      SELECT id, start_time, end_time 
      FROM shifts 
      WHERE id IN (74, 75)
      ORDER BY id
    `);
    
    console.log('\n📅 Shift periods:');
    shifts.forEach(shift => {
      console.log(`  Shift ${shift.id}: ${shift.start_time} to ${shift.end_time}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

verifyEventsCreated();