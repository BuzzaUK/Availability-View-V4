const http = require('http');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost';
const PORT = 5000;
const OUTPUT_FILE = 'analytics_verification_report.json';

// Authentication credentials
const AUTH_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123'
};

let authToken = null;

// Test scenarios with different time periods
const TEST_SCENARIOS = [
  {
    name: 'Last 24 Hours',
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString()
  },
  {
    name: 'Last 7 Days',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString()
  },
  {
    name: 'Last 30 Days',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString()
  }
];

// Helper function to authenticate and get JWT token
const authenticate = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(AUTH_CREDENTIALS);
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.token) {
            authToken = response.token;
            resolve(response.token);
          } else {
            reject(new Error('Authentication failed: ' + (response.message || 'Unknown error')));
          }
        } catch (error) {
          reject(new Error('Failed to parse authentication response'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// Helper function to make HTTP requests
const makeRequest = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add authorization header if token is available
    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Helper function to format time in HH:MM:SS
function formatTime(seconds) {
  if (!seconds || seconds === 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to calculate Dashboard-style metrics from assets
function calculateDashboardMetrics(assets) {
  if (!assets || assets.length === 0) {
    return {
      systemAvailability: 0,
      totalRuntime: 0,
      totalDowntime: 0,
      totalStops: 0,
      assets: []
    };
  }

  let totalRuntime = 0;
  let totalDowntime = 0;
  let totalStops = 0;
  let runningAssets = 0;

  const assetMetrics = assets.map(asset => {
    const status = asset.current_state || 'STOPPED';
    if (status === 'RUNNING') runningAssets++;

    // Dashboard uses asset.runtime and asset.downtime directly (in seconds)
    const runtimeSeconds = asset.runtime || 0;
    const downtimeSeconds = asset.downtime || 0;
    const stops = asset.total_stops || 0;

    totalRuntime += runtimeSeconds;
    totalDowntime += downtimeSeconds;
    totalStops += stops;

    const totalTime = runtimeSeconds + downtimeSeconds;
    const availability = totalTime > 0 ? (runtimeSeconds / totalTime) * 100 : 0;

    return {
      id: asset.id,
      name: asset.name,
      status: status,
      availability: parseFloat(availability.toFixed(2)),
      runtime_hours: parseFloat((runtimeSeconds / 3600).toFixed(2)),
      downtime_hours: parseFloat((downtimeSeconds / 3600).toFixed(2)),
      total_stops: stops
    };
  });

  // Dashboard calculates system availability as average of individual asset availabilities
  const systemAvailability = assetMetrics.length > 0 
    ? assetMetrics.reduce((sum, asset) => sum + asset.availability, 0) / assetMetrics.length 
    : 0;

  return {
    systemAvailability: parseFloat(systemAvailability.toFixed(2)),
    totalRuntime: parseFloat((totalRuntime / 3600).toFixed(2)),
    totalDowntime: parseFloat((totalDowntime / 3600).toFixed(2)),
    totalStops,
    assets: assetMetrics
  };
}

// Function to compare two metric values with tolerance
function compareMetrics(value1, value2, tolerance = 0.01, label = '') {
  const diff = Math.abs(value1 - value2);
  const isMatch = diff <= tolerance;
  return {
    match: isMatch,
    difference: parseFloat(diff.toFixed(4)),
    value1,
    value2,
    label,
    tolerance
  };
}

// Main verification function
async function verifyAnalyticsAccuracy() {
  console.log('🔍 Starting Analytics Data Accuracy Verification...');
  console.log('=' .repeat(60));
  
  // Step 1: Authenticate
  console.log('🔐 Authenticating...');
  try {
    await authenticate();
    console.log('✅ Authentication successful');
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    console.log('\n⚠️  Cannot proceed without authentication. Please ensure:');
    console.log('   - Backend server is running');
    console.log('   - Admin user exists with credentials: admin@example.com / admin123');
    return;
  }

  const verificationResults = {
    timestamp: new Date().toISOString(),
    scenarios: [],
    summary: {
      total_tests: 0,
      passed_tests: 0,
      failed_tests: 0,
      discrepancies: []
    }
  };

  try {
    // First, get all assets for Dashboard comparison
    console.log('📊 Fetching assets data for Dashboard comparison...');
    const assetsResponse = await makeRequest('/api/assets');
    
    if (assetsResponse.statusCode !== 200) {
      throw new Error(`Failed to fetch assets: ${assetsResponse.statusCode}`);
    }

    const assets = assetsResponse.data.assets || assetsResponse.data;
    console.log(`✅ Found ${assets.length} assets`);

    // Test each scenario
    for (const scenario of TEST_SCENARIOS) {
      console.log(`\n🧪 Testing Scenario: ${scenario.name}`);
      console.log(`   Date Range: ${scenario.start_date.split('T')[0]} to ${scenario.end_date.split('T')[0]}`);
      
      const scenarioResult = {
        name: scenario.name,
        date_range: {
          start: scenario.start_date,
          end: scenario.end_date
        },
        tests: [],
        discrepancies: []
      };

      try {
        // 1. Test Analytics Availability endpoint
        console.log('   📈 Testing Analytics Availability endpoint...');
        const analyticsPath = `/api/analytics/availability?start_date=${encodeURIComponent(scenario.start_date)}&end_date=${encodeURIComponent(scenario.end_date)}`;
        const analyticsResponse = await makeRequest(analyticsPath);
        
        if (analyticsResponse.statusCode !== 200) {
          throw new Error(`Analytics API failed: ${analyticsResponse.statusCode}`);
        }

        const analyticsData = analyticsResponse.data.data;
        console.log(`   ✅ Analytics API responded successfully`);

        // 2. Calculate Dashboard metrics for comparison
        console.log('   🎯 Calculating Dashboard-style metrics...');
        const dashboardMetrics = calculateDashboardMetrics(assets);
        console.log(`   ✅ Dashboard metrics calculated`);

        // 3. Compare key metrics
        console.log('   🔍 Comparing key metrics...');
        
        // System Availability Comparison
        const availabilityComparison = compareMetrics(
          analyticsData.overview.overall_availability,
          dashboardMetrics.systemAvailability,
          0.1, // 0.1% tolerance
          'System Availability (%)'
        );
        scenarioResult.tests.push(availabilityComparison);
        verificationResults.summary.total_tests++;
        
        if (availabilityComparison.match) {
          console.log(`   ✅ System Availability: Analytics ${availabilityComparison.value1}% ≈ Dashboard ${availabilityComparison.value2}%`);
          verificationResults.summary.passed_tests++;
        } else {
          console.log(`   ❌ System Availability: Analytics ${availabilityComparison.value1}% ≠ Dashboard ${availabilityComparison.value2}% (diff: ${availabilityComparison.difference}%)`);
          verificationResults.summary.failed_tests++;
          scenarioResult.discrepancies.push(availabilityComparison);
        }

        // Total Runtime Comparison
        const runtimeComparison = compareMetrics(
          analyticsData.overview.total_runtime_hours,
          dashboardMetrics.totalRuntime,
          0.01, // 0.01 hour tolerance
          'Total Runtime (hours)'
        );
        scenarioResult.tests.push(runtimeComparison);
        verificationResults.summary.total_tests++;
        
        if (runtimeComparison.match) {
          console.log(`   ✅ Total Runtime: Analytics ${runtimeComparison.value1}h ≈ Dashboard ${runtimeComparison.value2}h`);
          verificationResults.summary.passed_tests++;
        } else {
          console.log(`   ❌ Total Runtime: Analytics ${runtimeComparison.value1}h ≠ Dashboard ${runtimeComparison.value2}h (diff: ${runtimeComparison.difference}h)`);
          verificationResults.summary.failed_tests++;
          scenarioResult.discrepancies.push(runtimeComparison);
        }

        // Total Downtime Comparison
        const downtimeComparison = compareMetrics(
          analyticsData.overview.total_downtime_hours,
          dashboardMetrics.totalDowntime,
          0.01, // 0.01 hour tolerance
          'Total Downtime (hours)'
        );
        scenarioResult.tests.push(downtimeComparison);
        verificationResults.summary.total_tests++;
        
        if (downtimeComparison.match) {
          console.log(`   ✅ Total Downtime: Analytics ${downtimeComparison.value1}h ≈ Dashboard ${downtimeComparison.value2}h`);
          verificationResults.summary.passed_tests++;
        } else {
          console.log(`   ❌ Total Downtime: Analytics ${downtimeComparison.value1}h ≠ Dashboard ${downtimeComparison.value2}h (diff: ${downtimeComparison.difference}h)`);
          verificationResults.summary.failed_tests++;
          scenarioResult.discrepancies.push(downtimeComparison);
        }

        // Total Stops Comparison
        const stopsComparison = compareMetrics(
          analyticsData.overview.total_stops,
          dashboardMetrics.totalStops,
          0, // Exact match for stops
          'Total Stops'
        );
        scenarioResult.tests.push(stopsComparison);
        verificationResults.summary.total_tests++;
        
        if (stopsComparison.match) {
          console.log(`   ✅ Total Stops: Analytics ${stopsComparison.value1} = Dashboard ${stopsComparison.value2}`);
          verificationResults.summary.passed_tests++;
        } else {
          console.log(`   ❌ Total Stops: Analytics ${stopsComparison.value1} ≠ Dashboard ${stopsComparison.value2} (diff: ${stopsComparison.difference})`);
          verificationResults.summary.failed_tests++;
          scenarioResult.discrepancies.push(stopsComparison);
        }

        // 4. Test individual asset metrics
        console.log('   🏭 Testing individual asset metrics...');
        for (const analyticsAsset of analyticsData.assets) {
          const dashboardAsset = dashboardMetrics.assets.find(a => a.id === analyticsAsset.asset_id);
          
          if (dashboardAsset) {
            // Asset Availability
            const assetAvailabilityComparison = compareMetrics(
              analyticsAsset.availability,
              dashboardAsset.availability,
              0.1,
              `${analyticsAsset.asset_name} Availability (%)`
            );
            scenarioResult.tests.push(assetAvailabilityComparison);
            verificationResults.summary.total_tests++;
            
            if (assetAvailabilityComparison.match) {
              verificationResults.summary.passed_tests++;
            } else {
              console.log(`   ❌ ${analyticsAsset.asset_name} Availability: Analytics ${assetAvailabilityComparison.value1}% ≠ Dashboard ${assetAvailabilityComparison.value2}%`);
              verificationResults.summary.failed_tests++;
              scenarioResult.discrepancies.push(assetAvailabilityComparison);
            }

            // Asset Runtime
            const assetRuntimeComparison = compareMetrics(
              analyticsAsset.runtime_hours,
              dashboardAsset.runtime_hours,
              0.01,
              `${analyticsAsset.asset_name} Runtime (hours)`
            );
            scenarioResult.tests.push(assetRuntimeComparison);
            verificationResults.summary.total_tests++;
            
            if (assetRuntimeComparison.match) {
              verificationResults.summary.passed_tests++;
            } else {
              console.log(`   ❌ ${analyticsAsset.asset_name} Runtime: Analytics ${assetRuntimeComparison.value1}h ≠ Dashboard ${assetRuntimeComparison.value2}h`);
              verificationResults.summary.failed_tests++;
              scenarioResult.discrepancies.push(assetRuntimeComparison);
            }

            // Asset Downtime
            const assetDowntimeComparison = compareMetrics(
              analyticsAsset.downtime_hours,
              dashboardAsset.downtime_hours,
              0.01,
              `${analyticsAsset.asset_name} Downtime (hours)`
            );
            scenarioResult.tests.push(assetDowntimeComparison);
            verificationResults.summary.total_tests++;
            
            if (assetDowntimeComparison.match) {
              verificationResults.summary.passed_tests++;
            } else {
              console.log(`   ❌ ${analyticsAsset.asset_name} Downtime: Analytics ${assetDowntimeComparison.value1}h ≠ Dashboard ${assetDowntimeComparison.value2}h`);
              verificationResults.summary.failed_tests++;
              scenarioResult.discrepancies.push(assetDowntimeComparison);
            }
          }
        }

        console.log(`   ✅ Scenario completed: ${scenarioResult.tests.filter(t => t.match).length}/${scenarioResult.tests.length} tests passed`);
        
      } catch (error) {
        console.error(`   ❌ Scenario failed: ${error.message}`);
        scenarioResult.error = error.message;
      }

      verificationResults.scenarios.push(scenarioResult);
      verificationResults.summary.discrepancies.push(...scenarioResult.discrepancies);
    }

    // 5. Test data source validation
    console.log('\n🔍 Validating data sources and calculation logic...');
    
    // Test Analytics endpoints individually
    const endpoints = [
      '/api/analytics/downtime',
      '/api/analytics/state-distribution',
      '/api/analytics/performance-metrics'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`   📡 Testing ${endpoint}...`);
        const response = await makeRequest(endpoint);
        if (response.statusCode === 200) {
          console.log(`   ✅ ${endpoint} responded successfully`);
        } else {
          console.log(`   ❌ ${endpoint} failed with status ${response.statusCode}`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint} error: ${error.message}`);
      }
    }

    // Generate final report
    console.log('\n📋 VERIFICATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${verificationResults.summary.total_tests}`);
    console.log(`Passed: ${verificationResults.summary.passed_tests}`);
    console.log(`Failed: ${verificationResults.summary.failed_tests}`);
    console.log(`Success Rate: ${((verificationResults.summary.passed_tests / verificationResults.summary.total_tests) * 100).toFixed(1)}%`);
    
    if (verificationResults.summary.discrepancies.length > 0) {
      console.log('\n❌ DISCREPANCIES FOUND:');
      verificationResults.summary.discrepancies.forEach((disc, index) => {
        console.log(`${index + 1}. ${disc.label}: Analytics ${disc.value1} ≠ Dashboard ${disc.value2} (diff: ${disc.difference})`);
      });
    } else {
      console.log('\n✅ No discrepancies found! Analytics and Dashboard data are consistent.');
    }

    // Save detailed report
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(verificationResults, null, 2));
    console.log(`\n📄 Detailed report saved to: ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    verificationResults.error = error.message;
  }

  return verificationResults;
}

// Run verification
if (require.main === module) {
  verifyAnalyticsAccuracy()
    .then(() => {
      console.log('\n🎉 Verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyAnalyticsAccuracy };