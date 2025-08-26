const axios = require('axios');

const baseURL = 'http://localhost:5000';

async function testAIEndpoint() {
    try {
        console.log('Step 1: Authenticating...');
        
        // First, authenticate to get a valid token
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'admin@example.com',
            password: 'admin123'
        });
        
        console.log('Authentication successful');
        const token = loginResponse.data.token;
        
        console.log('Step 2: Testing AI endpoint...');
        
        // Test the AI endpoint with proper authentication
        const aiResponse = await axios.get(
            `${baseURL}/api/reports/natural-language/shift/74?includeRawData=true&useAI=true`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 120000 // 2 minute timeout
            }
        );
        
        console.log('AI endpoint test successful!');
        console.log('Response status:', aiResponse.status);
        console.log('Response data keys:', Object.keys(aiResponse.data));
        
        if (aiResponse.data.aiGenerated) {
            console.log('AI was used successfully');
        } else {
            console.log('AI was NOT used - this might be the issue');
        }
        
    } catch (error) {
        console.error('Error occurred:');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Error Message:', error.message);
        
        if (error.response?.data) {
            console.error('Response Data:', error.response.data);
        }
        
        if (error.code === 'ECONNABORTED') {
            console.error('Request timed out - AI service might be taking too long');
        }
    }
}

testAIEndpoint();