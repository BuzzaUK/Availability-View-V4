const http = require('http');
const io = require('socket.io-client');

// Test script to verify dashboard reset mechanism
async function testDashboardResetVerification() {
  console.log('🔍 DASHBOARD RESET VERIFICATION TEST');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Check current dashboard data
    console.log('\n📊 STEP 1: Checking current dashboard data...');
    const dashboardData = await fetchDashboardData();
    console.log('Current dashboard state:');
    console.log('  System Availability:', dashboardData.systemAvailability + '%');
    console.log('  Total Runtime:', dashboardData.totalRuntime);
    console.log('  Total Downtime:', dashboardData.totalDowntime);
    console.log('  Total Stops:', dashboardData.totalStops);
    
    if (dashboardData.assets && dashboardData.assets.length > 0) {
      console.log('\n  Asset Details:');
      dashboardData.assets.forEach(asset => {
        console.log(`    ${asset.name}: ${asset.status} (${(asset.availability * 100).toFixed(1)}% availability)`);
        console.log(`      Runtime: ${asset.runtime}, Downtime: ${asset.downtime}, Stops: ${asset.total_stops}`);
      });
    }
    
    // Step 2: Analyze current dashboard state
    console.log('\n🔍 STEP 2: Analyzing current dashboard state...');
    
    if (dashboardData.totalRuntime !== '00:00:00' || dashboardData.totalDowntime !== '00:00:00' || dashboardData.totalStops > 0) {
      console.log('⚠️  ISSUE IDENTIFIED: Dashboard shows non-zero values');
      console.log('   - Runtime:', dashboardData.totalRuntime);
      console.log('   - Downtime:', dashboardData.totalDowntime);
      console.log('   - Total Stops:', dashboardData.totalStops);
      console.log('   This indicates accumulated data that should reset during shift transitions.');
    } else {
      console.log('✅ Dashboard data is properly reset to zero.');
    }
    
    // Step 3: Test WebSocket connection for dashboard reset
    console.log('\n🔌 STEP 3: Testing WebSocket connection for dashboard reset...');
    const socket = await setupWebSocketMonitoring();
    
    // Step 4: Trigger manual dashboard reset
    console.log('\n🧪 STEP 4: Triggering manual dashboard reset...');
    await triggerManualDashboardReset();
    
    // Wait for WebSocket events
    console.log('\n⏳ Waiting for WebSocket events (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 5: Check dashboard data after reset
    console.log('\n📊 STEP 5: Checking dashboard data after reset...');
    const dashboardDataAfter = await fetchDashboardData();
    console.log('Dashboard state after reset:');
    console.log('  System Availability:', dashboardDataAfter.systemAvailability + '%');
    console.log('  Total Runtime:', dashboardDataAfter.totalRuntime);
    console.log('  Total Downtime:', dashboardDataAfter.totalDowntime);
    console.log('  Total Stops:', dashboardDataAfter.totalStops);
    
    // Step 6: Analysis and conclusion
    console.log('\n📋 STEP 6: Analysis and Conclusion');
    const runtimeChanged = dashboardData.totalRuntime !== dashboardDataAfter.totalRuntime;
    const downtimeChanged = dashboardData.totalDowntime !== dashboardDataAfter.totalDowntime;
    const stopsChanged = dashboardData.totalStops !== dashboardDataAfter.totalStops;
    
    if (runtimeChanged || downtimeChanged || stopsChanged) {
      console.log('✅ Dashboard data changed after reset trigger');
      console.log('   - Runtime changed:', runtimeChanged);
      console.log('   - Downtime changed:', downtimeChanged);
      console.log('   - Stops changed:', stopsChanged);
    } else {
      console.log('⚠️  Dashboard data did not change after reset trigger');
    }
    
    if (dashboardDataAfter.totalRuntime === '00:00:00' && 
        dashboardDataAfter.totalDowntime === '00:00:00' && 
        dashboardDataAfter.totalStops === 0) {
      console.log('\n🎉 SUCCESS: Dashboard properly reset to zero values!');
    } else {
      console.log('\n❌ ISSUE: Dashboard still shows non-zero values after reset');
      console.log('   This suggests the reset mechanism is not working as expected.');
    }
    
    socket.disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function to fetch dashboard data
function fetchDashboardData() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/assets',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const assets = response.assets || response; // Handle both formats
          
          if (!Array.isArray(assets)) {
            reject(new Error('Assets data is not an array: ' + typeof assets));
            return;
          }
          
          // Calculate metrics similar to frontend Dashboard.js
          let totalRuntime = 0;
          let totalDowntime = 0;
          let totalStops = 0;
          let runningAssets = 0;
          
          const assetMetrics = assets.map(asset => {
            const status = asset.current_state || 'STOPPED';
            if (status === 'RUNNING') runningAssets++;
            
            const runtimeMs = (asset.runtime || 0) * 1000;
            const downtimeMs = (asset.downtime || 0) * 1000;
            
            totalRuntime += runtimeMs;
            totalDowntime += downtimeMs;
            totalStops += asset.total_stops || 0;
            
            const totalTime = runtimeMs + downtimeMs;
            const availability = totalTime > 0 ? runtimeMs / totalTime : 0;
            
            return {
              name: asset.name,
              status: status,
              availability: availability,
              runtime: formatMilliseconds(runtimeMs),
              downtime: formatMilliseconds(downtimeMs),
              total_stops: asset.total_stops || 0
            };
          });
          
          const systemAvailability = assets.length > 0 ? (runningAssets / assets.length * 100).toFixed(1) : '0.0';
          
          resolve({
            systemAvailability,
            totalRuntime: formatMilliseconds(totalRuntime),
            totalDowntime: formatMilliseconds(totalDowntime),
            totalStops,
            assets: assetMetrics
          });
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Helper function to fetch events data
function fetchEventsData() {
  return new Promise((resolve, reject) => {
    // First authenticate to get token
    const authData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });
    
    const authOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(authData)
      }
    };
    
    const authReq = http.request(authOptions, (authRes) => {
      let authResponseData = '';
      authRes.on('data', chunk => authResponseData += chunk);
      authRes.on('end', () => {
        try {
          const authResponse = JSON.parse(authResponseData);
          const token = authResponse.token;
          
          if (!token) {
            reject(new Error('Authentication failed'));
            return;
          }
          
          // Now fetch events with token
          const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/events',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          };
          
          const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const response = JSON.parse(data);
                const events = response.events || response;
                
                if (!Array.isArray(events)) {
                  console.log('Events response:', typeof events, events);
                  resolve([]); // Return empty array if not array
                } else {
                  resolve(events);
                }
              } catch (parseError) {
                console.log('Events parse error:', parseError.message);
                resolve([]); // Return empty array on parse error
              }
            });
          });
          
          req.on('error', (error) => {
            console.log('Events request error:', error.message);
            resolve([]); // Return empty array on request error
          });
          req.end();
          
        } catch (authParseError) {
          reject(authParseError);
        }
      });
    });
    
    authReq.on('error', reject);
    authReq.write(authData);
    authReq.end();
  });
}

// Helper function to setup WebSocket monitoring
function setupWebSocketMonitoring() {
  return new Promise((resolve, reject) => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true
    });
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected for monitoring');
      
      socket.on('dashboard_reset', (data) => {
        console.log('📡 DASHBOARD_RESET event received:', data.message);
      });
      
      socket.on('shift_update', (data) => {
        console.log('📡 SHIFT_UPDATE event received:', data.message || 'Shift updated');
      });
      
      socket.on('events_update', (data) => {
        console.log('📡 EVENTS_UPDATE event received:', data.message || data.action);
      });
      
      resolve(socket);
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection failed:', error.message);
      reject(error);
    });
    
    setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, 5000);
  });
}

// Helper function to trigger manual dashboard reset
function triggerManualDashboardReset() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ action: 'manual_reset' });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/test/dashboard-reset',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Manual dashboard reset triggered successfully');
          resolve();
        } else {
          reject(new Error(`Dashboard reset failed with status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Helper function to format milliseconds to HH:MM:SS
function formatMilliseconds(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Run the test
testDashboardResetVerification().then(() => {
  console.log('\n✅ Dashboard reset verification test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});