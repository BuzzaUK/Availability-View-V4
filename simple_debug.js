const axios = require('axios');
const reportService = require('./src/backend/services/reportService');

async function simpleDebug() {
  try {
    console.log('🔍 Simple Debug: API vs Direct Service');
    console.log('='.repeat(50));
    
    // Suppress database query logs temporarily
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      if (!message.includes('Executing (default):') && !message.includes('SELECT')) {
        originalLog(...args);
      }
    };
    
    // Test 1: Direct service call
    console.log('\n1️⃣ Direct Service Call:');
    const directReports = await reportService.getArchivedShiftReports();
    console.log(`Found: ${directReports.length} reports`);
    
    // Test 2: API call
    console.log('\n2️⃣ API Call:');
    
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    // Call API
    const apiResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Found: ${apiResponse.data.data.length} reports`);
    console.log(`Success: ${apiResponse.data.success}`);
    console.log(`Total: ${apiResponse.data.total}`);
    
    // Restore console.log
    console.log = originalLog;
    
    // Compare
    console.log('\n📊 RESULTS:');
    console.log(`Direct Service: ${directReports.length} reports`);
    console.log(`API Call: ${apiResponse.data.data.length} reports`);
    
    if (directReports.length !== apiResponse.data.data.length) {
      console.log('\n❌ MISMATCH DETECTED!');
      console.log('The API is not returning the same data as the direct service call.');
      
      if (directReports.length > 0) {
        console.log('\nDirect service found these reports:');
        directReports.forEach((report, i) => {
          console.log(`  ${i+1}. ID: ${report.id}, Type: ${report.archive_type}, Title: ${report.title}`);
        });
      }
      
      if (apiResponse.data.data.length > 0) {
        console.log('\nAPI found these reports:');
        apiResponse.data.data.forEach((report, i) => {
          console.log(`  ${i+1}. ID: ${report.id}, Type: ${report.archive_type}, Title: ${report.title}`);
        });
      }
      
    } else {
      console.log('\n✅ Results match!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

simpleDebug().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});