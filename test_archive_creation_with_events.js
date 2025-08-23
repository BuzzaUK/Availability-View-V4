const databaseService = require('./src/backend/services/databaseService');
const { sequelize } = require('./src/backend/config/database');

// Test archive creation with the newly generated events
async function testArchiveCreationWithEvents() {
  console.log('🗃️ TESTING ARCHIVE CREATION WITH GENERATED EVENTS');
  console.log('=' .repeat(55));
  
  try {
    // Wait for database to be ready
    await databaseService.initializeDatabase();
    
    // 1. Check current events
    console.log('\n📊 CURRENT DATABASE STATE:');
    const allEventsResult = await databaseService.getAllEvents();
    const allEvents = allEventsResult.rows || [];
    
    console.log(`Total events in database: ${allEvents.length}`);
    
    // Group by event type
    const eventTypeCounts = {};
    allEvents.forEach(event => {
      eventTypeCounts[event.event_type] = (eventTypeCounts[event.event_type] || 0) + 1;
    });
    
    console.log('\nEvent breakdown by type:');
    Object.entries(eventTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // 2. Get current shift
    const currentShift = await databaseService.getCurrentShift();
    if (!currentShift) {
      console.log('❌ No active shift found');
      return;
    }
    
    console.log(`\n🔄 Current shift: ${currentShift.shift_name} (ID: ${currentShift.id})`);
    console.log(`   Started: ${currentShift.start_time}`);
    
    // 3. Get events for current shift using different methods
    console.log('\n🔍 CHECKING SHIFT EVENTS WITH DIFFERENT QUERIES:');
    
    // Method 1: Using shift_id filter
    const shiftEventsById = await databaseService.getAllEvents({
      where: { shift_id: currentShift.id }
    });
    const eventsById = shiftEventsById.rows || [];
    console.log(`Method 1 - By shift_id: ${eventsById.length} events`);
    
    // Method 2: Using timestamp filter
    const shiftEventsByTime = await databaseService.getAllEvents({
      startDate: currentShift.start_time
    });
    const eventsByTime = shiftEventsByTime.rows || [];
    console.log(`Method 2 - By timestamp >= shift start: ${eventsByTime.length} events`);
    
    // Method 3: Raw SQL query to check shift_id assignment
    const [rawShiftEvents] = await sequelize.query(`
      SELECT 
        id, 
        asset_id, 
        event_type, 
        timestamp, 
        shift_id,
        created_at
      FROM events 
      WHERE shift_id = ?
      ORDER BY timestamp DESC
    `, {
      replacements: [currentShift.id]
    });
    
    console.log(`Method 3 - Raw SQL by shift_id: ${rawShiftEvents.length} events`);
    
    if (rawShiftEvents.length > 0) {
      console.log('\nShift events details:');
      rawShiftEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.event_type} - ${new Date(event.timestamp).toLocaleTimeString()} (shift_id: ${event.shift_id})`);
      });
    }
    
    // 4. Check if events have shift_id assigned
    const [allEventsWithShiftId] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(shift_id) as events_with_shift_id,
        COUNT(CASE WHEN shift_id IS NULL THEN 1 END) as events_without_shift_id
      FROM events
    `);
    
    const stats = allEventsWithShiftId[0];
    console.log('\n📈 SHIFT_ID ASSIGNMENT STATS:');
    console.log(`  Total events: ${stats.total_events}`);
    console.log(`  Events with shift_id: ${stats.events_with_shift_id}`);
    console.log(`  Events without shift_id: ${stats.events_without_shift_id}`);
    
    // 5. Test archive creation
    console.log('\n🗃️ TESTING ARCHIVE CREATION:');
    
    // Use the events that have shift_id assigned
    const eventsToArchive = eventsById.length > 0 ? eventsById : eventsByTime;
    
    if (eventsToArchive.length === 0) {
      console.log('❌ No events found for archiving');
      return;
    }
    
    console.log(`Attempting to archive ${eventsToArchive.length} events...`);
    
    // Create archive data structure
    const archiveData = {
      title: `Test Archive - ${currentShift.shift_name}`,
      description: `Manual test archive created at ${new Date().toLocaleString()}`,
      archive_type: 'EVENTS',
      created_by: 1, // Admin user ID
      archived_data: {
        shift_id: currentShift.id,
        shift_name: currentShift.shift_name,
        start_time: currentShift.start_time,
        end_time: null, // Shift is still active
        events: eventsToArchive.map(event => ({
          id: event.id,
          timestamp: event.timestamp,
          asset_id: event.asset_id,
          asset_name: event.asset ? event.asset.name : 'Unknown Asset',
          event_type: event.event_type,
          previous_state: event.previous_state,
          new_state: event.new_state,
          duration: event.duration,
          stop_reason: event.stop_reason,
          logger_id: event.logger_id
        })),
        event_count: eventsToArchive.length,
        summary: {
          total_events: eventsToArchive.length,
          event_types: eventTypeCounts,
          created_at: new Date().toISOString()
        }
      }
    };
    
    // Create the archive
    const archive = await databaseService.createArchive(archiveData);
    
    console.log('✅ Archive created successfully!');
    console.log(`   Archive ID: ${archive.id}`);
    console.log(`   Title: ${archive.title}`);
    console.log(`   Events archived: ${archiveData.archived_data.event_count}`);
    
    // 6. Verify archive contents
    console.log('\n🔍 VERIFYING ARCHIVE CONTENTS:');
    const createdArchive = await databaseService.findArchiveById(archive.id);
    
    if (createdArchive && createdArchive.archived_data) {
      const archivedEvents = createdArchive.archived_data.events || [];
      console.log(`Archive contains ${archivedEvents.length} events`);
      
      if (archivedEvents.length > 0) {
        console.log('\nArchived event types:');
        const archivedEventTypes = {};
        archivedEvents.forEach(event => {
          archivedEventTypes[event.event_type] = (archivedEventTypes[event.event_type] || 0) + 1;
        });
        
        Object.entries(archivedEventTypes).forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
        
        console.log('\nFirst few archived events:');
        archivedEvents.slice(0, 5).forEach((event, index) => {
          console.log(`  ${index + 1}. ${new Date(event.timestamp).toLocaleTimeString()} - ${event.asset_name} - ${event.event_type}`);
        });
      }
    }
    
    console.log('\n✅ ARCHIVE CREATION TEST COMPLETED!');
    console.log('\n💡 Key Findings:');
    console.log(`   - Total events in database: ${allEvents.length}`);
    console.log(`   - Events with shift_id: ${stats.events_with_shift_id}`);
    console.log(`   - Events archived: ${archiveData.archived_data.event_count}`);
    
    if (stats.events_without_shift_id > 0) {
      console.log(`   ⚠️  ${stats.events_without_shift_id} events don't have shift_id assigned`);
      console.log('   This could explain why some events are missing from archives');
    }
    
  } catch (error) {
    console.error('❌ Error testing archive creation:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testArchiveCreationWithEvents().catch(console.error);