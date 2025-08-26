const databaseService = require('./src/backend/services/databaseService');
const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');
const aiNaturalLanguageService = require('./src/backend/services/aiNaturalLanguageService');

// Load environment variables
require('dotenv').config();

async function testOpenAIIntegration() {
  console.log('🔍 Testing OpenAI Integration...');
  
  try {
    // Check if OpenAI API key is loaded
    console.log('\n=== Environment Check ===');
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    console.log(`OpenAI API Key present: ${hasApiKey}`);
    if (hasApiKey) {
      console.log(`API Key starts with: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
    }
    
    // Get available shifts for testing
    console.log('\n=== Getting Available Shifts ===');
    const shifts = await databaseService.getShifts();
    console.log(`Found ${shifts.length} shifts`);
    
    if (shifts.length === 0) {
      console.log('❌ No shifts available for testing');
      return;
    }
    
    // Use the first available shift
    const testShift = shifts[0];
    console.log(`Testing with shift: ${testShift.id} (${testShift.shift_name})`);
    
    // Test AI natural language report generation
    console.log('\n=== Testing AI Natural Language Report ===');
    
    try {
      const report = await naturalLanguageReportService.generateNaturalLanguageShiftReport(
        testShift.id,
        { useAI: true, includeInsights: true }
      );
      
      console.log('✅ AI Report Generated Successfully!');
      console.log('Report type:', report.report_type);
      console.log('Generated at:', report.generated_at);
      
      if (report.narrative) {
        console.log('\n=== Report Sections ===');
        Object.keys(report.narrative).forEach(section => {
          const content = report.narrative[section];
          console.log(`${section}: ${content ? content.substring(0, 100) + '...' : 'N/A'}`);
        });
      }
      
      // Check if it's actually using AI or fallback
      if (report.report_type === 'ai_natural_language') {
        console.log('🤖 Using AI-powered generation');
      } else {
        console.log('📝 Using fallback template generation');
      }
      
    } catch (aiError) {
      console.error('❌ AI Report Generation Failed:', aiError.message);
      
      // Test fallback generation
      console.log('\n=== Testing Fallback Generation ===');
      try {
        const fallbackReport = await naturalLanguageReportService.generateNaturalLanguageShiftReport(
          testShift.id,
          { useAI: false }
        );
        console.log('✅ Fallback Report Generated Successfully!');
        console.log('Report type:', fallbackReport.report_type);
      } catch (fallbackError) {
        console.error('❌ Fallback Generation Also Failed:', fallbackError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testOpenAIIntegration().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});