const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database.sqlite');

async function analyzeArchiveIssue() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');
    });

    console.log('🔍 ANALYZING ARCHIVE CREATION ISSUE\n');

    // Get assets table structure first
    db.all("PRAGMA table_info(assets)", (err, assetColumns) => {
      if (err) {
        console.error('❌ Error getting assets table info:', err.message);
      } else {
        console.log('📋 ASSETS TABLE STRUCTURE:');
        assetColumns.forEach(col => {
          console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
      }

      // Get assets data
      db.all(`SELECT id, name, type FROM assets ORDER BY id`, (err, assets) => {
        if (err) {
          console.error('❌ Error querying assets:', err.message);
        } else {
          console.log('\n📋 ASSETS:');
          assets.forEach(asset => {
            console.log(`   ID: ${asset.id}, Name: ${asset.name}, Type: ${asset.type}`);
          });
        }

        // Analyze the archive creation timing issue
        console.log('\n🔍 ARCHIVE TIMING ANALYSIS:');
        
        // Get the archive details again
        db.get(`
          SELECT id, title, archived_data, created_at, date_range_start, date_range_end
          FROM archives 
          WHERE id = 69
        `, (err, archive) => {
          if (err) {
            console.error('❌ Error querying archive:', err.message);
            db.close();
            reject(err);
            return;
          }

          console.log(`Archive ID 69 created at: ${new Date(archive.created_at).toLocaleString()}`);
          console.log(`Archive date range: ${new Date(archive.date_range_start).toLocaleString()} - ${new Date(archive.date_range_end).toLocaleString()}`);
          
          // Get events created around the same time
          console.log('\n📊 EVENTS CREATED AROUND ARCHIVE TIME:');
          db.all(`
            SELECT id, timestamp, asset_id, event_type, previous_state, new_state, created_at
            FROM events 
            WHERE datetime(created_at) >= '2025-08-21 19:54:00' 
              AND datetime(created_at) <= '2025-08-21 19:55:00'
            ORDER BY created_at ASC
          `, (err, recentEvents) => {
            if (err) {
              console.error('❌ Error querying recent events:', err.message);
            } else {
              console.log(`   Found ${recentEvents.length} events created around archive time`);
              
              recentEvents.forEach((event, index) => {
                console.log(`   ${index + 1}. ID: ${event.id}, Asset: ${event.asset_id}, Type: ${event.event_type}`);
                console.log(`      Event Timestamp: ${new Date(event.timestamp).toLocaleString()}`);
                console.log(`      Created At: ${new Date(event.created_at).toLocaleString()}`);
                console.log(`      State: ${event.previous_state || 'N/A'} → ${event.new_state || 'N/A'}`);
                console.log('');
              });
            }

            // Parse and analyze the archived data
            try {
              const archivedData = typeof archive.archived_data === 'string' 
                ? JSON.parse(archive.archived_data) 
                : archive.archived_data;

              console.log('\n🔍 ARCHIVED EVENTS ANALYSIS:');
              console.log(`   Archive contains ${archivedData.events.length} events`);
              
              archivedData.events.forEach((event, index) => {
                console.log(`   ${index + 1}. ${event.asset_name} (Asset ID: ${event.asset_id || 'N/A'}) - ${event.event_type}`);
                console.log(`      Timestamp: ${new Date(event.timestamp).toLocaleString()}`);
                console.log(`      State: ${event.previous_state || 'N/A'} → ${event.new_state || 'N/A'}`);
                console.log('');
              });

              // Check if these events exist in the database
              console.log('\n🔍 CHECKING IF ARCHIVED EVENTS EXIST IN DATABASE:');
              
              const archiveEventPromises = archivedData.events.map((archivedEvent, index) => {
                return new Promise((resolve) => {
                  db.get(`
                    SELECT id, timestamp, asset_id, event_type
                    FROM events 
                    WHERE datetime(timestamp) = datetime(?)
                      AND asset_id = ?
                      AND event_type = ?
                  `, [archivedEvent.timestamp, archivedEvent.asset_id, archivedEvent.event_type], (err, dbEvent) => {
                    if (err) {
                      console.log(`   ${index + 1}. ❌ Error checking event: ${err.message}`);
                    } else if (dbEvent) {
                      console.log(`   ${index + 1}. ✅ Found in DB: Event ID ${dbEvent.id}`);
                    } else {
                      console.log(`   ${index + 1}. ❌ NOT found in DB: ${archivedEvent.asset_name} - ${archivedEvent.event_type} at ${new Date(archivedEvent.timestamp).toLocaleString()}`);
                    }
                    resolve();
                  });
                });
              });

              Promise.all(archiveEventPromises).then(() => {
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
      });
    });
  });
}

analyzeArchiveIssue().then(() => {
  console.log('\n🔍 Archive issue analysis completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});