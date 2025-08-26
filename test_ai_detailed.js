const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

async function testAIEndpointDetailed() {
  try {
    console.log('Step 1: Authenticating...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    const token = loginResponse.data.token;
    console.log('Authentication successful');

    console.log('Step 2: Testing AI endpoint with detailed logging...');
    const aiResponse = await axios.post(
      `${BASE_URL}/api/reports/natural-language`,
      {
        shift_id: 1,
        report_type: 'shift_summary',
        useAI: true,  // Explicitly enable AI
        debug: true   // Enable debug mode
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('AI endpoint test successful!');
    console.log('Response status:', aiResponse.status);
    console.log('Response data keys:', Object.keys(aiResponse.data));
    console.log('AI used:', aiResponse.data.ai_used);
    console.log('Full response:', JSON.stringify(aiResponse.data, null, 2));
    
    if (aiResponse.data.ai_used) {
      console.log('✅ AI was successfully used!');
    } else {
      console.log('❌ AI was NOT used - this might be the issue');
    }

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAIEndpointDetailed();