const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const { sequelize } = require('./src/backend/config/database');
const databaseService = require('./src/backend/services/databaseService');

async function checkShiftsData() {
  try {
    console.log('🔍 Checking data for shifts 74 and 75...');
    console.log('=' .repeat(50));
    
    // Initialize database connection
    await databaseService.initializeDatabase();
    
    // Check if shifts 74 and 75 exist
    const [shifts] = await sequelize.query(`
      SELECT id, shift_name, start_time, end_time, status, created_at
      FROM shifts 
      WHERE id IN (74, 75)
      ORDER BY id
    `);
    
    console.log('\n📋 SHIFT INFORMATION:');
    if (shifts.length === 0) {
      console.log('❌ No shifts found with IDs 74 or 75');
      return;
    }
    
    for (const shift of shifts) {
      console.log(`\n🔄 Shift ${shift.id}:`);
      console.log(`  Name: ${shift.shift_name}`);
      console.log(`  Start: ${new Date(shift.start_time).toLocaleString()}`);
      console.log(`  End: ${shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Not ended'}`);
      console.log(`  Status: ${shift.status}`);
      console.log(`  Created: ${new Date(shift.created_at).toLocaleString()}`);
      
      // Check events for this shift
      const [events] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN event_type = 'STATE_CHANGE' THEN 1 END) as state_changes,
          COUNT(CASE WHEN event_type = 'MICRO_STOP' THEN 1 END) as micro_stops,
          COUNT(CASE WHEN previous_state = 'STOPPED' AND new_state = 'RUNNING' THEN 1 END) as start_events,
          COUNT(CASE WHEN previous_state = 'RUNNING' AND new_state = 'STOPPED' THEN 1 END) as stop_events
        FROM events 
        WHERE shift_id = ?
      `, {
        replacements: [shift.id]
      });
      
      const eventStats = events[0];
      console.log(`\n  📊 Event Statistics:`);
      console.log(`    Total Events: ${eventStats.total_events}`);
      console.log(`    State Changes: ${eventStats.state_changes}`);
      console.log(`    Micro Stops: ${eventStats.micro_stops}`);
      console.log(`    Start Events: ${eventStats.start_events}`);
      console.log(`    Stop Events: ${eventStats.stop_events}`);
      
      if (eventStats.total_events > 0) {
        // Get sample events
        const [sampleEvents] = await sequelize.query(`
          SELECT event_type, previous_state, new_state, timestamp, duration, stop_reason
          FROM events 
          WHERE shift_id = ?
          ORDER BY timestamp
          LIMIT 5
        `, {
          replacements: [shift.id]
        });
        
        console.log(`\n  📝 Sample Events (first 5):`);
        sampleEvents.forEach((event, index) => {
          console.log(`    ${index + 1}. ${event.event_type} at ${new Date(event.timestamp).toLocaleTimeString()}`);
          if (event.previous_state && event.new_state) {
            console.log(`       ${event.previous_state} → ${event.new_state}`);
          }
          if (event.duration) {
            console.log(`       Duration: ${(event.duration / 60000).toFixed(1)} minutes`);
          }
          if (event.stop_reason) {
            console.log(`       Reason: ${event.stop_reason}`);
          }
        });
      } else {
        console.log(`\n  ⚠️ NO EVENTS FOUND - This explains the zero KPI values!`);
      }
      
      // Check if there are archived reports for this shift
      const [archives] = await sequelize.query(`
        SELECT id, title, created_at
        FROM archives 
        WHERE archived_data LIKE '%"shift_id":${shift.id}%' 
           OR archived_data LIKE '%"id":${shift.id}%'
        ORDER BY created_at DESC
        LIMIT 3
      `);
      
      console.log(`\n  📦 Archived Reports: ${archives.length}`);
      archives.forEach((archive, index) => {
        console.log(`    ${index + 1}. ${archive.title} (${new Date(archive.created_at).toLocaleString()})`);
      });
    }
    
    // Check assets to see if they exist
    const [assets] = await sequelize.query(`
      SELECT id, name, type, created_at
      FROM assets
      ORDER BY created_at
    `);
    
    console.log(`\n\n🔧 AVAILABLE ASSETS: ${assets.length}`);
    assets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.name} (${asset.type}) - ID: ${asset.id}`);
    });
    
    console.log('\n💡 ANALYSIS:');
    console.log('If shifts 74 and 75 have zero events, this explains why all KPI values are zero.');
    console.log('KPIs like runtime, downtime, availability, and OEE are calculated from events.');
    console.log('Without events, there\'s no data to calculate meaningful metrics from.');
    
  } catch (error) {
    console.error('❌ Error checking shifts data:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkShiftsData();