const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'src', 'backend', 'database.sqlite');

async function checkShiftsSchema() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('🔍 Checking shifts table schema...');
    
    // Get table schema
    db.all(`PRAGMA table_info(shifts)`, (err, columns) => {
      if (err) {
        console.error('Error fetching table schema:', err);
        return reject(err);
      }
      
      console.log('\n📊 Shifts table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} (nullable: ${col.notnull === 0})`);
      });
      
      // Get all shifts with available columns
      db.all(`SELECT * FROM shifts ORDER BY id LIMIT 5`, (err, shifts) => {
        if (err) {
          console.error('Error fetching shifts:', err);
          return reject(err);
        }
        
        console.log(`\n📋 Sample shifts (showing first 5):`);
        shifts.forEach(shift => {
          console.log(`  - ID: ${shift.id}`);
          Object.keys(shift).forEach(key => {
            if (key !== 'id') {
              console.log(`    ${key}: ${shift[key]}`);
            }
          });
          console.log('');
        });
        
        db.close();
        resolve();
      });
    });
  });
}

// Run the script
if (require.main === module) {
  checkShiftsSchema()
    .then(() => {
      console.log('✅ Schema check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Schema check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkShiftsSchema };