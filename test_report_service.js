const reportService = require('./src/backend/services/reportService');

async function testReportService() {
  try {
    console.log('🔍 Testing reportService.getArchivedShiftReports()...');
    
    const shiftReports = await reportService.getArchivedShiftReports();
    
    console.log('\n📊 Number of shift reports found:', shiftReports.length);
    
    shiftReports.forEach((report, index) => {
      console.log(`\n--- Shift Report ${index + 1} ---`);
      console.log('ID:', report.id);
      console.log('Title:', report.title);
      console.log('Archive Type:', report.archive_type);
      console.log('Created At:', report.created_at);
      console.log('Date Range Start:', report.date_range_start);
      console.log('Date Range End:', report.date_range_end);
      
      if (report.generation_metadata) {
        console.log('Shift Duration (ms):', report.generation_metadata.shift_duration_ms);
      }
      
      if (report.archived_data && report.archived_data.analytics) {
        console.log('Analytics Duration (ms):', report.archived_data.analytics.duration);
      }
    });
    
    console.log('\n✅ Test completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error testing report service:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Add a small delay to let any initialization complete
setTimeout(testReportService, 1000);