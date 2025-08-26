const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path (SQLite in development)
const dbPath = path.join(__dirname, 'database.sqlite');

async function checkArchivesSchema() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('🔍 Checking archives table schema...');
    
    // Get table schema
    db.all('PRAGMA table_info(archives)', (err, columns) => {
      if (err) {
        console.error('❌ Error getting archives schema:', err);
        db.close();
        return reject(err);
      }
      
      console.log('📋 Archives table schema:');
      columns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''} ${col.notnull ? '(NOT NULL)' : ''} ${col.dflt_value ? `(DEFAULT: ${col.dflt_value})` : ''}`);
      });
      
      // Get sample data
      db.all('SELECT * FROM archives LIMIT 5', (err, rows) => {
        if (err) {
          console.error('❌ Error getting sample data:', err);
        } else {
          console.log('\n📄 Sample data from archives table (first 5 rows):');
          if (rows.length === 0) {
            console.log('  (no data)');
          } else {
            rows.forEach((row, index) => {
              console.log(`\n  Row ${index + 1}:`);
              Object.keys(row).forEach(key => {
                console.log(`    ${key}: ${row[key]}`);
              });
            });
          }
        }
        
        // Get total count
        db.get('SELECT COUNT(*) as count FROM archives', (err, result) => {
          if (err) {
            console.error('❌ Error getting count:', err);
          } else {
            console.log(`\n📊 Total records in archives table: ${result.count}`);
          }
          
          db.close();
          resolve({
            columns: columns.map(col => ({ name: col.name, type: col.type, pk: col.pk })),
            sampleData: rows,
            totalCount: result ? result.count : 0
          });
        });
      });
    });
  });
}

// Run the schema check
checkArchivesSchema()
  .then(result => {
    console.log('\n🎉 Archives schema check completed!');
  })
  .catch(error => {
    console.error('❌ Error during schema check:', error);
    process.exit(1);
  });