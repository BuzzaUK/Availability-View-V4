const databaseService = require('./src/backend/services/databaseService');

(async () => {
  try {
    await databaseService.initialized;
    const archives = await databaseService.getAllArchives();
    const eventArchives = archives.filter(a => a.archive_type === 'EVENTS');
    
    console.log('Event Archives Analysis:');
    console.log('='.repeat(50));
    
    eventArchives.forEach(archive => {
      let eventCount = 0;
      let actualEvents = 0;
      let archiveData = null;
      
      if (archive.archived_data) {
        if (typeof archive.archived_data === 'string') {
          archiveData = JSON.parse(archive.archived_data);
        } else {
          archiveData = archive.archived_data;
        }
        
        eventCount = archiveData.event_count || 0;
        actualEvents = archiveData.events ? archiveData.events.length : 0;
      }
      
      console.log(`Archive: ${archive.title}`);
      console.log(`  - ID: ${archive.id}`);
      console.log(`  - Stored event_count: ${eventCount}`);
      console.log(`  - Actual events array length: ${actualEvents}`);
      console.log(`  - Match: ${eventCount === actualEvents ? 'YES' : 'NO'}`);
      
      if (archiveData && archiveData.events && archiveData.events.length > 0) {
        console.log(`  - First event: ${archiveData.events[0].asset_name} - ${archiveData.events[0].event_type}`);
        console.log(`  - Last event: ${archiveData.events[archiveData.events.length-1].asset_name} - ${archiveData.events[archiveData.events.length-1].event_type}`);
        
        // Count event types
        const eventTypes = {};
        archiveData.events.forEach(event => {
          eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
        });
        console.log(`  - Event types:`, eventTypes);
      }
      console.log('');
    });
    
    console.log(`Total Event Archives: ${eventArchives.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
})();