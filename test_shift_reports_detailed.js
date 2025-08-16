const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

console.log('🔍 Testing Detailed Shift Reports API Response');
console.log('==================================================');

async function testShiftReportsDetailed() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;
    
    // Fetch shift reports
    console.log('\n📊 Fetching detailed shift reports from /api/reports/shifts...');
    const response = await axios.get(`${BASE_URL}/api/reports/shifts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`\n📋 API Response Status: ${response.status}`);
    console.log(`📋 Response Success: ${response.data.success}`);
    console.log(`📋 Number of shift reports returned: ${response.data.data.length}`);
    
    // Show detailed structure of each report
    console.log('\n📄 Detailed Shift Report Structure:');
    response.data.data.forEach((report, index) => {
      console.log(`\n${index + 1}. Report ID: ${report.id}`);
      console.log(`   All Fields:`);
      Object.entries(report).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          console.log(`   - ${key}: [Object]`);
        } else {
          console.log(`   - ${key}: ${value}`);
        }
      });
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testShiftReportsDetailed();