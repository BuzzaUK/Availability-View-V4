const databaseService = require('./src/backend/services/databaseService');

(async () => {
  try {
    console.log('Checking archives...');
    const archives = await databaseService.getAllArchives();
    console.log('Total archives found:', archives.length);
    
    archives.forEach((archive, index) => {
      console.log(`Archive ${index + 1}:`);
      console.log(`  ID: ${archive.id}`);
      console.log(`  Type: ${archive.archive_type}`);
      console.log(`  Title: ${archive.title}`);
      console.log(`  Created: ${archive.created_at}`);
      console.log(`  Status: ${archive.status}`);
      console.log('---');
    });
    
    // Check specifically for SHIFT_REPORT and EVENTS types
    const shiftReports = archives.filter(a => a.archive_type === 'SHIFT_REPORT');
    const eventArchives = archives.filter(a => a.archive_type === 'EVENTS');
    
    console.log(`\nShift Reports: ${shiftReports.length}`);
    console.log(`Event Archives: ${eventArchives.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();