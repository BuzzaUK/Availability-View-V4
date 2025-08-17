const path = require('path');
const databaseService = require('./src/backend/services/databaseService');

// Set environment to development to use SQLite
process.env.NODE_ENV = 'development';

async function testEventArchives() {
  try {
    console.log('🔍 Testing Event Archives Retrieval...');
    
    // Test 1: Get all archives from database service
    console.log('\n1. Testing databaseService.getAllArchives()...');
    const allArchives = await databaseService.getAllArchives();
    console.log(`Total archives found: ${allArchives.length}`);
    
    if (allArchives.length > 0) {
      console.log('Archive types found:', [...new Set(allArchives.map(a => a.archive_type))]);
      console.log('Sample archive:', {
        id: allArchives[0].id,
        title: allArchives[0].title,
        archive_type: allArchives[0].archive_type,
        created_at: allArchives[0].created_at
      });
    }
    
    // Test 2: Filter for EVENTS type archives (like the API does)
    console.log('\n2. Testing EVENTS type filtering...');
    const eventArchives = allArchives.filter(archive => archive.archive_type === 'EVENTS');
    console.log(`Event archives found: ${eventArchives.length}`);
    
    if (eventArchives.length > 0) {
      console.log('Event archives details:');
      eventArchives.forEach((archive, index) => {
        console.log(`  ${index + 1}. ${archive.title} (ID: ${archive.id}, Created: ${archive.created_at})`);
      });
    }
    
    // Test 3: Transform archives like the API does
    console.log('\n3. Testing archive transformation...');
    const transformedArchives = eventArchives.map(archive => ({
      id: archive.id,
      title: archive.title,
      description: archive.description,
      archive_type: archive.archive_type,
      date_range_start: archive.date_range_start,
      date_range_end: archive.date_range_end,
      file_size: archive.file_size,
      status: archive.status,
      created_at: archive.created_at,
      created_by: archive.created_by,
      event_count: archive.archived_data ? 
        (typeof archive.archived_data === 'string' ? 
          JSON.parse(archive.archived_data).event_count : 
          archive.archived_data.event_count) : 0
    }));
    
    console.log(`Transformed archives: ${transformedArchives.length}`);
    if (transformedArchives.length > 0) {
      console.log('Sample transformed archive:', transformedArchives[0]);
    }
    
    // Test 4: Check for any parsing issues with archived_data
    console.log('\n4. Testing archived_data parsing...');
    eventArchives.forEach((archive, index) => {
      try {
        if (archive.archived_data) {
          let eventCount = 0;
          if (typeof archive.archived_data === 'string') {
            const parsed = JSON.parse(archive.archived_data);
            eventCount = parsed.event_count || 0;
            console.log(`  Archive ${index + 1}: String data, event_count = ${eventCount}`);
          } else {
            eventCount = archive.archived_data.event_count || 0;
            console.log(`  Archive ${index + 1}: Object data, event_count = ${eventCount}`);
          }
        } else {
          console.log(`  Archive ${index + 1}: No archived_data`);
        }
      } catch (parseError) {
        console.log(`  Archive ${index + 1}: Parse error - ${parseError.message}`);
      }
    });
    
    console.log('\n✅ Event Archives test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing event archives:', error);
  } finally {
    process.exit(0);
  }
}

testEventArchives();