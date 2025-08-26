const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const axios = require('axios');

async function testAIWithRealShift() {
  try {
    console.log('🔍 Testing AI Integration with Real Shift Data...');
    
    // Step 1: Quick OpenAI API test
    console.log('\n🤖 Step 1: Verifying OpenAI API...');
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    try {
      const testResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Respond with exactly: "AI Ready"' }],
        max_tokens: 5
      });
      console.log('✅ OpenAI Response:', testResponse.choices[0].message.content.trim());
    } catch (apiError) {
      console.log('❌ OpenAI API Error:', apiError.message);
      return;
    }
    
    // Step 2: Authenticate with backend
    console.log('\n🔐 Step 2: Authenticating with backend...');
    const authResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = authResponse.data.token;
    console.log('✅ Authentication successful');
    
    // Step 3: Test with known shift ID 78
    const testShiftId = 78;
    console.log(`\n🧠 Step 3: Testing AI report generation with shift ${testShiftId}...`);
    
    // Test WITHOUT AI first (baseline)
    console.log('\n📝 Testing WITHOUT AI (baseline):');
    try {
      const baselineResponse = await axios.get(
        `http://localhost:5000/api/reports/natural-language/shift/${testShiftId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Baseline Report Generated:');
      console.log('- Success:', baselineResponse.data.success);
      console.log('- AI Used:', baselineResponse.data.ai_used || false);
      console.log('- Report Type:', baselineResponse.data.report_type);
      console.log('- Content Length:', baselineResponse.data.content?.length || 0);
      
      if (baselineResponse.data.content) {
        console.log('- Content Preview:', baselineResponse.data.content.substring(0, 150) + '...');
      }
      
    } catch (baselineError) {
      console.log('❌ Baseline Error:', baselineError.response?.data?.message || baselineError.message);
    }
    
    // Test WITH AI enabled
    console.log('\n🤖 Testing WITH AI enabled:');
    try {
      const aiResponse = await axios.get(
        `http://localhost:5000/api/reports/natural-language/shift/${testShiftId}?useAI=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ AI Report Generated:');
      console.log('- Success:', aiResponse.data.success);
      console.log('- AI Used:', aiResponse.data.ai_used || false);
      console.log('- Report Type:', aiResponse.data.report_type);
      console.log('- Content Length:', aiResponse.data.content?.length || 0);
      
      if (aiResponse.data.content) {
        console.log('- Content Preview:', aiResponse.data.content.substring(0, 200) + '...');
      }
      
      // Check if AI was actually used
      if (aiResponse.data.ai_used) {
        console.log('\n🎉 SUCCESS: AI is being used for report generation!');
        console.log('🔍 AI-Generated Content Analysis:');
        
        // Look for AI-specific characteristics
        const content = aiResponse.data.content || '';
        const hasNaturalLanguage = /\b(performance|efficiency|analysis|insights|recommendations)\b/i.test(content);
        const hasVariedSentences = content.split('.').length > 3;
        const hasDetailedAnalysis = content.length > 500;
        
        console.log('- Contains natural language patterns:', hasNaturalLanguage);
        console.log('- Has varied sentence structure:', hasVariedSentences);
        console.log('- Has detailed analysis:', hasDetailedAnalysis);
        
        if (hasNaturalLanguage && hasVariedSentences && hasDetailedAnalysis) {
          console.log('✅ AI-generated content appears to be high quality!');
        }
        
      } else {
        console.log('\n⚠️  WARNING: AI flag was set but AI was not used');
        console.log('This might indicate an issue with the AI service or API key.');
      }
      
    } catch (aiError) {
      console.log('❌ AI Report Error:', aiError.response?.data?.message || aiError.message);
      if (aiError.response?.status === 500) {
        console.log('💡 This might be an internal server error. Check backend logs.');
      }
    }
    
    // Step 4: Test with another shift for consistency
    console.log('\n🔄 Step 4: Testing with shift 77 for consistency...');
    try {
      const response = await axios.get(
        `http://localhost:5000/api/reports/natural-language/shift/77?useAI=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Second shift test:');
      console.log('- AI Used:', response.data.ai_used || false);
      console.log('- Content Length:', response.data.content?.length || 0);
      
    } catch (error) {
      console.log('❌ Second shift error:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎯 AI Integration Test Complete!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

testAIWithRealShift();