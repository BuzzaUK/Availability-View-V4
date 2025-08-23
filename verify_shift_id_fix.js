const { sequelize } = require('./src/backend/config/database');
const databaseService = require('./src/backend/services/databaseService');

async function verifyShiftIdFix() {
  console.log('🔍 VERIFYING SHIFT_ID FIX');
  console.log('=' .repeat(50));
  
  try {
    await databaseService.initializeDatabase();
    
    // Get current shift
    const currentShift = await databaseService.getCurrentShift();
    if (!currentShift) {
      console.log('❌ No active shift found');
      return;
    }
    
    console.log(`📊 Current shift: ${currentShift.shift_name} (ID: ${currentShift.id})`);
    console.log(`   Started: ${new Date(currentShift.start_time).toLocaleString()}`);
    
    // Check for any remaining NULL shift_id events
    const [nullShiftEvents] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM events 
      WHERE shift_id IS NULL
    `);
    
    console.log(`\n🔍 NULL shift_id events: ${nullShiftEvents[0].count}`);
    
    // Get events for current shift timeframe
    const [timeframeEvents] = await sequelize.query(`
      SELECT 
        id,
        timestamp,
        event_type,
        shift_id,
        asset_id
      FROM events 
      WHERE timestamp >= ?
      ORDER BY timestamp DESC
      LIMIT 10
    `, {
      replacements: [currentShift.start_time]
    });
    
    console.log(`\n📋 Recent events for current shift timeframe:`);
    if (timeframeEvents.length === 0) {
      console.log('   No events found');
    } else {
      timeframeEvents.forEach((event, i) => {
        const timestamp = new Date(event.timestamp).toLocaleString();
        console.log(`   ${i+1}. ${timestamp} - ${event.event_type} (shift_id: ${event.shift_id || 'NULL'})`);
      });
    }
    
    // Test creating a new event to verify auto-assignment
    console.log('\n🧪 TESTING AUTO-ASSIGNMENT:');
    console.log('Creating a test event without shift_id...');
    
    const testEvent = await databaseService.createEvent({
      asset_id: 1, // Assuming asset ID 1 exists
      event_type: 'TEST_EVENT',
      previous_state: 'STOPPED',
      new_state: 'RUNNING',
      timestamp: new Date(),
      duration: 0,
      stop_reason: 'Testing shift_id auto-assignment',
      logger_id: 1
    });
    
    console.log(`✅ Test event created with ID: ${testEvent.id}`);
    console.log(`   Auto-assigned shift_id: ${testEvent.shift_id}`);
    
    if (testEvent.shift_id === currentShift.id) {
      console.log('🎉 SUCCESS: Auto-assignment working correctly!');
    } else {
      console.log('❌ ISSUE: Auto-assignment not working as expected');
    }
    
    // Compare shift report vs archive filtering
    console.log('\n⚖️ COMPARING FILTERING METHODS:');
    
    // Method 1: Timestamp only (like shift reports)
    const [reportStyleEvents] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM events 
      WHERE timestamp >= ?
    `, {
      replacements: [currentShift.start_time]
    });
    
    // Method 2: Timestamp + shift_id (like event archives)
    const [archiveStyleEvents] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM events 
      WHERE timestamp >= ? AND shift_id = ?
    `, {
      replacements: [currentShift.start_time, currentShift.id]
    });
    
    console.log(`📊 Shift Report method (timestamp only): ${reportStyleEvents[0].count} events`);
    console.log(`📦 Event Archive method (timestamp + shift_id): ${archiveStyleEvents[0].count} events`);
    
    const discrepancy = reportStyleEvents[0].count - archiveStyleEvents[0].count;
    if (discrepancy === 0) {
      console.log('✅ NO DISCREPANCY: Both methods return the same count!');
    } else {
      console.log(`⚠️ DISCREPANCY: ${discrepancy} events difference`);
    }
    
    // Clean up test event
    await sequelize.query(`DELETE FROM events WHERE id = ?`, {
      replacements: [testEvent.id]
    });
    console.log('🧹 Test event cleaned up');
    
  } catch (error) {
    console.error('❌ Error verifying shift_id fix:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

verifyShiftIdFix().catch(console.error);