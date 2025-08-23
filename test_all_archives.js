const { Archive } = require('./src/backend/models/database/index');

async function testAllArchives() {
  try {
    console.log('🔍 Querying ALL archives in database...');
    
    const allArchives = await Archive.findAll({
      order: [['created_at', 'DESC']]
    });
    
    console.log('\n📊 Total archives found:', allArchives.length);
    
    allArchives.forEach((archive, index) => {
      console.log(`\n--- Archive ${index + 1} ---`);
      console.log('ID:', archive.id);
      console.log('Title:', archive.title);
      console.log('Archive Type:', archive.archive_type);
      console.log('Created At:', archive.created_at);
      console.log('Date Range Start:', archive.date_range_start);
      console.log('Date Range End:', archive.date_range_end);
      console.log('Status:', archive.status);
    });
    
    console.log('\n🔍 Filtering for SHIFT_REPORT archives only...');
    const shiftReports = allArchives.filter(archive => archive.archive_type === 'SHIFT_REPORT');
    
    console.log('\n📊 SHIFT_REPORT archives found:', shiftReports.length);
    
    shiftReports.forEach((archive, index) => {
      console.log(`\n--- SHIFT_REPORT ${index + 1} ---`);
      console.log('ID:', archive.id);
      console.log('Title:', archive.title);
      console.log('Created At:', archive.created_at);
      console.log('Date Range Start:', archive.date_range_start);
      console.log('Date Range End:', archive.date_range_end);
      
      if (archive.date_range_start && archive.date_range_end) {
        const duration = new Date(archive.date_range_end) - new Date(archive.date_range_start);
        console.log('Calculated Duration (ms):', duration);
      }
    });
    
    console.log('\n✅ Test completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error testing archives:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Add a small delay to let any initialization complete
setTimeout(testAllArchives, 1000);