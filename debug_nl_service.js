const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');
const databaseService = require('./src/backend/services/databaseService');

async function debugNLService() {
  try {
    console.log('🔍 Debugging Natural Language Report Service...');
    
    // Wait for database to initialize (it initializes in constructor)
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Database should be initialized');
    
    // Test with shift 78
    const shiftId = 78;
    console.log(`\n🧠 Testing with shift ${shiftId}...`);
    
    console.log('\n📝 Testing WITHOUT AI:');
    try {
      const result1 = await naturalLanguageReportService.generateNaturalLanguageShiftReport(shiftId, { useAI: false });
      console.log('- Success:', result1.success);
      console.log('- Report Type:', result1.report_type);
      console.log('- Has Narrative:', !!result1.narrative);
      
      if (result1.narrative) {
        console.log('- Executive Summary Length:', result1.narrative.executive_summary?.length || 0);
        console.log('- Shift Overview Length:', result1.narrative.shift_overview?.length || 0);
        console.log('- Asset Performance Length:', result1.narrative.asset_performance?.length || 0);
      }
      
      // Check if there's a content field
      if (result1.content) {
        console.log('- Content Length:', result1.content.length);
      } else {
        console.log('- No content field found');
      }
      
    } catch (error1) {
      console.log('❌ Error without AI:', error1.message);
    }
    
    console.log('\n🤖 Testing WITH AI:');
    try {
      const result2 = await naturalLanguageReportService.generateNaturalLanguageShiftReport(shiftId, { useAI: true });
      console.log('- Success:', result2.success);
      console.log('- Report Type:', result2.report_type);
      console.log('- Has Narrative:', !!result2.narrative);
      
      if (result2.narrative) {
        console.log('- Executive Summary Length:', result2.narrative.executive_summary?.length || 0);
        console.log('- Shift Overview Length:', result2.narrative.shift_overview?.length || 0);
        console.log('- Asset Performance Length:', result2.narrative.asset_performance?.length || 0);
      }
      
      // Check if there's a content field
      if (result2.content) {
        console.log('- Content Length:', result2.content.length);
      } else {
        console.log('- No content field found');
      }
      
      // Check for AI-specific fields
      if (result2.ai_used !== undefined) {
        console.log('- AI Used:', result2.ai_used);
      } else {
        console.log('- No ai_used field found');
      }
      
    } catch (error2) {
      console.log('❌ Error with AI:', error2.message);
      console.log('Stack:', error2.stack);
    }
    
    console.log('\n🎯 Debug Complete!');
    
  } catch (error) {
    console.error('❌ Debug Failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugNLService();