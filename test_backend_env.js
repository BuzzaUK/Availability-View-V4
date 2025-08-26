// Test backend environment loading
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src/backend/.env') });

console.log('Testing backend environment variable loading...');
console.log('Backend .env path:', path.join(__dirname, 'src/backend/.env'));
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
console.log('OPENAI_API_KEY first 10 chars:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'undefined');

// Test OpenAI directly
const OpenAI = require('openai');

try {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('\nOpenAI client created successfully');
    
    // Test a simple call
    async function testCall() {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Say "Hello World"' }],
                max_tokens: 10
            });
            console.log('OpenAI test successful:', response.choices[0].message.content);
        } catch (error) {
            console.error('OpenAI test failed:', error.message);
            console.error('Error code:', error.code);
        }
    }
    
    testCall();
    
} catch (error) {
    console.error('Failed to create OpenAI client:', error.message);
}