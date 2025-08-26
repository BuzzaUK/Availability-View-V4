const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path (SQLite in development)
const dbPath = path.join(__dirname, 'database.sqlite');

async function listTables() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('🔍 Listing all tables in the database...');
    
    // Get all table names
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('❌ Error fetching tables:', err);
        db.close();
        return reject(err);
      }
      
      console.log('📊 Available tables:');
      tables.forEach(table => {
        console.log(`  - ${table.name}`);
      });
      
      // For each table, get its schema
      let completed = 0;
      const totalTables = tables.length;
      
      if (totalTables === 0) {
        console.log('❌ No tables found in database');
        db.close();
        return resolve([]);
      }
      
      tables.forEach(table => {
        db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
          if (err) {
            console.error(`❌ Error getting schema for ${table.name}:`, err);
          } else {
            console.log(`\n📋 Schema for table '${table.name}':`);
            columns.forEach(col => {
              console.log(`  - ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''}`);
            });
            
            // Get sample data
            db.all(`SELECT * FROM ${table.name} LIMIT 3`, (err, rows) => {
              if (err) {
                console.error(`❌ Error getting sample data for ${table.name}:`, err);
              } else {
                console.log(`\n📄 Sample data from '${table.name}' (first 3 rows):`);
                if (rows.length === 0) {
                  console.log('  (no data)');
                } else {
                  rows.forEach((row, index) => {
                    console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
                  });
                }
              }
              
              completed++;
              if (completed === totalTables) {
                db.close();
                resolve(tables.map(t => t.name));
              }
            });
          }
        });
      });
    });
  });
}

// Run the table listing
listTables()
  .then(tableNames => {
    console.log('\n🎉 Database inspection completed!');
    console.log('Table names:', tableNames);
  })
  .catch(error => {
    console.error('❌ Error during inspection:', error);
    process.exit(1);
  });