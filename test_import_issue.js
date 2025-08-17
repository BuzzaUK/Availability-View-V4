const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

async function testImportIssue() {
  console.log('🔍 Testing import issue...');
  
  try {
    // Test 1: Import at top level
    console.log('\n📋 Test 1: Using top-level import');
    const topLevelResult = await reportService.getArchivedShiftReports({});
    console.log('Top-level import result:', topLevelResult.length, 'reports');
    
    // Test 2: Import inside function (like the controller does)
    console.log('\n📋 Test 2: Using function-level import');
    const localReportService = require('./src/backend/services/reportService');
    const functionLevelResult = await localReportService.getArchivedShiftReports({});
    console.log('Function-level import result:', functionLevelResult.length, 'reports');
    
    // Test 3: Check if they're the same instance
    console.log('\n📋 Test 3: Instance comparison');
    console.log('Same instance?', reportService === localReportService);
    
    // Test 4: Direct database check
    console.log('\n📋 Test 4: Direct database check');
    const allArchives = await databaseService.getAllArchives();
    const shiftReports = allArchives.filter(archive => archive.type === 'SHIFT_REPORT');
    console.log('Direct database result:', shiftReports.length, 'shift reports');
    
  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
}

testImportIssue().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});