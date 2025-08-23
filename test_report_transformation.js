const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

async function testReportTransformation() {
  console.log('=== Testing Report Transformation ===\n');
  
  try {
    // 1. Get raw archives
    console.log('1. Raw Archives from Database:');
    const allArchives = await databaseService.getAllArchives();
    const shiftReports = allArchives.filter(archive => archive.archive_type === 'SHIFT_REPORT');
    
    if (shiftReports.length > 0) {
      const archive = shiftReports[0];
      console.log('   Archive ID:', archive.id);
      console.log('   Title:', archive.title);
      console.log('   Date Range Start:', archive.date_range_start);
      console.log('   Date Range End:', archive.date_range_end);
      
      const archivedData = archive.archived_data || {};
      const metrics = archivedData.shift_metrics || archivedData;
      const meta = archivedData.generation_metadata || archivedData;
      
      console.log('   Metrics shift_duration:', metrics.shift_duration);
      console.log('   Meta shift_duration_ms:', meta.shift_duration_ms);
    }
    
    // 2. Get reports from reportService
    console.log('\n2. Reports from Report Service:');
    const reports = await reportService.getArchivedShiftReports();
    console.log('   Total reports:', reports.length);
    
    if (reports.length > 0) {
      const report = reports[0];
      console.log('   Report ID:', report.id);
      console.log('   Title:', report.title);
      console.log('   Date Range Start:', report.date_range_start);
      console.log('   Date Range End:', report.date_range_end);
      
      const archivedData = report.archived_data || {};
      const metrics = archivedData.shift_metrics || archivedData;
      const meta = archivedData.generation_metadata || archivedData;
      
      console.log('   Metrics shift_duration:', metrics.shift_duration);
      console.log('   Meta shift_duration_ms:', meta.shift_duration_ms);
    }
    
    // 3. Test the transformation logic directly
    console.log('\n3. Testing Transformation Logic:');
    if (shiftReports.length > 0) {
      const archive = shiftReports[0];
      const archivedData = archive.archived_data || {};
      const metrics = archivedData.shift_metrics || archivedData;
      const meta = archivedData.generation_metadata || archivedData;
      
      // Replicate the duration calculation from reportController
      let duration = 0;
      console.log('   Step 1 - Check metrics.shift_duration:', metrics.shift_duration);
      if (metrics.shift_duration) {
        duration = Number(metrics.shift_duration);
        console.log('   Using metrics.shift_duration:', duration);
      } else if (meta.shift_duration_ms) {
        duration = Number(meta.shift_duration_ms);
        console.log('   Using meta.shift_duration_ms:', duration);
      } else {
        const startTime = archive.date_range_start ? new Date(archive.date_range_start) : null;
        const endTime = archive.date_range_end ? new Date(archive.date_range_end) : null;
        duration = startTime && endTime ? Math.max(0, endTime - startTime) : 0;
        console.log('   Calculated from date range:', duration);
      }
      
      console.log('   Final duration:', duration);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testReportTransformation().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});