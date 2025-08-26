// Test backend environment variable loading
const path = require('path');

// Load environment variables the same way the backend does
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

console.log('Testing backend environment variable loading...');
console.log('Backend .env path:', path.join(__dirname, 'src', 'backend', '.env'));
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
console.log('OPENAI_API_KEY first 10 chars:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'undefined');

// Test the AI service directly
try {
    const AINaturalLanguageService = require('./src/backend/services/aiNaturalLanguageService');
    const aiService = new AINaturalLanguageService();
    
    console.log('\nAI Service initialized successfully');
    console.log('AI Service has openai client:', !!aiService.openai);

    
    // Test a simple OpenAI call
    async function testOpenAI() {
        try {
            console.log('\nTesting OpenAI connection...');
            const response = await aiService.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Say "Hello World"' }],
                max_tokens: 10
            });
            console.log('✅ OpenAI test successful:', response.choices[0].message.content);
        } catch (error) {
            console.error('❌ OpenAI test failed:', error.message);
            console.error('Error code:', error.code);
            console.error('Error type:', error.type);
        }
    }
    
    testOpenAI();
    
} catch (error) {
    console.error('❌ Failed to initialize AI service:', error.message);
}