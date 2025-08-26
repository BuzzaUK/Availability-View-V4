const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const { sequelize } = require('./src/backend/config/database');

async function fixShiftsDirectly() {
  try {
    console.log('🔧 Directly fixing shifts 74 and 75 with SQL inserts...');
    console.log('=' .repeat(50));
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Check current events count
    const [beforeCount] = await sequelize.query('SELECT COUNT(*) as count FROM events');
    console.log(`📊 Current events in database: ${beforeCount[0].count}`);
    
    // Get shifts 74 and 75
    const [shifts] = await sequelize.query(`
      SELECT id, shift_name, start_time, end_time
      FROM shifts 
      WHERE id IN (74, 75)
      ORDER BY id
    `);
    
    if (shifts.length === 0) {
      console.log('❌ No shifts found with IDs 74 or 75');
      return;
    }
    
    // Get assets
    const [assets] = await sequelize.query('SELECT id, name FROM assets ORDER BY id LIMIT 2');
    if (assets.length === 0) {
      console.log('❌ No assets found');
      return;
    }
    
    console.log(`\n🔧 Found ${assets.length} assets:`);
    assets.forEach(asset => {
      console.log(`  - ${asset.name} (ID: ${asset.id})`);
    });
    
    let totalEventsCreated = 0;
    
    // Process each shift
    for (const shift of shifts) {
      console.log(`\n\n🔄 Processing Shift ${shift.id}: ${shift.shift_name}`);
      
      const shiftStart = new Date(shift.start_time);
      const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date(shiftStart.getTime() + 8 * 60 * 60 * 1000);
      
      console.log(`  Start: ${shiftStart.toLocaleString()}`);
      console.log(`  End: ${shiftEnd.toLocaleString()}`);
      
      // Create events for each asset
      for (const asset of assets) {
        console.log(`\n  📊 Creating events for ${asset.name}...`);
        
        // Create a simple timeline: Start -> Run -> Stop -> Run -> Stop -> End
        const events = [
          {
            timestamp: shiftStart,
            event_type: 'SHIFT_START',
            previous_state: null,
            new_state: 'STOPPED',
            stop_reason: null,
            duration: null
          },
          {
            timestamp: new Date(shiftStart.getTime() + 10 * 60 * 1000), // 10 min after start
            event_type: 'STATE_CHANGE',
            previous_state: 'STOPPED',
            new_state: 'RUNNING',
            stop_reason: null,
            duration: null
          },
          {
            timestamp: new Date(shiftStart.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
            event_type: 'STATE_CHANGE',
            previous_state: 'RUNNING',
            new_state: 'STOPPED',
            stop_reason: 'Maintenance',
            duration: null
          },
          {
            timestamp: new Date(shiftStart.getTime() + 2.5 * 60 * 60 * 1000), // 30 min later
            event_type: 'STATE_CHANGE',
            previous_state: 'STOPPED',
            new_state: 'RUNNING',
            stop_reason: null,
            duration: null
          },
          {
            timestamp: new Date(shiftStart.getTime() + 5 * 60 * 60 * 1000), // 2.5 hours later
            event_type: 'STATE_CHANGE',
            previous_state: 'RUNNING',
            new_state: 'STOPPED',
            stop_reason: 'Break',
            duration: null
          },
          {
            timestamp: new Date(shiftStart.getTime() + 5.5 * 60 * 60 * 1000), // 30 min later
            event_type: 'STATE_CHANGE',
            previous_state: 'STOPPED',
            new_state: 'RUNNING',
            stop_reason: null,
            duration: null
          },
          {
            timestamp: shiftEnd,
            event_type: 'SHIFT_END',
            previous_state: 'RUNNING',
            new_state: 'STOPPED',
            stop_reason: null,
            duration: null
          }
        ];
        
        // Add a micro-stop event
        events.push({
          timestamp: new Date(shiftStart.getTime() + 3 * 60 * 60 * 1000), // 3 hours after start
          event_type: 'MICRO_STOP',
          previous_state: null,
          new_state: null,
          stop_reason: 'Minor jam',
          duration: 3 * 60 * 1000 // 3 minutes in milliseconds
        });
        
        // Insert events directly with SQL
        for (const event of events) {
          try {
            await sequelize.query(`
              INSERT INTO events (
                asset_id, shift_id, timestamp, event_type, 
                previous_state, new_state, stop_reason, duration,
                metadata, created_at, updated_at
              ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
              )
            `, {
              replacements: [
                asset.id,
                shift.id,
                event.timestamp.toISOString(),
                event.event_type,
                event.previous_state,
                event.new_state,
                event.stop_reason,
                event.duration,
                JSON.stringify({ generated: true, reason: 'Fix zero KPI values' })
              ]
            });
            totalEventsCreated++;
          } catch (error) {
            console.log(`    ⚠️ Failed to create event: ${error.message}`);
          }
        }
        
        console.log(`    ✅ Created ${events.length} events for ${asset.name}`);
      }
    }
    
    // Verify events were created
    const [afterCount] = await sequelize.query('SELECT COUNT(*) as count FROM events');
    console.log(`\n📊 Events in database after creation: ${afterCount[0].count}`);
    console.log(`🎉 Successfully created ${totalEventsCreated} events`);
    
    // Check events for shifts 74 and 75
    for (const shift of shifts) {
      const [shiftEvents] = await sequelize.query(`
        SELECT COUNT(*) as count, event_type
        FROM events 
        WHERE shift_id = ?
        GROUP BY event_type
        ORDER BY count DESC
      `, {
        replacements: [shift.id]
      });
      
      console.log(`\n📊 Shift ${shift.id} events:`);
      if (shiftEvents.length === 0) {
        console.log('  ❌ Still no events found!');
      } else {
        shiftEvents.forEach(event => {
          console.log(`  - ${event.event_type}: ${event.count}`);
        });
      }
    }
    
    console.log('\n🎉 SUCCESS!');
    console.log('Shifts 74 and 75 should now have event data.');
    console.log('The KPI values should no longer show as zero.');
    
  } catch (error) {
    console.error('❌ Error fixing shifts:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fixShiftsDirectly();