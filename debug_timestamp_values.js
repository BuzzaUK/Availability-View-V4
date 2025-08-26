const { Event } = require('./src/backend/models/database');
const databaseService = require('./src/backend/services/databaseService');

async function debugTimestampValues() {
  try {
    console.log('🔍 Debugging Timestamp Values');
    console.log('=' .repeat(60));
    
    // Get all events for shifts 74, 75, 76
    const targetShifts = [74, 75, 76];
    
    for (const shiftId of targetShifts) {
      console.log(`\n📊 Shift ${shiftId} Events:`);
      
      const events = await Event.findAll({
        where: { shift_id: shiftId },
        attributes: ['id', 'timestamp', 'event_type', 'new_state', 'asset_id'],
        order: [['id', 'ASC']],
        limit: 10
      });
      
      console.log(`   Found ${events.length} events`);
      
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. Event ${event.id}:`);
        console.log(`      Timestamp: ${event.timestamp}`);
        console.log(`      Type: ${typeof event.timestamp}`);
        console.log(`      String: '${String(event.timestamp)}'`);
        console.log(`      Event Type: ${event.event_type}`);
        console.log(`      Asset: ${event.asset_id}`);
        console.log(`      ---`);
      });
      
      // Try to parse timestamps
      console.log(`\n   Timestamp Analysis:`);
      const timestampAnalysis = {
        valid: 0,
        invalid: 0,
        null: 0,
        invalidDate: 0
      };
      
      events.forEach(event => {
        if (event.timestamp === null || event.timestamp === undefined) {
          timestampAnalysis.null++;
        } else if (String(event.timestamp) === 'Invalid Date') {
          timestampAnalysis.invalidDate++;
        } else {
          const date = new Date(event.timestamp);
          if (isNaN(date.getTime())) {
            timestampAnalysis.invalid++;
          } else {
            timestampAnalysis.valid++;
          }
        }
      });
      
      console.log(`     Valid timestamps: ${timestampAnalysis.valid}`);
      console.log(`     Invalid Date strings: ${timestampAnalysis.invalidDate}`);
      console.log(`     Unparseable timestamps: ${timestampAnalysis.invalid}`);
      console.log(`     Null timestamps: ${timestampAnalysis.null}`);
    }
    
    // Check all events with problematic timestamps
    console.log(`\n🔍 All Events with Problematic Timestamps:`);
    
    const allEvents = await Event.findAll({
      attributes: ['id', 'timestamp', 'shift_id', 'event_type'],
      order: [['id', 'ASC']]
    });
    
    console.log(`   Total events in database: ${allEvents.length}`);
    
    const problemEvents = allEvents.filter(event => {
      if (event.timestamp === null || event.timestamp === undefined) return true;
      if (String(event.timestamp) === 'Invalid Date') return true;
      const date = new Date(event.timestamp);
      return isNaN(date.getTime());
    });
    
    console.log(`   Events with problematic timestamps: ${problemEvents.length}`);
    
    if (problemEvents.length > 0) {
      console.log(`\n   Sample problematic events:`);
      problemEvents.slice(0, 10).forEach((event, index) => {
        console.log(`     ${index + 1}. Event ${event.id} (Shift ${event.shift_id}): '${event.timestamp}' (${typeof event.timestamp})`);
      });
      
      // Group by shift_id
      const byShift = {};
      problemEvents.forEach(event => {
        const shiftId = event.shift_id || 'null';
        byShift[shiftId] = (byShift[shiftId] || 0) + 1;
      });
      
      console.log(`\n   Problem events by shift:`);
      Object.entries(byShift).forEach(([shiftId, count]) => {
        console.log(`     Shift ${shiftId}: ${count} events`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugTimestampValues();