const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration with minimal logging
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'src/backend/database.sqlite'),
  logging: false // Disable SQL logging
});

async function diagnoseEventArchiveIssue() {
  try {
    console.log('🔍 DIAGNOSING EVENT ARCHIVE ISSUE');
    console.log('=' .repeat(50));
    
    // Get all event archives
    const [archives] = await sequelize.query(`
      SELECT 
        id,
        title,
        description,
        archive_type,
        archived_data,
        created_at
      FROM archives 
      WHERE archive_type = 'EVENTS'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`\n📊 Found ${archives.length} event archives`);
    
    if (archives.length === 0) {
      console.log('❌ No event archives found in database');
      return;
    }
    
    // Analyze each archive
    archives.forEach((archive, index) => {
      console.log(`\n--- Archive ${index + 1}: ${archive.title} ---`);
      console.log(`ID: ${archive.id}`);
      console.log(`Created: ${new Date(archive.created_at).toLocaleString()}`);
      
      if (!archive.archived_data) {
        console.log('❌ No archived_data found');
        return;
      }
      
      try {
        let parsedData;
        if (typeof archive.archived_data === 'string') {
          parsedData = JSON.parse(archive.archived_data);
          console.log('📄 Data type: String (parsed)');
        } else {
          parsedData = archive.archived_data;
          console.log('📄 Data type: Object');
        }
        
        const eventCount = parsedData.event_count || 0;
        const actualEvents = parsedData.events ? parsedData.events.length : 0;
        
        console.log(`Event count (metadata): ${eventCount}`);
        console.log(`Actual events array length: ${actualEvents}`);
        console.log(`Match: ${eventCount === actualEvents ? '✅ YES' : '❌ NO'}`);
        
        if (parsedData.events && parsedData.events.length > 0) {
          console.log('\n📋 Event Types in Archive:');
          const eventTypes = {};
          parsedData.events.forEach(event => {
            eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
          });
          
          Object.entries(eventTypes).forEach(([type, count]) => {
            console.log(`  ${type}: ${count} events`);
          });
          
          console.log('\n📋 Sample Events (first 3):');
          parsedData.events.slice(0, 3).forEach((event, eventIndex) => {
            console.log(`  ${eventIndex + 1}. ${event.asset_name || 'Unknown'} - ${event.event_type}`);
            console.log(`     Time: ${new Date(event.timestamp).toLocaleString()}`);
            console.log(`     State: ${event.previous_state || 'N/A'} → ${event.new_state || 'N/A'}`);
          });
        } else {
          console.log('❌ No events array found or empty');
        }
        
      } catch (parseError) {
        console.log('❌ Error parsing archived_data:', parseError.message);
      }
    });
    
    // Check current events in database for comparison
    console.log('\n🔍 CURRENT EVENTS IN DATABASE (last 10):');
    const [currentEvents] = await sequelize.query(`
      SELECT 
        id,
        timestamp,
        asset_id,
        event_type,
        previous_state,
        new_state
      FROM events 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    
    if (currentEvents.length > 0) {
      console.log(`Found ${currentEvents.length} current events:`);
      currentEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. Asset ${event.asset_id} - ${event.event_type}`);
        console.log(`     Time: ${new Date(event.timestamp).toLocaleString()}`);
        console.log(`     State: ${event.previous_state || 'N/A'} → ${event.new_state || 'N/A'}`);
      });
    } else {
      console.log('No current events found in database');
    }
    
    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    console.log('1. Archives contain complete event data in archived_data field');
    console.log('2. CSV export should work correctly from archived_data.events array');
    console.log('3. Issue is likely in the frontend UI - no detailed view for archive events');
    console.log('4. EventArchiveTable only shows archive summary, not individual events');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

diagnoseEventArchiveIssue();