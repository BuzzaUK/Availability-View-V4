const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const aiNaturalLanguageService = require('./src/backend/services/aiNaturalLanguageService');

async function testAIServiceDirect() {
  try {
    console.log('🧠 Testing AI Service Directly...');
    
    // Create mock shift data
    const mockShiftData = {
      shift: {
        id: 78,
        shift_name: 'Day Shift',
        start_time: new Date('2024-01-15T08:00:00Z'),
        end_time: new Date('2024-01-15T16:00:00Z'),
        duration_hours: 8
      },
      metrics: {
        availability_percentage: 85.5,
        runtime_minutes: 410,
        downtime_minutes: 70,
        total_stops: 12
      },
      assets: [
        {
          asset_name: 'Line 1',
          availability: 88.2,
          runtime: 423,
          downtime: 57,
          total_stops: 8
        },
        {
          asset_name: 'Line 2', 
          availability: 82.8,
          runtime: 397,
          downtime: 83,
          total_stops: 4
        }
      ],
      events: [
        {
          event_type: 'STOP',
          asset_name: 'Line 1',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          duration: 15,
          reason: 'Material shortage'
        },
        {
          event_type: 'START',
          asset_name: 'Line 1',
          timestamp: new Date('2024-01-15T10:45:00Z')
        }
      ]
    };
    
    console.log('📊 Mock data prepared');
    console.log('🔑 OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
    
    console.log('\n🤖 Calling AI service...');
    const result = await aiNaturalLanguageService.generateIntelligentShiftReport(mockShiftData, { useAI: true });
    
    console.log('\n✅ AI Service Result:');
    console.log('- Success:', result.success);
    console.log('- Report Type:', result.report_type);
    console.log('- Generated At:', result.generated_at);
    console.log('- Has Narrative:', !!result.narrative);
    
    if (result.narrative) {
      console.log('\n📝 Narrative Sections:');
      Object.keys(result.narrative).forEach(key => {
        const content = result.narrative[key];
        console.log(`- ${key}: ${content ? content.length : 0} characters`);
        if (content && content.length > 0) {
          console.log(`  Preview: "${content.substring(0, 100)}..."`);
        }
      });
    }
    
    if (result.data_insights) {
      console.log('\n🔍 Data Insights Available:', !!result.data_insights);
    }
    
    console.log('\n🎯 Test Complete!');
    
  } catch (error) {
    console.error('❌ AI Service Test Failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testAIServiceDirect();