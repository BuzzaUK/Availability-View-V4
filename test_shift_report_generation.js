const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

async function testShiftReportGeneration() {
  try {
    console.log('🧪 Testing Shift Report Generation...');
    
    // Get the most recent completed shift
    const shifts = await databaseService.getAllShifts();
    const completedShifts = shifts.filter(shift => shift.status === 'completed');
    
    if (completedShifts.length === 0) {
      console.log('❌ No completed shifts found for testing');
      return;
    }
    
    const testShift = completedShifts[completedShifts.length - 1];
    console.log(`📊 Testing report generation for shift: ${testShift.shift_name} (ID: ${testShift.id})`);
    
    // Test the report generation method that should be used
    console.log('\n🔍 Testing generateAndArchiveShiftReportFromShift...');
    const reportOptions = {
      includeCsv: true,
      includeHtml: true,
      includeAnalysis: true,
      sendEmail: false // Don't send email during test
    };
    
    const reportResult = await reportService.generateAndArchiveShiftReportFromShift(testShift.id, reportOptions);
    
    if (reportResult && reportResult.reportArchive) {
      console.log('✅ Report generation successful!');
      console.log('Report Archive ID:', reportResult.reportArchive.id);
      console.log('Reports Generated:', Object.keys(reportResult.reports || {}));
    } else {
      console.log('❌ Report generation failed - no result returned');
      console.log('Result:', reportResult);
    }
    
  } catch (error) {
    console.error('❌ Error during shift report generation test:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  }
}

testShiftReportGeneration().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});