const databaseService = require('./src/backend/services/databaseService');

async function debugSequelizeJSON() {
  console.log('=== Debugging Sequelize JSON Parsing ===\n');
  
  try {
    const allArchives = await databaseService.getAllArchives();
    const shiftReports = allArchives.filter(archive => archive.archive_type === 'SHIFT_REPORT');
    
    if (shiftReports.length > 0) {
      const archive = shiftReports[0];
      
      console.log('Archive ID:', archive.id);
      console.log('Archive Title:', archive.title);
      console.log('Archive Type:', archive.archive_type);
      console.log('\nRaw archived_data:');
      console.log('Type:', typeof archive.archived_data);
      console.log('Constructor:', archive.archived_data?.constructor?.name);
      console.log('Is Array:', Array.isArray(archive.archived_data));
      console.log('Keys:', Object.keys(archive.archived_data || {}));
      
      console.log('\nFull archived_data object:');
      console.log(JSON.stringify(archive.archived_data, null, 2));
      
      console.log('\nDirect property access:');
      console.log('duration:', archive.archived_data?.duration);
      console.log('start_time:', archive.archived_data?.start_time);
      console.log('end_time:', archive.archived_data?.end_time);
      console.log('availability:', archive.archived_data?.availability);
      console.log('events_processed:', archive.archived_data?.events_processed);
      
      // Check if it's a nested structure
      console.log('\nChecking for nested structures:');
      if (archive.archived_data && typeof archive.archived_data === 'object') {
        for (const [key, value] of Object.entries(archive.archived_data)) {
          console.log(`${key}:`, typeof value, Array.isArray(value) ? '[Array]' : '');
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            console.log(`  ${key} keys:`, Object.keys(value));
          }
        }
      }
      
    } else {
      console.log('No shift reports found');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugSequelizeJSON().then(() => {
  console.log('\n=== Debug Complete ===');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});