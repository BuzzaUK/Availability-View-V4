const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function debugEventArchiveData() {
  try {
    console.log('🔍 Debugging Event Archive Data...');
    
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
      console.log(`Created: ${archive.created_at}`);
      console.log(`Description: ${archive.description}`);
      
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
        
        console.log(`Event count (metadata): ${parsedData.event_count || 'Not specified'}`);
        
        if (parsedData.events) {
          console.log(`Actual events array length: ${parsedData.events.length}`);
          
          if (parsedData.events.length > 0) {
            console.log('\n📋 Sample events:');
            parsedData.events.slice(0, 5).forEach((event, eventIndex) => {
              console.log(`  ${eventIndex + 1}. ${event.asset_name || 'Unknown'} - ${event.event_type} at ${new Date(event.timestamp).toLocaleString()}`);
            });
            
            if (parsedData.events.length > 5) {
              console.log(`  ... and ${parsedData.events.length - 5} more events`);
            }
          }
          
          // Check if there's a mismatch between event_count and actual events
          if (parsedData.event_count !== parsedData.events.length) {
            console.log(`⚠️  MISMATCH: event_count (${parsedData.event_count}) != actual events (${parsedData.events.length})`);
          }
        } else {
          console.log('❌ No events array found in archived_data');
        }
        
        // Show other data structure info
        console.log('\n🏗️  Data structure:');
        Object.keys(parsedData).forEach(key => {
          if (key !== 'events') {
            const value = parsedData[key];
            if (typeof value === 'object' && value !== null) {
              console.log(`  ${key}: [Object with ${Object.keys(value).length} properties]`);
            } else {
              console.log(`  ${key}: ${value}`);
            }
          }
        });
        
      } catch (parseError) {
        console.log('❌ Error parsing archived_data:', parseError.message);
        console.log('Raw data type:', typeof archive.archived_data);
        console.log('Raw data preview:', String(archive.archived_data).substring(0, 200) + '...');
      }
    });
    
    // Test CSV export logic on the first archive
    if (archives.length > 0) {
      console.log('\n🧪 Testing CSV Export Logic...');
      const testArchive = archives[0];
      
      try {
        let events = [];
        if (testArchive.archived_data) {
          if (typeof testArchive.archived_data === 'string') {
            const parsedData = JSON.parse(testArchive.archived_data);
            events = parsedData.events || [];
          } else {
            events = testArchive.archived_data.events || [];
          }
        }
        
        console.log(`CSV Export would process ${events.length} events`);
        
        if (events.length > 0) {
          console.log('\n📄 CSV Headers would be:');
          console.log('Timestamp,Asset Name,Event Type,Previous State,New State,Duration (minutes),Stop Reason');
          
          console.log('\n📄 Sample CSV rows:');
          events.slice(0, 3).forEach((event, index) => {
            const row = [
              new Date(event.timestamp).toLocaleString(),
              event.asset_name || 'Unknown',
              event.event_type || '',
              event.previous_state || '',
              event.new_state || '',
              event.duration ? (event.duration / 60000).toFixed(2) : '',
              event.stop_reason || ''
            ];
            console.log(`  Row ${index + 1}: ${row.map(cell => `"${cell}"`).join(',')}`);
          });
        }
        
      } catch (csvError) {
        console.log('❌ Error in CSV export logic:', csvError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

debugEventArchiveData();