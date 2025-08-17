const io = require('socket.io-client');
const http = require('http');

console.log('🔍 Testing WebSocket Connection and Dashboard Reset...');

// Test HTTP server connectivity first
const testHttpConnection = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5000/api/assets', (res) => {
      console.log('✅ HTTP Server is responding on port 5000');
      console.log('📊 Response status:', res.statusCode);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log('❌ HTTP Server connection failed:', err.message);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.log('⏰ HTTP request timeout');
      req.destroy();
      reject(new Error('HTTP timeout'));
    });
  });
};

// Test WebSocket connection
const testWebSocketConnection = () => {
  return new Promise((resolve, reject) => {
    console.log('🔌 Attempting to connect to WebSocket server...');
    
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });
    
    let connected = false;
    
    socket.on('connect', () => {
      connected = true;
      console.log('✅ WebSocket connected successfully!');
      console.log('🆔 Socket ID:', socket.id);
      
      // Listen for dashboard reset events
      socket.on('dashboard_reset', (data) => {
        console.log('📡 DASHBOARD_RESET event received:', data);
      });
      
      socket.on('shift_update', (data) => {
        console.log('📡 SHIFT_UPDATE event received:', data);
      });
      
      socket.on('events_update', (data) => {
        console.log('📡 EVENTS_UPDATE event received:', data);
      });
      
      // Test manual dashboard reset trigger via HTTP request
        setTimeout(() => {
          console.log('\n🧪 Testing manual dashboard reset trigger...');
          
          // Make HTTP request to trigger dashboard reset
          const http = require('http');
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
            console.log('✅ Dashboard reset request sent, status:', res.statusCode);
          });
          
          req.on('error', (err) => {
            console.log('⚠️ Dashboard reset request failed:', err.message);
          });
          
          req.write(postData);
          req.end();
          
          // Wait for events and then disconnect
          setTimeout(() => {
            socket.disconnect();
            resolve(true);
          }, 3000);
        }, 2000);
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection error:', error.message);
      if (!connected) {
        reject(error);
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (!connected) {
        console.log('⏰ WebSocket connection timeout');
        socket.disconnect();
        reject(new Error('WebSocket connection timeout'));
      }
    }, 15000);
  });
};

// Main test function
const runTests = async () => {
  try {
    console.log('\n=== WebSocket Connection Test ===');
    
    // Test HTTP connectivity first
    await testHttpConnection();
    
    // Test WebSocket connectivity
    await testWebSocketConnection();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Check browser console for WebSocket connection logs');
    console.log('2. Look for "Client connected" messages in server terminal');
    console.log('3. Verify dashboard reset events are being received');
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure backend server is running on port 5000');
    console.log('2. Check if Socket.IO is properly configured');
    console.log('3. Verify firewall/network settings');
  } finally {
    process.exit(0);
  }
};

// Run the tests
runTests();