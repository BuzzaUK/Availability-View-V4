const databaseService = require('./src/backend/services/databaseService');
const { Shift } = require('./src/backend/models/database');

async function debugShiftFrontendConnection() {
  console.log('🔍 DEBUGGING SHIFT FRONTEND CONNECTION');
  console.log('='.repeat(50));
  
  try {
    // 1. Check database current shift using databaseService
    console.log('\n1. Checking database current shift (databaseService)...');
    const dbCurrentShift = await databaseService.getCurrentShift();
    
    if (dbCurrentShift) {
      console.log('✅ Database current shift found:');
      console.log(`   ID: ${dbCurrentShift.id}`);
      console.log(`   Name: ${dbCurrentShift.shift_name}`);
      console.log(`   Status: ${dbCurrentShift.status}`);
      console.log(`   Start: ${dbCurrentShift.start_time}`);
      console.log(`   End: ${dbCurrentShift.end_time}`);
    } else {
      console.log('❌ No current shift found in database (databaseService)');
    }
    
    // 2. Check database current shift using direct Shift model (like server.js does)
    console.log('\n2. Checking database current shift (direct Shift model - like server.js)...');
    const activeShift = await Shift.findOne({ 
      where: { status: 'active' }, 
      order: [['created_at', 'DESC']] 
    });
    
    if (activeShift) {
      console.log('✅ Active shift found (server.js method):');
      console.log(`   ID: ${activeShift.id}`);
      console.log(`   shift_name: ${activeShift.shift_name}`);
      console.log(`   name: ${activeShift.name || 'undefined'}`);
      console.log(`   Status: ${activeShift.status}`);
      console.log(`   Start: ${activeShift.start_time}`);
      console.log(`   End: ${activeShift.end_time}`);
      
      // Show what server.js would send to frontend
      const shiftData = {
        id: activeShift.id,
        name: activeShift.shift_name,  // Server sends shift_name as 'name'
        start_time: activeShift.start_time,
        status: activeShift.status
      };
      
      console.log('\n   📡 Data server.js would send to frontend:');
      console.log('   ', JSON.stringify(shiftData, null, 2));
      
    } else {
      console.log('❌ No active shift found (server.js method)');
    }
    
    // 3. Check all shifts to understand the data structure
    console.log('\n3. Checking all shifts to understand data structure...');
    const allShifts = await Shift.findAll({
      order: [['created_at', 'DESC']],
      limit: 3
    });
    
    console.log(`Found ${allShifts.length} recent shifts:`);
    allShifts.forEach((shift, index) => {
      console.log(`   Shift ${index + 1}:`);
      console.log(`     ID: ${shift.id}`);
      console.log(`     shift_name: "${shift.shift_name}"`);
      console.log(`     name: "${shift.name || 'undefined'}"`);
      console.log(`     status: "${shift.status}"`);
      console.log(`     start_time: ${shift.start_time}`);
      console.log(`     end_time: ${shift.end_time}`);
    });
    
    // 4. Analysis of the issue
    console.log('\n4. ISSUE ANALYSIS:');
    console.log('='.repeat(30));
    
    if (dbCurrentShift && activeShift) {
      console.log('✅ Both methods found the same active shift');
      console.log('\n🔍 Property mapping analysis:');
      console.log(`   Database field: shift_name = "${activeShift.shift_name}"`);
      console.log(`   Database field: name = "${activeShift.name || 'undefined'}"`);
      console.log(`   Server sends: name = "${activeShift.shift_name}" (maps shift_name to name)`);
      
      if (!activeShift.name && activeShift.shift_name) {
        console.log('\n⚠️  POTENTIAL ISSUE IDENTIFIED:');
        console.log('   - Database has shift_name but no name field');
        console.log('   - Server correctly maps shift_name to name in socket data');
        console.log('   - Frontend should receive name properly');
        console.log('   - Issue might be in frontend state management or display logic');
      }
      
    } else if (dbCurrentShift && !activeShift) {
      console.log('⚠️  Mismatch: databaseService found shift but direct query did not');
    } else if (!dbCurrentShift && activeShift) {
      console.log('⚠️  Mismatch: direct query found shift but databaseService did not');
    } else {
      console.log('❌ No active shift found by either method');
      console.log('   This explains why frontend shows "undefined"');
    }
    
    console.log('\n='.repeat(50));
    console.log('✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugShiftFrontendConnection().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});