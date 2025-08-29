const { sequelize } = require('./src/backend/config/database');
const { Asset } = require('./src/backend/models/database');

async function checkStopsDiscrepancy() {
  try {
    console.log('\n🔍 ANALYZING STOPS DISCREPANCY...');
    console.log('=' .repeat(60));

    // Get asset data using Sequelize
    const asset = await Asset.findByPk(1);
    
    if (!asset) {
      console.log('❌ Asset with ID 1 not found');
      return;
    }

    console.log('\n🏭 ASSET DATABASE FIELD:');
    console.log(`   Asset: ${asset.name} (ID: ${asset.id})`);
    console.log(`   Total Stops (DB field): ${asset.total_stops}`);
    console.log(`   Runtime: ${asset.runtime}s`);
    console.log(`   Downtime: ${asset.downtime}s`);
    console.log(`   Current State: ${asset.current_state}`);
    console.log(`   Microstop Threshold: ${asset.microstop_threshold}s`);

    // Count all stop events in the database using raw SQL
    const [eventCounts] = await sequelize.query(`
      SELECT 
        event_type,
        new_state,
        previous_state as old_state,
        COUNT(*) as count
      FROM events 
      WHERE asset_id = 1 
      AND (
        (event_type = 'STATE_CHANGE' AND new_state = 'STOPPED') OR
        (event_type = 'STOP_END') OR
        (event_type = 'RUN_END')
      )
      GROUP BY event_type, new_state, previous_state
      ORDER BY count DESC
    `);

    console.log('\n📊 EVENT COUNTS BY TYPE:');
    let totalEventStops = 0;
    eventCounts.forEach(row => {
      console.log(`   ${row.event_type} (${row.old_state || 'N/A'} → ${row.new_state || 'N/A'}): ${row.count} events`);
      totalEventStops += row.count;
    });
    console.log(`   \n   📈 TOTAL STOP EVENTS: ${totalEventStops}`);

    // Get recent events with durations
    const [recentEvents] = await sequelize.query(`
      SELECT 
        event_type,
        new_state,
        previous_state as old_state,
        duration,
        timestamp
      FROM events 
      WHERE asset_id = 1 
      AND (
        (event_type = 'STATE_CHANGE' AND new_state = 'STOPPED') OR
        (event_type = 'STOP_END') OR
        (event_type = 'RUN_END')
      )
      AND duration IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 30
    `);

    console.log('\n🕒 RECENT STOP EVENTS (last 30):');
    let microStops = 0;
    const microstopThreshold = asset.microstop_threshold || 180;
    
    recentEvents.forEach((event, index) => {
      const duration = event.duration || 0;
      const isMicroStop = duration < microstopThreshold;
      if (isMicroStop) microStops++;
      
      console.log(`   ${index + 1}. ${event.event_type} (${event.old_state || 'N/A'} → ${event.new_state || 'N/A'}): ${duration}s ${isMicroStop ? '🔸 MICRO' : '🔹 NORMAL'} - ${event.timestamp}`);
    });

    // Get today's events for analytics comparison
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [todayEvents] = await sequelize.query(`
      SELECT 
        event_type,
        duration
      FROM events 
      WHERE asset_id = 1 
      AND (
        (event_type = 'STATE_CHANGE' AND new_state = 'STOPPED') OR
        (event_type = 'STOP_END') OR
        (event_type = 'RUN_END')
      )
      AND timestamp >= ? AND timestamp < ?
      AND duration IS NOT NULL
    `, {
      replacements: [startOfDay.toISOString(), endOfDay.toISOString()]
    });

    const todayMicroStops = todayEvents.filter(e => (e.duration || 0) < microstopThreshold).length;
    const todayTotalStops = todayEvents.length;

    console.log('\n' + '=' .repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`   Asset DB Field (total_stops): ${asset.total_stops}`);
    console.log(`   Actual Events in DB (all time): ${totalEventStops}`);
    console.log(`   Micro Stops in Recent 30 Events: ${microStops}`);
    console.log(`   Today's Events: ${todayTotalStops}`);
    console.log(`   Today's Micro Stops: ${todayMicroStops}`);
    console.log(`   \n   🔍 DISCREPANCY: ${totalEventStops - asset.total_stops} more events than DB field`);
    
    console.log('\n❗ EXPLANATION:');
    console.log('   📊 ANALYTICS PAGE CALCULATION:');
    console.log('   - Total Stops (23): Uses asset.total_stops field from database');
    console.log('   - Micro Stops (29): Counts STOP_END + RUN_END + STATE_CHANGE events within date range');
    console.log('   \n   🔄 ROOT CAUSE:');
    console.log('   - The asset.total_stops field is only incremented for RUNNING → STOPPED transitions');
    console.log('   - New timing system creates STOP_END and RUN_END events for all state changes');
    console.log('   - Analytics counts ALL stop-related events, not just the legacy counter');
    console.log('   - This causes micro stops count to exceed total stops count');
    
    console.log('\n   💡 SOLUTION OPTIONS:');
    console.log('   1. Update asset.total_stops to include all stop events (STOP_END + RUN_END)');
    console.log('   2. Change analytics to use consistent counting method');
    console.log('   3. Clarify that "Total Stops" means "Transitions to STOPPED" vs "All Stop Events"');

  } catch (error) {
    console.error('❌ Error analyzing stops discrepancy:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n✅ Database connection closed');
  }
}

checkStopsDiscrepancy().catch(console.error);