const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function debugCurrentEvents() {
  try {
    console.log('🔍 Debugging Current Events in Database...');
    
    // Get all events from the main events table
    const [events] = await sequelize.query(`
      SELECT 
        e.id,
        e.timestamp,
        e.asset_id,
        e.event_type,
        e.previous_state,
        e.new_state,
        e.duration,
        e.stop_reason,
        e.created_at,
        a.name as asset_name
      FROM events e
      LEFT JOIN assets a ON e.asset_id = a.id
      ORDER BY e.timestamp DESC
      LIMIT 50
    `);
    
    console.log(`\n📊 Found ${events.length} events in main events table`);
    
    if (events.length === 0) {
      console.log('❌ No events found in main events table');
      
      // Check if events table exists and has the right structure
      const [tables] = await sequelize.query(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='events'
      `);
      
      if (tables.length === 0) {
        console.log('❌ Events table does not exist!');
      } else {
        console.log('✅ Events table exists');
        
        // Check table structure
        const [columns] = await sequelize.query(`PRAGMA table_info(events)`);
        console.log('\n📋 Events table structure:');
        columns.forEach(col => {
          console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
      }
      
      return;
    }
    
    // Group events by type
    const eventsByType = {};
    events.forEach(event => {
      const type = event.event_type || 'UNKNOWN';
      if (!eventsByType[type]) {
        eventsByType[type] = [];
      }
      eventsByType[type].push(event);
    });
    
    console.log('\n📊 Events by type:');
    Object.keys(eventsByType).forEach(type => {
      console.log(`  ${type}: ${eventsByType[type].length} events`);
    });
    
    // Show recent events
    console.log('\n📋 Recent events (last 20):');
    events.slice(0, 20).forEach((event, index) => {
      const timestamp = new Date(event.timestamp).toLocaleString();
      const assetName = event.asset_name || `Asset ${event.asset_id}` || 'Unknown';
      const duration = event.duration ? `(${event.duration}ms)` : '';
      const stopReason = event.stop_reason ? `- ${event.stop_reason}` : '';
      
      console.log(`  ${index + 1}. ${timestamp} | ${assetName} | ${event.event_type} | ${event.previous_state || ''} → ${event.new_state || ''} ${duration} ${stopReason}`);
    });
    
    // Check for events from different time periods
    console.log('\n📅 Events by date:');
    const eventsByDate = {};
    events.forEach(event => {
      const date = new Date(event.timestamp).toDateString();
      if (!eventsByDate[date]) {
        eventsByDate[date] = 0;
      }
      eventsByDate[date]++;
    });
    
    Object.keys(eventsByDate).sort().forEach(date => {
      console.log(`  ${date}: ${eventsByDate[date]} events`);
    });
    
    // Check current shift status
    console.log('\n🔄 Checking current shift status...');
    const [shifts] = await sequelize.query(`
      SELECT 
        id,
        shift_name,
        shift_number,
        start_time,
        end_time,
        status,
        created_at
      FROM shifts
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (shifts.length > 0) {
      console.log('Recent shifts:');
      shifts.forEach((shift, index) => {
        const startTime = new Date(shift.start_time).toLocaleString();
        const endTime = shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Not ended';
        console.log(`  ${index + 1}. ${shift.shift_name} (${shift.status}) | ${startTime} - ${endTime}`);
      });
      
      // Check events for the most recent shift
      const recentShift = shifts[0];
      if (recentShift.start_time) {
        const [shiftEvents] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM events
          WHERE timestamp >= ?
          ${recentShift.end_time ? 'AND timestamp <= ?' : ''}
        `, {
          replacements: recentShift.end_time ? [recentShift.start_time, recentShift.end_time] : [recentShift.start_time]
        });
        
        console.log(`\n📊 Events for most recent shift (${recentShift.shift_name}): ${shiftEvents[0].count}`);
      }
    } else {
      console.log('❌ No shifts found in database');
    }
    
    // Check if there are any non-shift events
    const [nonShiftEvents] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM events
      WHERE event_type NOT IN ('SHIFT_START', 'SHIFT_END')
    `);
    
    console.log(`\n🔍 Non-shift events in database: ${nonShiftEvents[0].count}`);
    
    if (nonShiftEvents[0].count > 0) {
      const [sampleNonShiftEvents] = await sequelize.query(`
        SELECT 
          e.event_type,
          e.timestamp,
          e.previous_state,
          e.new_state,
          a.name as asset_name
        FROM events e
        LEFT JOIN assets a ON e.asset_id = a.id
        WHERE e.event_type NOT IN ('SHIFT_START', 'SHIFT_END')
        ORDER BY e.timestamp DESC
        LIMIT 10
      `);
      
      console.log('\n📋 Sample non-shift events:');
      sampleNonShiftEvents.forEach((event, index) => {
        const timestamp = new Date(event.timestamp).toLocaleString();
        console.log(`  ${index + 1}. ${timestamp} | ${event.asset_name || 'Unknown'} | ${event.event_type} | ${event.previous_state || ''} → ${event.new_state || ''}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

debugCurrentEvents();