const axios = require('axios');

async function testShift74Content() {
  try {
    console.log('Testing shift 74 natural language report content...');
    
    // First login to get authentication token
    console.log('\n🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Now make the authenticated request
    console.log('\n📊 Fetching natural language report...');
    const response = await axios.get('http://localhost:5000/api/reports/natural-language/shift/74', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n=== API Response Status ===');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Report Type:', response.data.report_type);
    
    if (response.data.narrative) {
      console.log('\n=== Narrative Sections ===');
      const narrative = response.data.narrative;
      
      Object.keys(narrative).forEach(section => {
        const content = narrative[section];
        if (content && typeof content === 'string') {
          console.log(`\n${section.toUpperCase()}:`);
          console.log(`Length: ${content.length} characters`);
          console.log(`Preview: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
        } else {
          console.log(`\n${section.toUpperCase()}: [EMPTY OR NULL]`);
          console.log(`Value: ${JSON.stringify(content)}`);
        }
      });
    } else {
      console.log('\n=== NO NARRATIVE FOUND ===');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing shift 74:', error.message || 'Unknown error');
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.request) {
      console.error('Request was made but no response received');
      console.error('Request details:', error.request.method, error.request.path);
    }
  }
}

testShift74Content();