const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');
const aiNaturalLanguageService = require('./src/backend/services/aiNaturalLanguageService');
const databaseService = require('./src/backend/services/databaseService');

// Load environment variables
require('dotenv').config();

async function testAISpecific() {
  try {
    console.log('🤖 Testing AI-Specific Natural Language Generation...');
    
    // Check OpenAI API key
    console.log(`OpenAI API Key present: ${!!process.env.OPENAI_API_KEY}`);
    if (process.env.OPENAI_API_KEY) {
      console.log(`API Key starts with: ${process.env.OPENAI_API_KEY.substring(0, 15)}...`);
    } else {
      console.log('❌ No OpenAI API key found in environment');
      return;
    }
    
    // Initialize database
    await databaseService.initialize();
    console.log('✅ Database initialized');
    
    // Get a test shift
    const shifts = await databaseService.sequelize.query(
      'SELECT id, shift_name, start_time, end_time FROM shifts ORDER BY start_time DESC LIMIT 1',
      { type: databaseService.sequelize.QueryTypes.SELECT }
    );
    
    if (shifts.length === 0) {
      console.log('❌ No shifts found for testing');
      return;
    }
    
    const testShift = shifts[0];
    console.log(`Testing with shift: ${testShift.shift_name} (ID: ${testShift.id})`);
    
    // Test through main service with AI enabled
    console.log('\n🔄 Testing Natural Language Service with AI Enabled...');
    try {
      const mainReport = await naturalLanguageReportService.generateNaturalLanguageShiftReport(
        testShift.id,
        { 
          useAI: true,
          includeRawData: false 
        }
      );
      
      console.log('✅ AI Report Generated Successfully!');
      console.log(`Report Type: ${mainReport.report_type}`);
      console.log(`Generated At: ${mainReport.generated_at}`);
      
      if (mainReport.report_type === 'ai_natural_language') {
        console.log('🎉 SUCCESS: AI generation is working!');
      } else {
        console.log('⚠️ FALLBACK: Using enhanced generation instead of AI');
      }
      
      if (mainReport.narrative?.executive_summary) {
        console.log('\n📄 Executive Summary Sample:');
        const summary = mainReport.narrative.executive_summary;
        const sample = summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
        console.log(`"${sample}"`);
      }
      
      if (mainReport.narrative?.recommendations) {
        console.log('\n💡 Recommendations Sample:');
        const recs = mainReport.narrative.recommendations;
        const sample = recs.length > 200 ? recs.substring(0, 200) + '...' : recs;
        console.log(`"${sample}"`);
      }
      
    } catch (mainError) {
      console.log('❌ Main Service AI Failed:', mainError.message);
      console.log('Stack:', mainError.stack);
    }
    
    // Test fallback for comparison
    console.log('\n🔄 Testing Fallback Generation for Comparison...');
    try {
      const fallbackReport = await naturalLanguageReportService.generateNaturalLanguageShiftReport(
        testShift.id,
        { 
          useAI: false,
          includeRawData: false 
        }
      );
      
      console.log('✅ Fallback Report Generated!');
      console.log(`Report Type: ${fallbackReport.report_type}`);
      
    } catch (fallbackError) {
      console.log('❌ Fallback Failed:', fallbackError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (databaseService.sequelize) {
      await databaseService.sequelize.close();
    }
    console.log('\n🏁 AI Test Completed');
  }
}

testAISpecific();