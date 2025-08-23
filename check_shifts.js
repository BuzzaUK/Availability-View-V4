const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 CHECKING COMPLETED SHIFTS');
console.log('============================================================');

db.all(`
    SELECT id, shift_name, start_time, end_time 
    FROM shifts 
    WHERE end_time IS NOT NULL 
    ORDER BY start_time DESC 
    LIMIT 5
`, (err, rows) => {
    if (err) {
        console.error('❌ Error:', err.message);
    } else {
        console.log(`Found ${rows.length} completed shifts:`);
        rows.forEach((shift, i) => {
            console.log(`  ${i+1}. ID: ${shift.id}, Name: ${shift.shift_name}`);
            console.log(`     Start: ${shift.start_time}`);
            console.log(`     End: ${shift.end_time}`);
            console.log('');
        });
    }
    db.close();
});