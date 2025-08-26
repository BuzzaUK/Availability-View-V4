const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

/**
 * Simple debug script to catch toFixed error
 */
async function debugToFixedError() {
  try {
    console.log('🔍 DEBUGGING toFixed ERROR');
    
    // Get a shift to test with
    const allShifts = await databaseService.getAllShifts();
    const testShift = allShifts[0];
    console.log(`Testing with shift ID: ${testShift.id}`);
    
    // Test the problematic function directly
    console.log('\nTesting generateAndArchiveShiftReportFromShift...');
    const result = await reportService.generateAndArchiveShiftReportFromShift(testShift.id, {
      includeCsv: true,
      includeHtml: true,
      includeAnalysis: true
    });
    
    console.log('✅ SUCCESS - No toFixed error!');
    console.log('Result:', result.success ? 'SUCCESS' : 'FAILED');
    
  } catch (error) {
    console.log('❌ CAUGHT ERROR:');
    console.log('Message:', error.message);
    console.log('Stack:', error.stack);
    
    // Look for toFixed in the stack trace
    if (error.stack && error.stack.includes('toFixed')) {
      console.log('\n🎯 FOUND toFixed in stack trace!');
      const lines = error.stack.split('\n');
      const toFixedLines = lines.filter(line => line.includes('toFixed') || line.includes('.js:'));
      console.log('Relevant lines:');
      toFixedLines.forEach(line => console.log('  ', line.trim()));
    }
  }
}

debugToFixedError();