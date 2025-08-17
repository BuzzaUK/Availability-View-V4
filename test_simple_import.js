// Set to development mode and suppress database logs
process.env.NODE_ENV = 'development';

const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

async function testSimpleImport() {
  console.log('🔍 Testing import issue (logs suppressed)...');
  
  try {
    // Test 1: Top-level import
    const topLevelResult = await reportService.getArchivedShiftReports({});
    console.log('Top-level import result:', topLevelResult.length, 'reports');
    
    // Test 2: Function-level import
    const localReportService = require('./src/backend/services/reportService');
    const functionLevelResult = await localReportService.getArchivedShiftReports({});
    console.log('Function-level import result:', functionLevelResult.length, 'reports');
    
    // Test 3: Same instance check
    console.log('Same instance?', reportService === localReportService);
    
    // Test 4: Direct database check
    const allArchives = await databaseService.getAllArchives();
    const shiftReports = allArchives.filter(archive => archive.type === 'SHIFT_REPORT');
    console.log('Direct database result:', shiftReports.length, 'shift reports');
    
    if (shiftReports.length > 0) {
      console.log('Found shift report:', {
        id: shiftReports[0].id,
        title: shiftReports[0].title,
        type: shiftReports[0].type
      });
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
}

testSimpleImport().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});