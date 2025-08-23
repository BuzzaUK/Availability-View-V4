const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function createEventArchive() {
  try {
    console.log('📦 Creating new event archive with test data...');
    
    // Get current shift
    const [currentShift] = await sequelize.query(`
      SELECT * FROM shifts 
      WHERE end_time IS NULL OR status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (currentShift.length === 0) {
      console.log('❌ No active shift found');
      return;
    }
    
    const shift = currentShift[0];
    console.log(`📊 Archiving events for: ${shift.shift_name}`);
    
    // Get all events for current shift
    const [events] = await sequelize.query(`
      SELECT 
        e.*,
        a.name as asset_name,
        a.type as asset_type
      FROM events e
      LEFT JOIN assets a ON e.asset_id = a.id
      WHERE e.timestamp >= ?
      ORDER BY e.timestamp ASC
    `, {
      replacements: [shift.start_time]
    });
    
    console.log(`📊 Found ${events.length} events to archive`);
    
    if (events.length === 0) {
      console.log('❌ No events found for current shift');
      return;
    }
    
    // Process events for archiving
    const processedEvents = events.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      asset_name: event.asset_name || `Asset ${event.asset_id}`,
      asset_type: event.asset_type || 'unknown',
      event_type: event.event_type,
      previous_state: event.previous_state,
      new_state: event.new_state,
      duration: event.duration,
      duration_minutes: event.duration ? Math.round(event.duration / (1000 * 60)) : null,
      stop_reason: event.stop_reason,
      logger_id: event.logger_id,
      metadata: event.metadata
    }));
    
    // Create archived data structure
    const archivedData = {
      shift_id: shift.id,
      shift_name: shift.shift_name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      events: processedEvents,
      event_count: processedEvents.length,
      summary: {
        total_events: processedEvents.length,
        event_types: {},
        assets_involved: [...new Set(processedEvents.map(e => e.asset_name))],
        duration_range: {
          min: Math.min(...processedEvents.filter(e => e.duration).map(e => e.duration_minutes)),
          max: Math.max(...processedEvents.filter(e => e.duration).map(e => e.duration_minutes)),
          avg: Math.round(processedEvents.filter(e => e.duration).reduce((sum, e) => sum + e.duration_minutes, 0) / processedEvents.filter(e => e.duration).length)
        }
      },
      created_at: new Date().toISOString()
    };
    
    // Count event types
    processedEvents.forEach(event => {
      archivedData.summary.event_types[event.event_type] = (archivedData.summary.event_types[event.event_type] || 0) + 1;
    });
    
    // Create archive entry
    const archiveTitle = `Event Archive - ${shift.shift_name}`;
    const archiveDescription = `Complete event archive containing ${processedEvents.length} events from ${shift.shift_name}. Includes ${Object.keys(archivedData.summary.event_types).length} different event types across ${archivedData.summary.assets_involved.length} assets.`;
    
    console.log('💾 Inserting archive into database...');
    
    const [result] = await sequelize.query(`
      INSERT INTO archives (
        archive_type, title, description, archived_data, 
        date_range_start, date_range_end, status, created_by, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, {
      replacements: [
        'EVENTS',
        archiveTitle,
        archiveDescription,
        JSON.stringify(archivedData),
        shift.start_time,
        shift.end_time || new Date().toISOString(),
        'COMPLETED',
        1 // Default user ID
      ]
    });
    
    console.log('✅ Event archive created successfully!');
    
    // Show archive summary
    console.log('\n📈 Archive Summary:');
    console.log(`  Title: ${archiveTitle}`);
    console.log(`  Total Events: ${archivedData.eventCount}`);
    console.log(`  Assets Involved: ${archivedData.summary.assets_involved.join(', ')}`);
    console.log(`  Event Types:`);
    Object.entries(archivedData.summary.event_types).forEach(([type, count]) => {
      console.log(`    ${type}: ${count} events`);
    });
    
    if (archivedData.summary.duration_range.min !== Infinity) {
      console.log(`  Duration Range: ${archivedData.summary.duration_range.min}-${archivedData.summary.duration_range.max} minutes (avg: ${archivedData.summary.duration_range.avg} min)`);
    }
    
    // Test CSV export format
    console.log('\n📋 CSV Export Preview (first 5 events):');
    console.log('Timestamp,Asset Name,Event Type,Previous State,New State,Duration (minutes),Stop Reason');
    
    processedEvents.slice(0, 5).forEach(event => {
      const timestamp = new Date(event.timestamp).toLocaleString();
      const duration = event.duration_minutes || '';
      const previousState = event.previous_state || '';
      const newState = event.new_state || '';
      const stopReason = (event.stop_reason || '').replace(/,/g, ';'); // Replace commas to avoid CSV issues
      
      console.log(`"${timestamp}","${event.asset_name}","${event.event_type}","${previousState}","${newState}","${duration}","${stopReason}"`);
    });
    
    if (processedEvents.length > 5) {
      console.log(`... and ${processedEvents.length - 5} more events`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

createEventArchive();