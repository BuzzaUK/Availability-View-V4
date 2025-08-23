const reportController = require('./src/backend/controllers/reportController');

async function debugDirectController() {
  try {
    console.log('=== Direct Controller Function Test ===\n');
    
    // Create mock request and response objects
    const mockReq = {
      query: {
        page: 1,
        limit: 10,
        search: '',
        startDate: undefined,
        endDate: undefined
      }
    };
    
    let responseData = null;
    let responseStatus = null;
    
    const mockRes = {
      status: function(code) {
        responseStatus = code;
        return this;
      },
      json: function(data) {
        responseData = data;
        return this;
      }
    };
    
    console.log('🔍 Calling reportController.getShiftReports directly...');
    
    // Call the controller function directly
    await reportController.getShiftReports(mockReq, mockRes);
    
    console.log('\n📊 Direct Controller Results:');
    console.log('Status:', responseStatus);
    console.log('Success:', responseData?.success);
    console.log('Data length:', responseData?.data?.length || 0);
    console.log('Total:', responseData?.total);
    
    if (responseData?.data && responseData.data.length > 0) {
      console.log('\n📋 First report from direct controller call:');
      const firstReport = responseData.data[0];
      console.log('  ID:', firstReport.id);
      console.log('  Archive ID:', firstReport.archive_id);
      console.log('  Title:', firstReport.title);
      console.log('  Start Time:', firstReport.start_time);
      console.log('  End Time:', firstReport.end_time);
      console.log('  Duration:', firstReport.duration);
      
      console.log('\n📋 All reports from direct controller call:');
      responseData.data.forEach((report, index) => {
        console.log(`  ${index + 1}. ID: ${report.id}, Archive ID: ${report.archive_id}`);
        console.log(`     Title: ${report.title}`);
        console.log(`     Duration: ${report.duration}`);
      });
    } else {
      console.log('❌ No data returned from direct controller call');
    }
    
    // Now compare with API call
    console.log('\n🔍 Comparing with API call...');
    const axios = require('axios');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    const apiResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const apiResults = apiResponse.data.data;
    console.log(`API returned ${apiResults.length} reports`);
    
    if (apiResults.length > 0) {
      console.log('\n📋 First report from API call:');
      const firstApiReport = apiResults[0];
      console.log('  ID:', firstApiReport.id);
      console.log('  Archive ID:', firstApiReport.archive_id);
      console.log('  Title:', firstApiReport.title);
      console.log('  Start Time:', firstApiReport.start_time);
      console.log('  End Time:', firstApiReport.end_time);
      console.log('  Duration:', firstApiReport.duration);
    }
    
    // Final comparison
    console.log('\n🔍 Final Analysis:');
    const directCount = responseData?.data?.length || 0;
    const apiCount = apiResults.length;
    
    console.log(`Direct controller: ${directCount} reports`);
    console.log(`API endpoint: ${apiCount} reports`);
    
    if (directCount === apiCount && directCount > 0) {
      console.log('✅ Direct controller and API match - Issue resolved!');
      
      // Check if the data is identical
      const directIds = responseData.data.map(r => r.archive_id).sort();
      const apiIds = apiResults.map(r => r.archive_id).sort();
      
      if (JSON.stringify(directIds) === JSON.stringify(apiIds)) {
        console.log('✅ Data is identical - The issue has been fixed!');
      } else {
        console.log('⚠️ Data counts match but content differs');
        console.log('Direct IDs:', directIds);
        console.log('API IDs:', apiIds);
      }
    } else {
      console.log('❌ CRITICAL: Direct controller and API still mismatch!');
      console.log('❌ This suggests there is middleware or routing interference');
    }
    
    console.log('\n✅ Direct controller test completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during direct controller test:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.data);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

// Add a small delay to let any initialization complete
setTimeout(debugDirectController, 1000);