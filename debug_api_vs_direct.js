const axios = require('axios');
const reportService = require('./src/backend/services/reportService');

async function debugApiVsDirect() {
  try {
    console.log('🔍 Debugging API vs Direct Service Call Differences');
    console.log('='.repeat(60));
    
    // Test 1: Direct service call
    console.log('\n1️⃣ Testing Direct Service Call...');
    const directReports = await reportService.getArchivedShiftReports();
    console.log(`Direct call found: ${directReports.length} reports`);
    
    if (directReports.length > 0) {
      console.log('Direct call report sample:', {
        id: directReports[0].id,
        type: directReports[0].archive_type,
        title: directReports[0].title
      });
    }
    
    // Test 2: API call
    console.log('\n2️⃣ Testing API Call...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('API login successful');
    
    // Call API
    const apiResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`API call found: ${apiResponse.data.data.length} reports`);
    console.log(`API response success: ${apiResponse.data.success}`);
    console.log(`API response total: ${apiResponse.data.total}`);
    
    if (apiResponse.data.data.length > 0) {
      console.log('API call report sample:', {
        id: apiResponse.data.data[0].id,
        type: apiResponse.data.data[0].archive_type,
        title: apiResponse.data.data[0].title
      });
    }
    
    // Test 3: Check if there's a database connection issue
    console.log('\n3️⃣ Testing Database Connection in API Context...');
    
    // Test the controller directly with mock req/res
    const reportController = require('./src/backend/controllers/reportController');
    
    let controllerResult = null;
    const mockReq = { query: {} };
    const mockRes = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { controllerResult = data; return this; }
    };
    
    await reportController.getShiftReports(mockReq, mockRes);
    
    console.log(`Controller call found: ${controllerResult?.data?.length || 0} reports`);
    console.log(`Controller response success: ${controllerResult?.success}`);
    
    // Compare results
    console.log('\n📊 COMPARISON RESULTS:');
    console.log(`Direct Service: ${directReports.length} reports`);
    console.log(`API Call: ${apiResponse.data.data.length} reports`);
    console.log(`Controller Call: ${controllerResult?.data?.length || 0} reports`);
    
    if (directReports.length !== apiResponse.data.data.length) {
      console.log('\n❌ MISMATCH DETECTED!');
      console.log('There is a difference between direct service calls and API calls.');
      
      // Let's check if it's a timing issue or database connection issue
      console.log('\n🔍 Investigating potential causes...');
      
      // Check if database service is properly initialized
      const databaseService = require('./src/backend/services/databaseService');
      const allArchives = await databaseService.getAllArchives();
      console.log(`Database service can access ${allArchives.length} total archives`);
      
      const shiftReportArchives = allArchives.filter(a => a.archive_type === 'SHIFT_REPORT');
      console.log(`Database service finds ${shiftReportArchives.length} SHIFT_REPORT archives`);
      
    } else {
      console.log('\n✅ Results match - no API vs service discrepancy');
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
    if (error.response) {
      console.error('API Error Response:', error.response.data);
    }
  }
}

debugApiVsDirect().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});