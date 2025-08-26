const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function fixShifts74And75() {
  try {
    console.log('🔧 Adding events to Shifts 74 and 75...');
    
    // Get shift details
    const [shifts] = await sequelize.query(`
      SELECT id, start_time, end_time 
      FROM shifts 
      WHERE id IN (74, 75)
      ORDER BY id
    `);
    
    if (shifts.length === 0) {
      console.log('❌ Shifts 74 and 75 not found');
      return;
    }
    
    console.log('\n📊 Target shifts found:');
    shifts.forEach(shift => {
      console.log(`  Shift ${shift.id}: ${shift.start_time} to ${shift.end_time}`);
    });
    
    // Available assets and logger
    const assetIds = [1, 2]; // Line 2 and Line 1
    const loggerId = 1; // ESP32_001
    
    let totalEventsCreated = 0;
    
    for (const shift of shifts) {
      console.log(`\n🔄 Processing Shift ${shift.id}...`);
      
      const shiftStart = new Date(shift.start_time);
      const shiftEnd = new Date(shift.end_time);
      const shiftDurationMs = shiftEnd.getTime() - shiftStart.getTime();
      
      console.log(`  Shift duration: ${Math.round(shiftDurationMs / (1000 * 60))} minutes`);
      
      let shiftEventsCreated = 0;
      
      // Create events for each asset
      for (const assetId of assetIds) {
        console.log(`\n  📝 Creating events for Asset ${assetId}...`);
        
        // Create a realistic timeline of events
        const events = [];
        
        // 1. Shift start - asset starts running
        events.push({
          asset_id: assetId,
          logger_id: loggerId,
          event_type: 'STATE_CHANGE',
          previous_state: 'STOPPED',
          new_state: 'RUNNING',
          timestamp: new Date(shiftStart.getTime() + (Math.random() * 5 * 60 * 1000)), // Within first 5 minutes
          duration: null,
          stop_reason: null,
          shift_id: shift.id
        });
        
        // 2. Some micro stops during the shift
        const numMicroStops = Math.floor(Math.random() * 4) + 2; // 2-5 micro stops
        for (let i = 0; i < numMicroStops; i++) {
          const stopTime = new Date(shiftStart.getTime() + (Math.random() * shiftDurationMs * 0.8) + (shiftDurationMs * 0.1));
          const stopDuration = Math.floor(Math.random() * 120) + 30; // 30-150 seconds
          
          // Micro stop start
          events.push({
            asset_id: assetId,
            logger_id: loggerId,
            event_type: 'MICRO_STOP',
            previous_state: 'RUNNING',
            new_state: 'STOPPED',
            timestamp: stopTime,
            duration: stopDuration * 1000, // Convert to milliseconds
            stop_reason: ['Material jam', 'Sensor check', 'Quick adjustment', 'Operator intervention'][Math.floor(Math.random() * 4)],
            shift_id: shift.id
          });
          
          // Resume after micro stop
          events.push({
            asset_id: assetId,
            logger_id: loggerId,
            event_type: 'STATE_CHANGE',
            previous_state: 'STOPPED',
            new_state: 'RUNNING',
            timestamp: new Date(stopTime.getTime() + (stopDuration * 1000)),
            duration: null,
            stop_reason: null,
            shift_id: shift.id
          });
        }
        
        // 3. One longer downtime event
        if (Math.random() > 0.3) { // 70% chance of longer downtime
          const downtimeStart = new Date(shiftStart.getTime() + (Math.random() * shiftDurationMs * 0.6) + (shiftDurationMs * 0.2));
          const downtimeDuration = Math.floor(Math.random() * 900) + 300; // 5-20 minutes
          
          // Downtime start
          events.push({
            asset_id: assetId,
            logger_id: loggerId,
            event_type: 'STATE_CHANGE',
            previous_state: 'RUNNING',
            new_state: 'STOPPED',
            timestamp: downtimeStart,
            duration: downtimeDuration * 1000,
            stop_reason: ['Scheduled maintenance', 'Tool change', 'Material shortage', 'Quality check'][Math.floor(Math.random() * 4)],
            shift_id: shift.id
          });
          
          // Resume after downtime
          events.push({
            asset_id: assetId,
            logger_id: loggerId,
            event_type: 'STATE_CHANGE',
            previous_state: 'STOPPED',
            new_state: 'RUNNING',
            timestamp: new Date(downtimeStart.getTime() + (downtimeDuration * 1000)),
            duration: null,
            stop_reason: null,
            shift_id: shift.id
          });
        }
        
        // 4. Shift end - asset stops
        events.push({
          asset_id: assetId,
          logger_id: loggerId,
          event_type: 'STATE_CHANGE',
          previous_state: 'RUNNING',
          new_state: 'STOPPED',
          timestamp: new Date(shiftEnd.getTime() - (Math.random() * 5 * 60 * 1000)), // Within last 5 minutes
          duration: null,
          stop_reason: 'Shift end',
          shift_id: shift.id
        });
        
        // Sort events by timestamp
        events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Insert events into database
        for (const eventData of events) {
          try {
            const [result] = await sequelize.query(`
              INSERT INTO events (
                asset_id, logger_id, event_type, previous_state, new_state, 
                timestamp, duration, stop_reason, shift_id, metadata, processed,
                created_at, updated_at
              ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', 0, datetime('now'), datetime('now')
              )
            `, {
              replacements: [
                eventData.asset_id,
                eventData.logger_id,
                eventData.event_type,
                eventData.previous_state,
                eventData.new_state,
                eventData.timestamp.toISOString(),
                eventData.duration,
                eventData.stop_reason,
                eventData.shift_id
              ]
            });
            
            shiftEventsCreated++;
            totalEventsCreated++;
            
          } catch (insertError) {
            console.error(`    ❌ Failed to insert event:`, insertError.message);
          }
        }
        
        console.log(`    ✅ Created ${events.length} events for Asset ${assetId}`);
      }
      
      console.log(`  📊 Total events created for Shift ${shift.id}: ${shiftEventsCreated}`);
    }
    
    console.log(`\n🎉 SUCCESS! Total events created: ${totalEventsCreated}`);
    
    // Verify the events were created
    console.log('\n🔍 Verifying events...');
    for (const shift of shifts) {
      const [eventCount] = await sequelize.query(`
        SELECT COUNT(*) as count FROM events WHERE shift_id = ?
      `, {
        replacements: [shift.id]
      });
      
      console.log(`  Shift ${shift.id}: ${eventCount[0].count} events`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

fixShifts74And75();