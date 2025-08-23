const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database.sqlite');

async function checkEventsTable() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');
    });

    console.log('🔍 CHECKING EVENTS TABLE STRUCTURE AND DATA\n');

    // Get table schema
    db.all("PRAGMA table_info(events)", (err, columns) => {
      if (err) {
        console.error('❌ Error getting table info:', err.message);
        db.close();
        reject(err);
        return;
      }

      console.log('📋 EVENTS TABLE STRUCTURE:');
      columns.forEach(col => {
        console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });

      // Get recent events
      console.log('\n📊 RECENT EVENTS IN DATABASE:');
      db.all(`
        SELECT id, timestamp, asset_id, event_type, previous_state, new_state, duration, stop_reason, created_at
        FROM events 
        ORDER BY timestamp DESC 
        LIMIT 20
      `, (err, events) => {
        if (err) {
          console.error('❌ Error querying events:', err.message);
        } else {
          console.log(`   Found ${events.length} recent events`);
          
          if (events.length > 0) {
            events.forEach((event, index) => {
              console.log(`   ${index + 1}. ID: ${event.id}, Asset: ${event.asset_id}, Type: ${event.event_type}`);
              console.log(`      Timestamp: ${new Date(event.timestamp).toLocaleString()}`);
              console.log(`      State: ${event.previous_state || 'N/A'} → ${event.new_state || 'N/A'}`);
              if (event.duration) {
                console.log(`      Duration: ${Math.round(event.duration / (1000 * 60))} minutes`);
              }
              if (event.created_at) {
                console.log(`      Created: ${new Date(event.created_at).toLocaleString()}`);
              }
              console.log('');
            });
          } else {
            console.log('   No events found in database');
          }
        }

        // Check events around the archive time (19:52 - 19:55)
        console.log('\n🔍 EVENTS AROUND ARCHIVE TIME (19:52 - 19:55):');
        db.all(`
          SELECT id, timestamp, asset_id, event_type, previous_state, new_state, duration, stop_reason
          FROM events 
          WHERE datetime(timestamp) >= '2025-08-21 19:52:00' 
            AND datetime(timestamp) <= '2025-08-21 19:55:00'
          ORDER BY timestamp ASC
        `, (err, timeRangeEvents) => {
          if (err) {
            console.error('❌ Error querying time range events:', err.message);
          } else {
            console.log(`   Found ${timeRangeEvents.length} events in time range`);
            
            if (timeRangeEvents.length > 0) {
              timeRangeEvents.forEach((event, index) => {
                console.log(`   ${index + 1}. Asset ${event.asset_id} - ${event.event_type} at ${new Date(event.timestamp).toLocaleString()}`);
                if (event.previous_state || event.new_state) {
                  console.log(`      State: ${event.previous_state || 'N/A'} → ${event.new_state || 'N/A'}`);
                }
              });
            } else {
              console.log('   No events found in this time range');
            }
          }

          // Check assets table to understand asset names
          console.log('\n📋 ASSETS TABLE:');
          db.all(`
            SELECT id, name, type, status
            FROM assets 
            ORDER BY id
          `, (err, assets) => {
            if (err) {
              console.error('❌ Error querying assets:', err.message);
            } else {
              console.log(`   Found ${assets.length} assets`);
              assets.forEach(asset => {
                console.log(`   ID: ${asset.id}, Name: ${asset.name}, Type: ${asset.type}, Status: ${asset.status}`);
              });
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
        });
      });
    });
  });
}

checkEventsTable().then(() => {
  console.log('\n🔍 Events table check completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});