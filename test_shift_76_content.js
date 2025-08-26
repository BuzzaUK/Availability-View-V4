const axios = require('axios');

async function testShift76Content() {
  try {
    console.log('Testing shift 76 natural language report content...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test natural language report for shift 76
    const response = await axios.get('http://localhost:5000/api/reports/natural-language/shift/76', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('\n📊 Natural Language Report for Shift 76:');
    console.log('Success:', response.data.success);
    console.log('Report Type:', response.data.report_type);
    
    if (response.data.narrative) {
      const narrative = response.data.narrative;
      
      console.log('\n📋 Narrative Sections:');
      Object.keys(narrative).forEach(section => {
        const content = narrative[section];
        if (content && typeof content === 'string') {
          console.log(`\n${section.toUpperCase()}: ${content.length} characters`);
          console.log(`Preview: ${content.substring(0, 100)}...`);
        } else if (content && typeof content === 'object') {
          console.log(`\n${section.toUpperCase()}: [OBJECT]`);
          console.log('Content:', JSON.stringify(content, null, 2));
        } else {
          console.log(`\n${section.toUpperCase()}: [EMPTY OR NULL]`);
          console.log('Value:', content);
        }
      });
    }
    
    // Check shift data quality
    if (response.data.shift_data) {
      console.log('\n🔍 Shift Data Quality:');
      console.log('Shift name:', response.data.shift_data.shift_name);
      console.log('Start time:', response.data.shift_data.start_time);
      console.log('End time:', response.data.shift_data.end_time);
      console.log('Assets count:', response.data.shift_data.assets?.length || 0);
      console.log('Events count:', response.data.shift_data.events?.length || 0);
      
      if (response.data.shift_data.assets && response.data.shift_data.assets.length > 0) {
        console.log('\nAsset availability:');
        response.data.shift_data.assets.forEach(asset => {
          console.log(`- ${asset.asset_name}: ${asset.availability || 0}%`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error testing shift 76:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testShift76Content();