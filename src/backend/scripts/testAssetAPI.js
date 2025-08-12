const axios = require('axios');

async function testAssetAPI() {
  try {
    console.log('🔍 Testing /api/assets endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/assets');
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Headers:', response.headers);
    console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing API:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testAssetAPI();