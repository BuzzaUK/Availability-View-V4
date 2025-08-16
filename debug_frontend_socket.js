const databaseService = require('./src/backend/services/databaseService');
const { Shift } = require('./src/backend/models/database');

// Debug what data is being sent to frontend via socket events
async function debugFrontendSocket() {
  console.log('🔍 DEBUGGING FRONTEND SOCKET DATA');
  console.log('='.repeat(50));
  
  try {
    // 1. Check what server.js sends on new connection
    console.log('\n1. Checking what server.js sends on new connection...');
    const activeShift = await Shift.findOne({ 
      where: { status: 'active' }, 
      order: [['created_at', 'DESC']] 
    });
    
    if (activeShift) {
      const shiftData = {
        id: activeShift.id,
        name: activeShift.shift_name,  // This is what server.js sends
        start_time: activeShift.start_time,
        status: activeShift.status
      };
      
      console.log('✅ Server would send this shift_update data:');
      console.log('   ', JSON.stringify(shiftData, null, 2));
      
      // Verify the name field
      if (shiftData.name && shiftData.name !== 'undefined') {
        console.log('✅ shift_update.name is properly set:', shiftData.name);
      } else {
        console.log('❌ shift_update.name is undefined or missing!');
      }
      
    } else {
      console.log('❌ No active shift found - server would not send shift_update');
    }
    
    // 2. Check what the frontend components expect
    console.log('\n2. Frontend component expectations:');
    console.log('   TopNavLayout.js expects: currentShift.name');
    console.log('   Sidebar.js expects: currentShift.name');
    console.log('   EventsPage.js expects: currentShift.shift_name || currentShift.name');
    
    // 3. Check if there's a mismatch in the data structure
    console.log('\n3. Data structure analysis:');
    if (activeShift) {
      console.log('   Database field: shift_name =', activeShift.shift_name);
      console.log('   Database field: name =', activeShift.name || 'undefined');
      console.log('   Server maps: shift_name -> name (in socket data)');
      console.log('   Frontend expects: currentShift.name');
      
      if (activeShift.shift_name) {
        console.log('\n✅ ANALYSIS RESULT:');
        console.log('   - Database has shift_name:', activeShift.shift_name);
        console.log('   - Server correctly maps shift_name to name in socket data');
        console.log('   - Frontend should receive name properly');
        console.log('   - If frontend shows "undefined", the issue is likely:');
        console.log('     a) Socket connection not working');
        console.log('     b) Frontend not receiving shift_update events');
        console.log('     c) Frontend state not being updated properly');
      }
    }
    
    // 4. Test the actual socket server if it's running
    console.log('\n4. Testing socket server availability...');
    try {
      const server = require('./src/backend/server');
      if (server && server.io) {
        console.log('✅ Socket.IO server is available');
        
        // Simulate what happens when a client connects
        console.log('\n5. Simulating client connection behavior...');
        if (activeShift) {
          const shiftData = {
            id: activeShift.id,
            name: activeShift.shift_name,
            start_time: activeShift.start_time,
            status: activeShift.status
          };
          
          console.log('   Server would emit shift_update with:', JSON.stringify(shiftData, null, 2));
          console.log('   Frontend SocketContext would receive this and call: setCurrentShift(shift)');
          console.log('   TopNavLayout would then display: currentShift.name =', shiftData.name);
          
          if (shiftData.name) {
            console.log('\n✅ EXPECTED RESULT: Frontend should display "Shift:', shiftData.name, '"');
          } else {
            console.log('\n❌ PROBLEM: shiftData.name is undefined!');
          }
        }
      } else {
        console.log('❌ Socket.IO server is not available');
      }
    } catch (error) {
      console.log('❌ Error accessing socket server:', error.message);
    }
    
    console.log('\n='.repeat(50));
    console.log('✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugFrontendSocket().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});