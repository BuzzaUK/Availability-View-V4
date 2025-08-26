const axios = require('axios');

/**
 * Test the endpoint that was failing with toFixed error
 */
async function testEndpoint() {
  try {
    console.log('🔍 Testing shift report generation endpoint...');
    
    // Test the endpoint that was failing
    const response = await axios.post('http://localhost:5000/api/reports/generate-and-archive', {
      shiftId: 74,
      options: {
        includeCsv: true,
        includeHtml: true,
        includeAnalysis: true
      }
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    
  } catch (error) {
    console.log('❌ ERROR CAUGHT:');
    console.log('Full error object:', error.code, error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.message);
      console.log('Error:', error.response.data?.error);
      
      if (error.response.data?.error && error.response.data.error.includes('toFixed')) {
        console.log('\n🎯 FOUND toFixed ERROR!');
        console.log('Full error:', error.response.data.error);
      }
    } else {
      console.log('Network/Connection error:', error.message);
    }
  }
}

testEndpoint();