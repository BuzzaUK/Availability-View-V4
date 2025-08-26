const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

/**
 * Direct test of the toFixed error without HTTP layer
 */
async function directTestToFixed() {
  try {
    console.log('🔍 Direct test of toFixed error...');
    
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get a shift to test with
    const allShifts = await databaseService.getAllShifts();
    if (allShifts.length === 0) {
      console.log('❌ No shifts found');
      return;
    }
    
    const testShift = allShifts[0];
    console.log(`Testing with shift ID: ${testShift.id} (${testShift.shift_name})`);
    
    // Test the problematic function directly
    console.log('\nCalling generateAndArchiveShiftReportFromShift...');
    const result = await reportService.generateAndArchiveShiftReportFromShift(testShift.id, {
      includeCsv: true,
      includeHtml: true,
      includeAnalysis: true
    });
    
    console.log('✅ SUCCESS - No toFixed error!');
    console.log('Result success:', result.success);
    
  } catch (error) {
    console.log('❌ CAUGHT ERROR:');
    console.log('Message:', error.message);
    
    // Look for toFixed in the error message or stack
    if (error.message && error.message.includes('toFixed')) {
      console.log('\n🎯 FOUND toFixed in error message!');
      console.log('Full message:', error.message);
    }
    
    if (error.stack && error.stack.includes('toFixed')) {
      console.log('\n🎯 FOUND toFixed in stack trace!');
      const lines = error.stack.split('\n');
      const relevantLines = lines.filter(line => 
        line.includes('toFixed') || 
        line.includes('.js:') || 
        line.includes('at ')
      ).slice(0, 10); // First 10 relevant lines
      console.log('Relevant stack trace lines:');
      relevantLines.forEach((line, index) => {
        console.log(`  ${index + 1}: ${line.trim()}`);
      });
    }
  }
}

directTestToFixed();