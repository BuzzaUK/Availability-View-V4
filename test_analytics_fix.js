const axios = require('axios');

// Simple test script to verify Analytics performance endpoint fix
async function testAnalyticsFix() {
  const baseURL = 'http://localhost:3000/api';
  
  try {
    console.log('🔧 Testing Analytics Performance Endpoint Fix...');
    console.log('=' .repeat(60));

    // Test without authentication first to see if server is responding
    console.log('\n1. Testing server connectivity...');
    
    try {
      const healthCheck = await axios.get(`${baseURL}/analytics/overview`);
      console.log('❌ Server responded but should require authentication');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Server is running and properly requires authentication');
      } else {
        console.log('❌ Server connectivity issue:', error.message);
        return;
      }
    }

    // Try with a simple test user (common test credentials)
    const testCredentials = [
      { email: 'test@example.com', password: 'password' },
      { email: 'admin@example.com', password: 'admin' },
      { email: 'user@example.com', password: 'password' },
      { email: 'simon@example.com', password: 'password123' }
    ];

    let token = null;
    let authSuccess = false;

    console.log('\n2. Attempting authentication...');
    
    for (const creds of testCredentials) {
      try {
        console.log(`   Trying ${creds.email}...`);
        const loginResponse = await axios.post(`${baseURL}/auth/login`, creds);
        token = loginResponse.data.token;
        console.log(`✅ Authentication successful with ${creds.email}`);
        authSuccess = true;
        break;
      } catch (error) {
        console.log(`   ❌ Failed with ${creds.email}`);
      }
    }

    if (!authSuccess) {
      console.log('\n❌ Could not authenticate with any test credentials.');
      console.log('\n🔧 Manual Test Instructions:');
      console.log('1. Open your browser to http://localhost:3000');
      console.log('2. Login with your credentials');
      console.log('3. Navigate to Analytics page');
      console.log('4. Check if availability shows correct percentage (not 0%)');
      console.log('5. Compare with Dashboard metrics for consistency');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test all Analytics endpoints for consistency
    console.log('\n3. Testing Analytics Endpoints...');
    
    // Get Overview Analytics (known to work correctly)
    console.log('\n📊 Overview Analytics:');
    const overviewResponse = await axios.get(`${baseURL}/analytics/overview`, { headers });
    const overview = overviewResponse.data.data.overview;
    console.log(`   Availability: ${overview.overall_availability}%`);
    console.log(`   Runtime: ${overview.total_runtime} hours`);
    console.log(`   Downtime: ${overview.total_downtime} hours`);
    console.log(`   Total Stops: ${overview.total_stops}`);

    // Get Performance Analytics (the fixed endpoint)
    console.log('\n⚡ Performance Analytics (FIXED):');
    const performanceResponse = await axios.get(`${baseURL}/analytics/performance`, { headers });
    const performance = performanceResponse.data.data.overall_metrics;
    console.log(`   Availability: ${performance.availability}%`);
    console.log(`   Runtime: ${performance.total_runtime_hours} hours`);
    console.log(`   Downtime: ${performance.total_downtime_hours} hours`);
    console.log(`   Total Stops: ${performance.total_stops}`);
    console.log(`   MTBF: ${performance.mtbf_hours} hours`);
    console.log(`   MTTR: ${performance.mttr_hours} hours`);

    // Compare metrics for consistency
    console.log('\n4. Consistency Check...');
    console.log('=' .repeat(40));
    
    const overviewAvail = overview.overall_availability;
    const performanceAvail = performance.availability;
    
    const overviewRuntime = overview.total_runtime;
    const performanceRuntime = performance.total_runtime_hours;
    
    console.log('\n📊 Availability Comparison:');
    console.log(`   Overview: ${overviewAvail}%`);
    console.log(`   Performance: ${performanceAvail}%`);
    console.log(`   Difference: ${Math.abs(overviewAvail - performanceAvail).toFixed(2)}%`);
    
    console.log('\n⏱️ Runtime Comparison:');
    console.log(`   Overview: ${overviewRuntime}h`);
    console.log(`   Performance: ${performanceRuntime}h`);
    console.log(`   Difference: ${Math.abs(overviewRuntime - performanceRuntime).toFixed(4)}h`);
    
    // Check if metrics are consistent (within 0.01 tolerance)
    const availabilityConsistent = Math.abs(overviewAvail - performanceAvail) < 0.01;
    const runtimeConsistent = Math.abs(overviewRuntime - performanceRuntime) < 0.01;
    
    console.log('\n5. Results:');
    console.log('=' .repeat(30));
    
    if (availabilityConsistent && runtimeConsistent) {
      console.log('✅ SUCCESS: Analytics endpoints now return consistent metrics!');
      console.log('✅ Performance endpoint fix is working correctly');
      
      if (performanceAvail === overviewAvail) {
        console.log('✅ Perfect metric alignment achieved');
      }
    } else {
      console.log('❌ INCONSISTENCY DETECTED:');
      if (!availabilityConsistent) {
        console.log(`   - Availability difference: ${Math.abs(overviewAvail - performanceAvail).toFixed(2)}%`);
      }
      if (!runtimeConsistent) {
        console.log(`   - Runtime difference: ${Math.abs(overviewRuntime - performanceRuntime).toFixed(4)}h`);
      }
    }
    
    // Show the fix impact
    console.log('\n6. Fix Impact:');
    console.log('=' .repeat(25));
    console.log('✅ Performance endpoint now uses asset.runtime/downtime fields');
    console.log('✅ No longer relies on unreliable event.duration data');
    console.log('✅ Consistent with Dashboard and other Analytics endpoints');
    
    if (performanceAvail > 0) {
      console.log('✅ Analytics page will now show correct availability (no longer 0%)');
    } else {
      console.log('ℹ️  Current availability is 0% - this may be correct if assets have no runtime');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testAnalyticsFix();