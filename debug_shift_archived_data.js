const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');

console.log('🔍 Debugging Shift Report Analysis Structure');
console.log('==================================================');

// Open database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// Query shift report archives
db.all(`
  SELECT 
    id,
    title,
    archived_data,
    date_range_start,
    date_range_end
  FROM archives 
  WHERE archive_type = 'SHIFT_REPORT'
  ORDER BY created_at DESC
  LIMIT 1
`, [], (err, rows) => {
  if (err) {
    console.error('❌ Error querying archives:', err.message);
    return;
  }

  console.log(`\n📊 Examining latest shift report archive:\n`);

  const row = rows[0];
  if (row) {
    console.log(`Archive ID: ${row.id}`);
    console.log(`Title: ${row.title}`);
    console.log(`Date Range: ${row.date_range_start} to ${row.date_range_end}`);
    
    // Calculate duration
    const startTime = new Date(row.date_range_start);
    const endTime = new Date(row.date_range_end);
    const duration = endTime - startTime;
    console.log(`\n⏱️  Duration Calculation:`);
    console.log(`   Start: ${startTime}`);
    console.log(`   End: ${endTime}`);
    console.log(`   Duration (ms): ${duration}`);
    console.log(`   Duration (minutes): ${Math.round(duration / 60000)}`);
    
    // Parse and examine archived_data analysis
    try {
      const archivedData = JSON.parse(row.archived_data);
      
      if (archivedData.analysis) {
        console.log(`\n📊 Analysis Structure:`);
        console.log(`   Keys: ${Object.keys(archivedData.analysis).join(', ')}`);
        
        if (archivedData.analysis.performance_summary) {
          console.log(`\n   Performance Summary:`);
          Object.entries(archivedData.analysis.performance_summary).forEach(([key, value]) => {
            console.log(`     - ${key}: ${value}`);
          });
        } else {
          console.log(`\n   ⚠️  No performance_summary found in analysis`);
          
          // Show what's actually in analysis
          Object.entries(archivedData.analysis).forEach(([key, value]) => {
            console.log(`\n   Analysis.${key}:`);
            if (typeof value === 'object' && value !== null) {
              if (Array.isArray(value)) {
                console.log(`     [Array with ${value.length} items]`);
                if (value.length > 0) {
                  console.log(`     First item keys: ${Object.keys(value[0]).join(', ')}`);
                }
              } else {
                Object.entries(value).forEach(([subKey, subValue]) => {
                  console.log(`     - ${subKey}: ${subValue}`);
                });
              }
            } else {
              console.log(`     ${value}`);
            }
          });
        }
      } else {
        console.log(`\n⚠️  No analysis found in archived_data`);
      }
      
    } catch (parseError) {
      console.log(`\n❌ Error parsing archived_data: ${parseError.message}`);
    }
  }

  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('\n✅ Database connection closed');
    }
  });
});