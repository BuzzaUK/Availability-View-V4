const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database.sqlite');

async function investigateArchive1954() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');
    });

    console.log('🔍 INVESTIGATING ARCHIVE CREATED AT 19:54\n');

    // Get the specific archive ID 69 (created at 19:54:14)
    db.get(`
      SELECT id, title, description, archived_data, created_at, date_range_start, date_range_end
      FROM archives 
      WHERE archive_type = 'EVENTS'
        AND id = 69
    `, (err, archive) => {
      if (err) {
        console.error('❌ Error querying archive:', err.message);
        db.close();
        reject(err);
        return;
      }

      if (!archive) {
        console.log('❌ No archive found created at 19:54');
        
        // Get all archives to see what's available
        db.all(`
          SELECT id, title, created_at
          FROM archives 
          WHERE archive_type = 'EVENTS'
          ORDER BY created_at DESC
        `, (err, allArchives) => {
          if (err) {
            console.error('❌ Error querying all archives:', err.message);
          } else {
            console.log('\n📋 Available Event Archives:');
            allArchives.forEach(arch => {
              console.log(`   ID: ${arch.id}, Title: ${arch.title}, Created: ${new Date(arch.created_at).toLocaleString()}`);
            });
          }
          db.close();
          resolve();
        });
        return;
      }

      console.log('📁 ARCHIVE DETAILS:');
      console.log(`   ID: ${archive.id}`);
      console.log(`   Title: ${archive.title}`);
      console.log(`   Description: ${archive.description || 'N/A'}`);
      console.log(`   Created: ${new Date(archive.created_at).toLocaleString()}`);
      console.log(`   Date Range: ${new Date(archive.date_range_start).toLocaleString()} - ${new Date(archive.date_range_end).toLocaleString()}`);

      try {
        const archivedData = typeof archive.archived_data === 'string' 
          ? JSON.parse(archive.archived_data) 
          : archive.archived_data;

        console.log('\n📊 ARCHIVED DATA ANALYSIS:');
        console.log(`   event_count: ${archivedData.event_count}`);
        console.log(`   events array length: ${archivedData.events ? archivedData.events.length : 'N/A'}`);
        console.log(`   shift_id: ${archivedData.shift_id}`);
        console.log(`   shift_name: ${archivedData.shift_name}`);
        
        if (archivedData.summary) {
          console.log(`   summary.total_events: ${archivedData.summary.total_events}`);
          console.log(`   summary.event_types: ${JSON.stringify(archivedData.summary.event_types)}`);
          console.log(`   summary.assets_involved: ${JSON.stringify(archivedData.summary.assets_involved)}`);
        }

        // Show the actual events in the archive
        if (archivedData.events && archivedData.events.length > 0) {
          console.log('\n📋 EVENTS IN ARCHIVE:');
          archivedData.events.forEach((event, index) => {
            console.log(`   ${index + 1}. ${event.asset_name || 'Unknown'} - ${event.event_type} at ${new Date(event.timestamp).toLocaleString()}`);
            if (event.previous_state || event.new_state) {
              console.log(`      State: ${event.previous_state || 'N/A'} → ${event.new_state || 'N/A'}`);
            }
            if (event.duration_minutes) {
              console.log(`      Duration: ${event.duration_minutes} minutes`);
            }
          });
        } else {
          console.log('\n❌ NO EVENTS FOUND IN ARCHIVE');
        }

        // Now check what events were actually available during the archive's date range
        console.log('\n🔍 CHECKING ACTUAL EVENTS IN DATABASE FOR SAME TIME RANGE:');
        
        db.all(`
          SELECT id, timestamp, asset_id, event_type, previous_state, new_state, duration, stop_reason
          FROM events 
          WHERE timestamp >= ? AND timestamp <= ?
          ORDER BY timestamp ASC
        `, [archive.date_range_start, archive.date_range_end], (err, actualEvents) => {
          if (err) {
            console.error('❌ Error querying actual events:', err.message);
          } else {
            console.log(`   Found ${actualEvents.length} events in database for the same time range`);
            
            if (actualEvents.length > 0) {
              console.log('\n📋 ACTUAL EVENTS IN DATABASE:');
              actualEvents.forEach((event, index) => {
                console.log(`   ${index + 1}. Asset ${event.asset_id} - ${event.event_type} at ${new Date(event.timestamp).toLocaleString()}`);
                if (event.previous_state || event.new_state) {
                  console.log(`      State: ${event.previous_state || 'N/A'} → ${event.new_state || 'N/A'}`);
                }
                if (event.duration) {
                  console.log(`      Duration: ${Math.round(event.duration / (1000 * 60))} minutes`);
                }
              });
              
              // Compare counts
              const archivedCount = archivedData.events ? archivedData.events.length : 0;
              const actualCount = actualEvents.length;
              
              if (archivedCount !== actualCount) {
                console.log(`\n⚠️  DISCREPANCY DETECTED:`);
                console.log(`   Events in archive: ${archivedCount}`);
                console.log(`   Events in database for same period: ${actualCount}`);
                console.log(`   Missing events: ${actualCount - archivedCount}`);
              } else {
                console.log(`\n✅ Event counts match: ${actualCount} events`);
              }
            } else {
              console.log('   No events found in database for this time range');
            }
          }
          
          db.close((err) => {
            if (err) {
              console.error('❌ Error closing database:', err.message);
            } else {
              console.log('\n✅ Database connection closed');
            }
            resolve();
          });
        });

      } catch (parseError) {
        console.error('❌ Error parsing archived_data:', parseError.message);
        db.close();
        reject(parseError);
      }
    });
  });
}

investigateArchive1954().then(() => {
  console.log('\n🔍 Archive investigation completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});