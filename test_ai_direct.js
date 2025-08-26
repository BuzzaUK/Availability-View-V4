const path = require('path');
const fs = require('fs');

// Load environment variables from the backend .env file
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

async function testAIDirect() {
  try {
    console.log('🔍 Testing AI Service Environment...');
    
    // Check current working directory
    console.log('📁 Current directory:', __dirname);
    console.log('📁 .env file path:', path.join(__dirname, 'src', 'backend', '.env'));
    
    // Check if .env file exists
    const envPath = path.join(__dirname, 'src', 'backend', '.env');
    const envExists = fs.existsSync(envPath);
    console.log('📄 .env file exists:', envExists);
    
    if (envExists) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const hasOpenAIKey = envContent.includes('OPENAI_API_KEY');
      console.log('🔑 .env contains OPENAI_API_KEY:', hasOpenAIKey);
      
      if (hasOpenAIKey) {
        const lines = envContent.split('\n');
        const openaiLine = lines.find(line => line.startsWith('OPENAI_API_KEY'));
        console.log('🔑 OpenAI line in .env:', openaiLine ? openaiLine.substring(0, 30) + '...' : 'Not found');
      }
    }
    
    // Check if OpenAI API key is loaded in process.env
    console.log('🔑 OpenAI API Key present in process.env:', !!process.env.OPENAI_API_KEY);
    console.log('🔑 API Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
    console.log('🔑 API Key starts with:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'N/A');
    
    // List all environment variables that start with OPENAI
    const openaiVars = Object.keys(process.env).filter(key => key.startsWith('OPENAI'));
    console.log('🔑 All OPENAI env vars:', openaiVars);
    
    // Test OpenAI client initialization
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      });
      console.log('✅ OpenAI client created successfully');
      
      // Test if we can make a simple API call (this will fail with invalid key but we can see the error)
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
        console.log('🤖 Testing OpenAI API call...');
        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello, this is a test.' }],
            max_tokens: 10
          });
          console.log('✅ OpenAI API call successful!');
          console.log('📝 Response:', response.choices[0].message.content);
        } catch (apiError) {
          console.log('❌ OpenAI API call failed:', apiError.message);
          if (apiError.status) {
            console.log('📊 API Error Status:', apiError.status);
          }
        }
      } else {
        console.log('⚠️  Invalid or missing OpenAI API key, skipping API test');
      }
      
    } catch (openaiError) {
      console.log('❌ OpenAI client creation failed:', openaiError.message);
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAIDirect();