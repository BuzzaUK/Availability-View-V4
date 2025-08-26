const axios = require('axios');

async function testAIDebug() {
    try {
        console.log('🔍 Testing AI Debug Messages...');
        console.log('🔍 Attempting to connect to backend at http://localhost:5000');
        
        // First authenticate
        console.log('🔍 Attempting login...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@example.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Authentication successful, token received');
        
        // Test with AI enabled using the correct endpoint
        console.log('🔍 Making AI report request...');
        const response = await axios.get('http://localhost:5000/api/reports/natural-language/shift/78?useAI=true&includeRawData=true', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ AI Report Response received');
        console.log('Response status:', response.status);
        console.log('Response data keys:', Object.keys(response.data));
        if (response.data.ai_used !== undefined) {
            console.log('🤖 AI Used:', response.data.ai_used);
        }
        
    } catch (error) {
        console.error('❌ Error occurred:');
        if (error.code) {
            console.error('Error code:', error.code);
        }
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response statusText:', error.response.statusText);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            console.error('No response received. Request details:', error.request.method, error.request.path);
        } else {
            console.error('Error message:', error.message);
        }
        console.error('Full error stack:', error.stack);
    }
}

testAIDebug();