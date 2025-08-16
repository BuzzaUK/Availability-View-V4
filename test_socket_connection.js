const io = require('socket.io-client');

// Test socket connection to see if frontend can connect to backend
async function testSocketConnection() {
  console.log('🔍 TESTING SOCKET CONNECTION');
  console.log('='.repeat(50));
  
  try {
    // Connect to the socket server (same as frontend does)
    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    // Socket connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log('   Socket ID:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Listen for shift_update events
    socket.on('shift_update', (shift) => {
      console.log('\n📡 SHIFT_UPDATE EVENT RECEIVED:');
      console.log('   Raw data:', JSON.stringify(shift, null, 2));
      console.log('   shift.id:', shift?.id);
      console.log('   shift.name:', shift?.name);
      console.log('   shift.start_time:', shift?.start_time);
      console.log('   shift.status:', shift?.status);
      
      if (shift?.name) {
        console.log('✅ Shift name is properly set:', shift.name);
      } else {
        console.log('❌ Shift name is undefined or missing!');
        console.log('   Available properties:', Object.keys(shift || {}));
      }
    });

    // Listen for initial_data events
    socket.on('initial_data', (data) => {
      console.log('\n📡 INITIAL_DATA EVENT RECEIVED:');
      console.log('   Raw data:', JSON.stringify(data, null, 2));
      
      if (data?.currentShift) {
        console.log('   currentShift.id:', data.currentShift?.id);
        console.log('   currentShift.name:', data.currentShift?.name);
        console.log('   currentShift.start_time:', data.currentShift?.start_time);
        console.log('   currentShift.status:', data.currentShift?.status);
        
        if (data.currentShift?.name) {
          console.log('✅ Initial currentShift name is properly set:', data.currentShift.name);
        } else {
          console.log('❌ Initial currentShift name is undefined or missing!');
          console.log('   Available properties:', Object.keys(data.currentShift || {}));
        }
      } else {
        console.log('   No currentShift in initial_data');
      }
    });

    // Keep the connection alive for a few seconds to receive events
    console.log('\n⏳ Waiting for socket events... (will close in 8 seconds)');
    
    setTimeout(() => {
      console.log('\n🔌 Closing socket connection...');
      socket.disconnect();
      console.log('✅ Test completed');
      process.exit(0);
    }, 8000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testSocketConnection().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});