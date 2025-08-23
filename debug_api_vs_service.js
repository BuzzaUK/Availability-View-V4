const axios = require('axios');
const reportService = require('./src/backend/services/reportService');

async function debugApiVsService() {
  try {
    console.log('=== Comparing API vs Service Results ===\n');
    
    // Test 1: Direct service call
    console.log('🔍 1. Direct reportService.getArchivedShiftReports() call:');
    const serviceResults = await reportService.getArchivedShiftReports();
    console.log('Service returned', serviceResults.length, 'archives:');
    serviceResults.forEach((archive, index) => {
      console.log(`  ${index + 1}. ID: ${archive.id}, Title: ${archive.title}`);
      console.log(`     Date Range: ${archive.date_range_start} to ${archive.date_range_end}`);
    });
    
    // Test 2: API call
    console.log('\n🔍 2. API endpoint /api/reports/shifts call:');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Get shift reports via API
    const apiResponse = await axios.get('http://localhost:5000/api/reports/shifts');
    const apiResults = apiResponse.data.data;
    
    console.log('API returned', apiResults.length, 'reports:');
    apiResults.forEach((report, index) => {
      console.log(`  ${index + 1}. ID: ${report.id}, Archive ID: ${report.archive_id}, Title: ${report.title}`);
      console.log(`     Start: ${report.start_time}, End: ${report.end_time}, Duration: ${report.duration}`);
    });
    
    // Test 3: Comparison
    console.log('\n🔍 3. Comparison Analysis:');
    console.log(`Service found ${serviceResults.length} archives`);
    console.log(`API returned ${apiResults.length} reports`);
    
    if (serviceResults.length !== apiResults.length) {
      console.log('❌ MISMATCH: Different number of results!');
    }
    
    // Check if API results match service results
    const serviceIds = serviceResults.map(a => a.id).sort();
    const apiIds = apiResults.map(r => r.archive_id || r.id).sort();
    
    console.log('Service IDs:', serviceIds);
    console.log('API IDs:', apiIds);
    
    if (JSON.stringify(serviceIds) !== JSON.stringify(apiIds)) {
      console.log('❌ CRITICAL: API is returning different archive IDs than the service!');
      console.log('This indicates a data serving issue in the API layer.');
    } else {
      console.log('✅ Archive IDs match between service and API');
    }
    
    console.log('\n✅ Analysis completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.data);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

// Add a small delay to let any initialization complete
setTimeout(debugApiVsService, 1000);