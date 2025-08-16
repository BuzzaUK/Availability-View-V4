const http = require('http');
const net = require('net');

// Check if socket server is running and accessible
async function checkSocketServer() {
  console.log('🔍 CHECKING SOCKET SERVER STATUS');
  console.log('='.repeat(50));
  
  try {
    // 1. Check if port 5000 is open
    console.log('\n1. Checking if port 5000 is open...');
    
    const checkPort = () => {
      return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        
        socket.setTimeout(3000);
        
        socket.on('connect', () => {
          console.log('✅ Port 5000 is open and accepting connections');
          socket.destroy();
          resolve(true);
        });
        
        socket.on('timeout', () => {
          console.log('❌ Connection to port 5000 timed out');
          socket.destroy();
          reject(new Error('Connection timeout'));
        });
        
        socket.on('error', (err) => {
          console.log('❌ Cannot connect to port 5000:', err.message);
          reject(err);
        });
        
        socket.connect(5000, 'localhost');
      });
    };
    
    try {
      await checkPort();
    } catch (error) {
      console.log('❌ Port 5000 is not accessible:', error.message);
      return;
    }
    
    // 2. Check if it's an HTTP server
    console.log('\n2. Checking if HTTP server is responding...');
    
    const checkHTTP = () => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/',
          method: 'GET',
          timeout: 3000
        }, (res) => {
          console.log('✅ HTTP server is responding with status:', res.statusCode);
          console.log('   Response headers:', JSON.stringify(res.headers, null, 2));
          resolve(res);
        });
        
        req.on('error', (err) => {
          console.log('❌ HTTP request failed:', err.message);
          reject(err);
        });
        
        req.on('timeout', () => {
          console.log('❌ HTTP request timed out');
          req.destroy();
          reject(new Error('HTTP timeout'));
        });
        
        req.end();
      });
    };
    
    try {
      await checkHTTP();
    } catch (error) {
      console.log('❌ HTTP check failed:', error.message);
    }
    
    // 3. Check if Socket.IO endpoint is available
    console.log('\n3. Checking Socket.IO endpoint...');
    
    const checkSocketIO = () => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/socket.io/',
          method: 'GET',
          timeout: 3000
        }, (res) => {
          console.log('✅ Socket.IO endpoint is responding with status:', res.statusCode);
          
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (data.includes('socket.io') || res.statusCode === 400) {
              console.log('✅ Socket.IO server appears to be running');
            } else {
              console.log('⚠️ Unexpected response from Socket.IO endpoint');
            }
            resolve(res);
          });
        });
        
        req.on('error', (err) => {
          console.log('❌ Socket.IO endpoint check failed:', err.message);
          reject(err);
        });
        
        req.on('timeout', () => {
          console.log('❌ Socket.IO endpoint check timed out');
          req.destroy();
          reject(new Error('Socket.IO timeout'));
        });
        
        req.end();
      });
    };
    
    try {
      await checkSocketIO();
    } catch (error) {
      console.log('❌ Socket.IO check failed:', error.message);
    }
    
    console.log('\n='.repeat(50));
    console.log('✅ Socket server check complete');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the check
checkSocketServer().then(() => {
  console.log('\n✅ Check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});