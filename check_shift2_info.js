const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Cannot open database:', err.message);
        return;
    }
    console.log('Connected to database.sqlite');
});

// Check shifts table directly
console.log('=== Checking shifts table ===');
db.all("SELECT * FROM shifts WHERE id = 2", (err, rows) => {
    if (err) {
        console.error('Error querying shifts table:', err);
    } else if (rows.length > 0) {
        console.log('Found Shift ID 2 in shifts table:');
        rows.forEach(row => {
            console.log('ID:', row.id);
            console.log('Shift Name:', row.shift_name);
            console.log('Date:', row.date);
            console.log('Start Time:', row.start_time);
            console.log('End Time:', row.end_time);
            console.log('Status:', row.status);
            console.log('Created At:', row.created_at);
            console.log('Updated At:', row.updated_at);
            console.log('Full record:', JSON.stringify(row, null, 2));
        });
    } else {
        console.log('No shift found with ID 2 in shifts table');
    }
    
    // Also check archives table (lowercase)
    console.log('\n=== Checking archives table ===');
    db.all("SELECT id, type, archived_data FROM archives WHERE type = 'SHIFT_REPORT'", (err, rows) => {
        if (err) {
            console.error('Error querying archives table:', err);
        } else {
            console.log(`Found ${rows.length} shift reports in archives:`);
            rows.forEach(row => {
                try {
                    const archivedData = JSON.parse(row.archived_data);
                    const shiftInfo = archivedData.shift_info || {};
                    console.log(`Archive ID ${row.id}: Shift ID ${shiftInfo.id || 'unknown'}`);
                    
                    if (shiftInfo.id === 2) {
                        console.log('\n*** SHIFT ID 2 FOUND IN ARCHIVES ***');
                        console.log('Shift Name:', shiftInfo.shift_name);
                        console.log('Date:', shiftInfo.date);
                        console.log('Start Time:', shiftInfo.start_time);
                        console.log('End Time:', shiftInfo.end_time);
                        console.log('Status:', shiftInfo.status);
                        console.log('Full shift info:', JSON.stringify(shiftInfo, null, 2));
                    }
                } catch (e) {
                    console.log(`Archive ID ${row.id}: Could not parse archived_data`);
                }
            });
        }
        db.close();
    });
});