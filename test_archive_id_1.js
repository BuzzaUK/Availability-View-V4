const { Archive } = require('./src/backend/models/database/index');

async function testArchiveId1() {
  try {
    console.log('=== Testing Archive ID 1 ===\n');
    
    // Get archive with ID 1 (the one returned by API)
    const archive = await Archive.findByPk(1);
    
    if (archive) {
      console.log('Archive ID:', archive.id);
      console.log('Title:', archive.title);
      console.log('Archive Type:', archive.archive_type);
      console.log('date_range_start:', archive.date_range_start);
      console.log('date_range_end:', archive.date_range_end);
      console.log('date_range_end type:', typeof archive.date_range_end);
      console.log('date_range_end is null:', archive.date_range_end === null);
      
      if (archive.date_range_start && archive.date_range_end) {
        const start = new Date(archive.date_range_start);
        const end = new Date(archive.date_range_end);
        const duration = end - start;
        console.log('Calculated duration from archive dates:', duration, 'ms');
      } else {
        console.log('Cannot calculate duration - missing date_range_end');
      }
      
      console.log('\nArchived Data Keys:', Object.keys(archive.archived_data || {}));
      
      if (archive.archived_data && archive.archived_data.shift_metrics) {
        console.log('\nShift Metrics:');
        console.log('shift_duration:', archive.archived_data.shift_metrics.shift_duration);
      }
      
      if (archive.archived_data && archive.archived_data.generation_metadata) {
        console.log('\nGeneration Metadata:');
        console.log('shift_duration_ms:', archive.archived_data.generation_metadata.shift_duration_ms);
      }
    } else {
      console.log('Archive ID 1 not found');
    }
    
    // Also check all shift report archives
    console.log('\n=== All Shift Report Archives ===');
    const allShiftReports = await Archive.findAll({
      where: {
        archive_type: 'SHIFT_REPORT'
      },
      order: [['id', 'ASC']]
    });
    
    allShiftReports.forEach(archive => {
      console.log(`ID: ${archive.id}, Title: ${archive.title}, date_range_end: ${archive.date_range_end}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testArchiveId1();