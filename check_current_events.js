const databaseService = require('./src/backend/services/databaseService');
const { sequelize } = require('./src/backend/models/database');

// Disable SQL logging for cleaner output
sequelize.options.logging = false;

async function checkCurrentEvents() {
  console.log('🔍 CHECKING CURRENT EVENTS IN DATABASE');
  console.log('=' + '='.repeat(50));
  
  try {
    const eventsResult = await databaseService.getAllEvents();
    const events = eventsResult.rows || [];
    console.log(`Total events in database: ${events.length}`);
    
    console.log('\nEvent breakdown:');
    events.forEach((event, index) => {
      const assetName = event.asset ? event.asset.name : 'Unknown Asset';
      console.log(`${index + 1}. ${event.timestamp} - ${assetName} - ${event.event_type} - ${event.new_state || event.previous_state}`);
    });
    
    console.log('\n📊 Event Type Summary:');
    const eventTypes = {};
    events.forEach(event => {
      eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
    });
    
    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} events`);
    });
    
    // Check current shift events specifically
    console.log('\n🕐 CHECKING CURRENT SHIFT EVENTS');
    const currentShift = await databaseService.getCurrentShift();
    if (currentShift) {
      console.log(`Current shift: ${currentShift.shift_name} (${currentShift.start_time} - ${currentShift.end_time || 'ongoing'})`);
      
      const shiftEvents = events.filter(event => {
        const eventTime = new Date(event.timestamp);
        const shiftStart = new Date(currentShift.start_time);
        const shiftEnd = currentShift.end_time ? new Date(currentShift.end_time) : new Date();
        return eventTime >= shiftStart && eventTime <= shiftEnd;
      });
      
      console.log(`Events in current shift: ${shiftEvents.length}`);
      shiftEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.timestamp} - ${event.asset_name} - ${event.event_type} - ${event.state}`);
      });
    } else {
      console.log('No active shift found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkCurrentShiftEvents() {
  console.log('\n=== CURRENT SHIFT EVENTS ===');
  
  try {
    // Get current shift
    const currentShift = await databaseService.getCurrentShift();
    if (!currentShift) {
      console.log('No active shift found');
      return [];
    }
    
    console.log(`Current shift: ${currentShift.id} (started: ${currentShift.start_time})`);
    
    // Get events for current shift
    const shiftEventsResult = await databaseService.getAllEvents({
      where: { shift_id: currentShift.id }
    });
    const shiftEvents = shiftEventsResult.rows || [];
    
    console.log(`Events in current shift: ${shiftEvents.length}`);
    
    shiftEvents.forEach((event, index) => {
      const assetName = event.asset ? event.asset.name : 'Unknown Asset';
      console.log(`  ${index + 1}. ${event.timestamp} - ${assetName} - ${event.event_type}`);
    });
    
    return shiftEvents;
  } catch (error) {
    console.error('Error checking current shift events:', error.message);
    return [];
  }
}

async function summarizeEventTypes() {
  console.log('\n=== EVENT TYPE SUMMARY ===');
  
  try {
    const eventsResult = await databaseService.getAllEvents();
    const events = eventsResult.rows || [];
    const eventTypeCounts = {};
    
    events.forEach(event => {
      const type = event.event_type;
      eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
    });
    
    console.log('Event type distribution:');
    Object.entries(eventTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    return eventTypeCounts;
  } catch (error) {
    console.error('Error summarizing event types:', error.message);
    return {};
  }
}

checkCurrentEvents().catch(console.error);