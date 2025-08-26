const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const OpenAI = require('openai');

async function testOpenAISimple() {
  try {
    console.log('🤖 Testing OpenAI API Simple...');
    
    console.log('🔑 OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('🔑 API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('\n📡 Making OpenAI API call...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "You are a helpful assistant that generates manufacturing shift reports."
      }, {
        role: "user",
        content: "Generate a brief executive summary for a manufacturing shift with 85% availability, 8 hours duration, and 12 stops."
      }],
      max_tokens: 200,
      temperature: 0.7
    });
    
    console.log('\n✅ OpenAI Response:');
    console.log('- Model:', response.model);
    console.log('- Usage:', response.usage);
    console.log('- Content Length:', response.choices[0].message.content.length);
    console.log('- Content Preview:', response.choices[0].message.content.substring(0, 200) + '...');
    
    console.log('\n🎯 OpenAI API Test Complete!');
    
  } catch (error) {
    console.error('❌ OpenAI API Test Failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testOpenAISimple();