const OpenAI = require('openai');
require('dotenv').config({ path: './src/backend/.env' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAIConnection() {
  console.log('🔍 Testing OpenAI API connection...');
  console.log('API Key present:', !!process.env.OPENAI_API_KEY);
  console.log('API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
  
  try {
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API timeout after 10 seconds')), 10000);
    });
    
    const apiPromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: "Say hello in one word."
      }],
      max_tokens: 10,
      temperature: 0.1
    });
    
    console.log('⏳ Making API call...');
    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    console.log('✅ OpenAI API connection successful!');
    console.log('Response:', response.choices[0].message.content);
    console.log('Usage:', response.usage);
    
  } catch (error) {
    console.error('❌ OpenAI API connection failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('🔍 This suggests network connectivity issues or API slowness');
    } else if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('🔍 This suggests an invalid API key');
    } else if (error.message.includes('429')) {
      console.log('🔍 This suggests rate limiting or quota exceeded');
    } else {
      console.log('🔍 Full error details:', error);
    }
  }
}

testOpenAIConnection();