const reportService = require('./src/backend/services/reportService');

async function testShiftReportsService() {
  try {
    console.log('Testing reportService.getArchivedShiftReports()...');
    
    const reports = await reportService.getArchivedShiftReports();
    console.log('Archived shift reports found:', reports.length);
    
    reports.forEach((report, i) => {
      console.log(`Report ${i+1}:`, {
        id: report.id,
        type: report.archive_type,
        title: report.title,
        created: report.created_at,
        status: report.status
      });
    });
    
    if (reports.length === 0) {
      console.log('\n❌ No SHIFT_REPORT archives found by reportService!');
      
      // Let's also check what getAllArchives returns
      const databaseService = require('./src/backend/services/databaseService');
      const allArchives = await databaseService.getAllArchives();
      
      console.log('\nAll archives from database:', allArchives.length);
      const shiftReportArchives = allArchives.filter(a => a.archive_type === 'SHIFT_REPORT');
      console.log('SHIFT_REPORT archives in database:', shiftReportArchives.length);
      
      if (shiftReportArchives.length > 0) {
        console.log('\nSHIFT_REPORT archives found in database:');
        shiftReportArchives.forEach((archive, i) => {
          console.log(`Archive ${i+1}:`, {
            id: archive.id,
            type: archive.archive_type,
            title: archive.title,
            created: archive.created_at,
            status: archive.status
          });
        });
      }
    }
    
  } catch (error) {
    console.error('Error testing shift reports service:', error.message);
    console.error(error.stack);
  }
}

testShiftReportsService().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});