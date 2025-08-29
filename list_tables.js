const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'src', 'backend', 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// List all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('❌ Error querying tables:', err.message);
    return;
  }
  
  console.log('\n📋 Available tables:');
  tables.forEach(table => {
    console.log(`   - ${table.name}`);
  });
  
  // Check if we have an Assets table and get its schema
  const assetTable = tables.find(t => t.name.toLowerCase().includes('asset'));
  if (assetTable) {
    console.log(`\n🔍 Found asset table: ${assetTable.name}`);
    
    db.all(`PRAGMA table_info(${assetTable.name})`, (err, columns) => {
      if (err) {
        console.error('❌ Error getting table info:', err.message);
        return;
      }
      
      console.log(`\n📊 Columns in ${assetTable.name}:`);
      columns.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
      
      // Get asset data
      db.all(`SELECT * FROM ${assetTable.name} LIMIT 5`, (err, assets) => {
        if (err) {
          console.error('❌ Error querying assets:', err.message);
          return;
        }
        
        console.log(`\n🏭 Asset data:`);
        assets.forEach(asset => {
          console.log(`   Asset ID ${asset.id}: ${asset.name || 'N/A'} - Stops: ${asset.total_stops || 'N/A'}`);
        });
        
        db.close();
      });
    });
  } else {
    console.log('\n❌ No asset table found');
    db.close();
  }
});