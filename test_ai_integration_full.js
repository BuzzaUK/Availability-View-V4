const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const aiNaturalLanguageService = require('./src/backend/services/aiNaturalLanguageService');
const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');
const databaseService = require('./src/backend/services/databaseService');
const axios = require('axios');

async function testFullAIIntegration() {
  try {
    console.log('🔍 Testing Full AI Integration...');
    
    // Step 1: Verify OpenAI API is working
    console.log('\n🤖 Step 1: Testing OpenAI API directly...');
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    try {
      const testResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "AI is working" in exactly 3 words.' }],
        max_tokens: 10
      });
      console.log('✅ OpenAI API Response:', testResponse.choices[0].message.content.trim());
    } catch (apiError) {
      console.log('❌ OpenAI API Error:', apiError.message);
      return;
    }
    
    // Step 2: Test AI service directly
    console.log('\n🧠 Step 2: Testing AI Natural Language Service...');
    
    const mockShiftData = {
      shift: {
        id: 999,
        start_time: new Date('2024-01-15T06:00:00Z'),
        end_time: new Date('2024-01-15T14:00:00Z'),
        shift_type: 'Day Shift'
      },
      metrics: {
        total_runtime: 25200000, // 7 hours
        total_downtime: 3600000,  // 1 hour
        availability_percentage: 87.5,
        total_stops: 3
      },
      assets: [
        {
          id: 1,
          name: 'Production Line A',
          runtime: 21600000, // 6 hours
          downtime: 7200000,  // 2 hours
          availability_percentage: 75.0,
          total_stops: 2,
          current_state: 'Running'
        },
        {
          id: 2,
          name: 'Packaging Unit B',
          runtime: 28800000, // 8 hours
          downtime: 0,
          availability_percentage: 100.0,
          total_stops: 0,
          current_state: 'Running'
        }
      ],
      events: [
        {
          id: 1,
          event_type: 'STOP',
          duration: 1800000, // 30 minutes
          stop_reason: 'Scheduled Maintenance',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          asset_id: 1
        },
        {
          id: 2,
          event_type: 'STOP',
          duration: 900000, // 15 minutes
          stop_reason: 'Material Change',
          timestamp: new Date('2024-01-15T12:00:00Z'),
          asset_id: 1
        }
      ]
    };
    
    try {
      const aiResult = await aiNaturalLanguageService.generateIntelligentShiftReport(mockShiftData, { includeInsights: true });
      console.log('✅ AI Service Result:');
      console.log('- Success:', aiResult.success);
      console.log('- Report Type:', aiResult.report_type);
      console.log('- Has Executive Summary:', !!aiResult.narrative?.executive_summary);
      console.log('- Executive Summary Length:', aiResult.narrative?.executive_summary?.length || 0);
      console.log('- Executive Summary Preview:', aiResult.narrative?.executive_summary?.substring(0, 150) + '...');
      
      if (aiResult.narrative?.key_insights) {
        console.log('- Key Insights Count:', aiResult.narrative.key_insights.length);
        console.log('- First Insight:', aiResult.narrative.key_insights[0]?.substring(0, 100) + '...');
      }
    } catch (aiError) {
      console.log('❌ AI Service Error:', aiError.message);
      console.log('Stack:', aiError.stack);
    }
    
    // Step 3: Test through the main service with useAI flag
    console.log('\n🔄 Step 3: Testing Natural Language Report Service with AI...');
    
    try {
      const serviceResult = await naturalLanguageReportService.generateNaturalLanguageShiftReport(
        mockShiftData.shift.id,
        { useAI: true, includeRawData: false }
      );
      
      console.log('✅ Service Result:');
      console.log('- Success:', serviceResult.success);
      console.log('- AI Used:', serviceResult.ai_used || false);
      console.log('- Report Type:', serviceResult.report_type);
      console.log('- Has Content:', !!serviceResult.content);
      console.log('- Content Length:', serviceResult.content?.length || 0);
      
      if (serviceResult.content) {
        console.log('- Content Preview:', serviceResult.content.substring(0, 200) + '...');
      }
      
    } catch (serviceError) {
      console.log('❌ Service Error:', serviceError.message);
    }
    
    // Step 4: Test via API endpoint
    console.log('\n🌐 Step 4: Testing via API endpoint...');
    
    try {
      // First authenticate
      const authResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'admin@example.com',
        password: 'admin123'
      });
      
      const token = authResponse.data.token;
      
      // Get available shifts
      const shiftsResponse = await axios.get('http://localhost:5000/api/shifts/available', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (shiftsResponse.data.length > 0) {
        const testShift = shiftsResponse.data[0];
        console.log('📊 Testing with shift:', testShift.id);
        
        // Test with AI enabled
        const apiResponse = await axios.get(
          `http://localhost:5000/api/reports/natural-language/shift/${testShift.id}?useAI=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('✅ API Response:');
        console.log('- Success:', apiResponse.data.success);
        console.log('- AI Used:', apiResponse.data.ai_used || false);
        console.log('- Report Type:', apiResponse.data.report_type);
        console.log('- Has Content:', !!apiResponse.data.content);
        console.log('- Content Length:', apiResponse.data.content?.length || 0);
        
        if (apiResponse.data.content) {
          console.log('- Content Preview:', apiResponse.data.content.substring(0, 200) + '...');
        }
        
      } else {
        console.log('⚠️  No shifts available for API testing');
      }
      
    } catch (apiError) {
      console.log('❌ API Error:', apiError.response?.data?.message || apiError.message);
    }
    
    console.log('\n🎯 Full AI Integration Test Complete!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFullAIIntegration();