const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking for shift reports matching screenshot timestamps...');

// Check for specific shifts from the screenshot
// First shift: Auto-started - 24/08/2025, 19:34:08 - 24/08/2025 22:00
// Second shift: Shift 2 - Sun Aug 24 2025 - 24/08/2025 14:00 to 19:27

db.all(`SELECT id, title, description, date_range_start, date_range_end, created_at, archived_data 
        FROM archives 
        WHERE archive_type = 'SHIFT_REPORT' 
        ORDER BY created_at DESC`, (err, archives) => {
    if (err) {
        console.error('Error querying archives:', err);
        db.close();
        return;
    }
    
    console.log(`\nFound ${archives.length} shift reports in archives:`);
    
    let foundMatches = [];
    
    archives.forEach((archive, index) => {
        console.log(`\n--- Archive ${index + 1} ---`);
        console.log('Archive ID:', archive.id);
        console.log('Title:', archive.title);
        console.log('Description:', archive.description);
        console.log('Date Range Start:', archive.date_range_start);
        console.log('Date Range End:', archive.date_range_end);
        console.log('Created At:', archive.created_at);
        
        try {
            const archivedData = JSON.parse(archive.archived_data);
            if (archivedData.shift_info) {
                const startTime = archivedData.shift_info.start_time;
                const endTime = archivedData.shift_info.end_time;
                
                console.log('Shift Start Time:', startTime);
                console.log('Shift End Time:', endTime);
                
                // Check for matches with screenshot data
                // Looking for 24/08/2025 dates and specific times
                if (startTime && endTime) {
                    // Check for Auto-started shift (19:34 to 22:00 on 24/08/2025)
                    if ((startTime.includes('2025-08-24') && startTime.includes('19:34')) ||
                        (endTime.includes('2025-08-24') && endTime.includes('22:00'))) {
                        console.log('*** MATCHES AUTO-STARTED SHIFT FROM SCREENSHOT ***');
                        foundMatches.push('Auto-started shift');
                    }
                    
                    // Check for Shift 2 (14:00 to 19:27 on 24/08/2025)
                    if ((startTime.includes('2025-08-24') && startTime.includes('14:00')) ||
                        (endTime.includes('2025-08-24') && endTime.includes('19:27'))) {
                        console.log('*** MATCHES SHIFT 2 FROM SCREENSHOT ***');
                        foundMatches.push('Shift 2');
                    }
                    
                    // General check for any 24/08/2025 data
                    if (startTime.includes('2025-08-24') || endTime.includes('2025-08-24')) {
                        console.log('*** CONTAINS 24/08/2025 DATA ***');
                        foundMatches.push('24/08/2025 data');
                    }
                }
            }
        } catch (e) {
            console.log('Could not parse archived_data:', e.message);
        }
    });
    
    console.log('\n=== SUMMARY ===');
    if (foundMatches.length > 0) {
        console.log('Found matches for:', foundMatches.join(', '));
    } else {
        console.log('NO MATCHES FOUND for screenshot data');
        console.log('The shift reports in the screenshot may be:');
        console.log('1. Test/demo data not stored in database');
        console.log('2. Data from a different database or environment');
        console.log('3. Frontend display issue showing incorrect data');
    }
    
    db.close();
});