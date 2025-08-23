const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path - using the same path as the backend configuration
const dbPath = path.join(__dirname, 'database.sqlite');

async function verifyEventCount() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err.message);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');
    });

    // Get the most recent event archive
    db.get(`
      SELECT id, title, archived_data, created_at
      FROM archives 
      WHERE archive_type = 'EVENTS'
      ORDER BY created_at DESC 
      LIMIT 1
    `, (err, archive) => {
      if (err) {
        console.error('❌ Error querying archives:', err.message);
        db.close();
        reject(err);
        return;
      }

      if (!archive) {
        console.log('❌ No event archives found');
        db.close();
        resolve();
        return;
      }

      console.log('\n📁 Most Recent Event Archive:');
      console.log(`   Title: ${archive.title}`);
      console.log(`   ID: ${archive.id}`);
      console.log(`   Created: ${new Date(archive.created_at).toLocaleString()}`);

      try {
        const archivedData = typeof archive.archived_data === 'string' 
          ? JSON.parse(archive.archived_data) 
          : archive.archived_data;

        console.log('\n📊 Archived Data Structure:');
        console.log(`   event_count: ${archivedData.event_count}`);
        console.log(`   eventCount: ${archivedData.eventCount}`);
        console.log(`   events array length: ${archivedData.events ? archivedData.events.length : 'N/A'}`);
        console.log(`   total_events in summary: ${archivedData.summary ? archivedData.summary.total_events : 'N/A'}`);

        // Check if there's a mismatch
        const actualEventCount = archivedData.events ? archivedData.events.length : 0;
        const storedEventCount = archivedData.event_count || 0;
        
        if (actualEventCount !== storedEventCount) {
          console.log(`\n⚠️  MISMATCH DETECTED:`);
          console.log(`   Stored event_count: ${storedEventCount}`);
          console.log(`   Actual events array length: ${actualEventCount}`);
        } else {
          console.log(`\n✅ Event count is consistent: ${actualEventCount} events`);
        }

      } catch (parseError) {
        console.error('❌ Error parsing archived_data:', parseError.message);
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
}

verifyEventCount().then(() => {
  console.log('\n🔍 Event count verification completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});