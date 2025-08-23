const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration - using SQLite like the backend
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');

async function debugShiftData() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err.message);
        reject(err);
        return;
      }
      console.log('=== Debugging Shift Report Data ===\n');
    });
    
    // Query the archives table directly
    const query = `
      SELECT id, title, description, archive_type, 
             date_range_start, date_range_end, 
             archived_data
      FROM archives 
      WHERE archive_type = 'SHIFT_REPORT'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    db.get(query, (err, archive) => {
      if (err) {
        console.error('Query error:', err.message);
        db.close();
        reject(err);
        return;
      }
      
      if (!archive) {
        console.log('No shift report archives found.');
        db.close();
        resolve();
        return;
      }
      console.log('Archive ID:', archive.id);
      console.log('Title:', archive.title);
      console.log('Description:', archive.description);
      console.log('Date Range Start:', archive.date_range_start);
      console.log('Date Range End:', archive.date_range_end);
      console.log('\n--- Archived Data Structure ---');
      
      const archivedData = JSON.parse(archive.archived_data);
      console.log('Root keys:', Object.keys(archivedData));
      
      // Check for duration fields
      console.log('\n--- Duration Fields ---');
      console.log('archivedData.duration:', archivedData.duration);
      console.log('archivedData.start_time:', archivedData.start_time);
      console.log('archivedData.end_time:', archivedData.end_time);
      
      if (archivedData.generation_metadata) {
        console.log('generation_metadata.shift_duration_ms:', archivedData.generation_metadata.shift_duration_ms);
        console.log('generation_metadata keys:', Object.keys(archivedData.generation_metadata));
      }
      
      // Check shift_metrics
      if (archivedData.shift_metrics) {
        console.log('\n--- Shift Metrics ---');
        const metrics = archivedData.shift_metrics;
        console.log('shift_metrics keys:', Object.keys(metrics));
        console.log('availability:', metrics.availability);
        console.log('performance:', metrics.performance);
        console.log('quality:', metrics.quality);
        console.log('oee:', metrics.oee);
        console.log('total_runtime:', metrics.total_runtime);
        console.log('total_downtime:', metrics.total_downtime);
        console.log('total_stops:', metrics.total_stops);
      }
      
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        }
        resolve();
      });
    });
  });
}

debugShiftData();