const { Archive } = require('./src/backend/models/database/index');

async function testRawArchive() {
  try {
    console.log('=== Testing Raw Archive Data ===\n');
    
    // Get the shift report archive directly from database
    const archive = await Archive.findOne({
      where: {
        archive_type: 'SHIFT_REPORT'
      }
    });
    
    if (archive) {
      console.log('Archive ID:', archive.id);
      console.log('Title:', archive.title);
      console.log('date_range_start:', archive.date_range_start);
      console.log('date_range_end:', archive.date_range_end);
      console.log('date_range_end type:', typeof archive.date_range_end);
      console.log('date_range_end is null:', archive.date_range_end === null);
      
      if (archive.date_range_start && archive.date_range_end) {
        const start = new Date(archive.date_range_start);
        const end = new Date(archive.date_range_end);
        const duration = end - start;
        console.log('Calculated duration from archive dates:', duration, 'ms');
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
      console.log('No shift report archive found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRawArchive();