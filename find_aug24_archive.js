const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Cannot open database:', err.message);
        return;
    }
    console.log('Connected to database.sqlite');
});

// Get all archives and look for one created around 22:00 on Aug 24
db.all('SELECT id, created_at, archived_data FROM archives ORDER BY created_at DESC', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log(`Found ${rows.length} total archives:`);
        console.log('\n=== All Archives ===');
        
        rows.forEach(row => {
            try {
                const archivedData = JSON.parse(row.archived_data);
                const shiftInfo = archivedData.shift_info || {};
                const createdDate = new Date(row.created_at);
                const timeStr = createdDate.getHours().toString().padStart(2, '0') + ':' + 
                               createdDate.getMinutes().toString().padStart(2, '0');
                const dateStr = createdDate.toDateString();
                
                console.log(`Archive ID: ${row.id}`);
                console.log(`Created At: ${row.created_at}`);
                console.log(`Date: ${dateStr}`);
                console.log(`Time: ${timeStr}`);
                console.log(`Shift ID: ${shiftInfo.id || 'unknown'}`);
                console.log(`Shift Name: ${shiftInfo.shift_name || 'unknown'}`);
                
                // Check if this matches Aug 24 at 22:00
                if (dateStr.includes('Aug 24') && timeStr === '22:00') {
                    console.log('*** THIS IS THE ARCHIVE CREATED AT 22:00 ON AUG 24! ***');
                }
                
                console.log('---');
            } catch (e) {
                console.log(`Archive ID: ${row.id}`);
                console.log(`Created At: ${row.created_at}`);
                console.log('Could not parse archived_data');
                console.log('---');
            }
        });
    }
    db.close();
});