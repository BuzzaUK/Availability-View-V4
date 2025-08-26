const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking archives table schema...');

// First check the schema
db.all('PRAGMA table_info(archives)', (err, columns) => {
    if (err) {
        console.error('Error getting schema:', err);
        return;
    }
    
    console.log('Archives table columns:');
    columns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}`);
    });
    console.log('\n---\n');
    
    // Check all archives first
    db.all('SELECT archive_type, COUNT(*) as count FROM archives GROUP BY archive_type', (err, types) => {
        if (err) {
            console.error('Error getting archive types:', err);
            return;
        }
        
        console.log('Archive types and counts:');
        types.forEach(type => {
            console.log(`  - ${type.archive_type}: ${type.count}`);
        });
        console.log('\n---\n');
        
        // Now get the actual shift report data
         db.all('SELECT * FROM archives WHERE archive_type = "SHIFT_REPORT" ORDER BY id DESC LIMIT 10', (err, rows) => {
            if (err) {
                console.error('Error:', err);
                return;
            }
            
            console.log(`Found ${rows.length} shift archives:`);
            rows.forEach(row => {
                console.log(`Archive ID: ${row.id}`);
                console.log(`  - Archive Type: ${row.archive_type}`);
                console.log(`  - Title: ${row.title || 'No title'}`);
                console.log(`  - Created: ${row.created_at}`);
                
                if (row.archived_data) {
                    try {
                        const data = JSON.parse(row.archived_data);
                        console.log(`  - Archived data shift_id: ${data.shift_id}`);
                        console.log(`  - Report title: ${data.title || 'No title'}`);
                        console.log(`  - Start time: ${data.start_time || 'No start time'}`);
                        console.log(`  - End time: ${data.end_time || 'No end time'}`);
                    } catch (e) {
                        console.log(`  - Error parsing archived_data: ${e.message}`);
                    }
                }
                console.log('---');
            });
            
            // Also check if there are any other archive types that might contain shift data
            db.all('SELECT * FROM archives ORDER BY id DESC LIMIT 5', (err, allRows) => {
                if (err) {
                    console.error('Error getting all archives:', err);
                    return;
                }
                
                console.log('\nRecent archives of any type:');
                allRows.forEach(row => {
                    console.log(`Archive ID: ${row.id}, Type: ${row.archive_type}, Title: ${row.title}`);
                });
                
                db.close();
            });
        });
    });
});