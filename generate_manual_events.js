const databaseService = require('./src/backend/services/databaseService');
const { sequelize } = require('./src/backend/config/database');

// Generate manual events to simulate what should happen during a shift
async function generateManualEvents() {
  console.log('🔧 GENERATING MANUAL EVENTS FOR TESTING');
  console.log('=' .repeat(50));
  
  try {
    // Wait for database to be ready
    await databaseService.initializeDatabase();
    
    // Get current shift
    const currentShift = await databaseService.getCurrentShift();
    if (!currentShift) {
      console.log('❌ No active shift found. Starting a new shift first...');
      
      // Create a new shift
      const newShift = await databaseService.createShift({
        shift_name: 'Manual Test Shift - ' + new Date().toLocaleDateString(),
        shift_number: 1,
        start_time: new Date(),
        status: 'active'
      });
      
      console.log('✅ Created new shift:', newShift.shift_name);
      
      // Generate SHIFT_START events for this shift
      const assets = await databaseService.getAllAssets();
      const assetsData = assets.rows || assets || [];
      
      for (const asset of assetsData.slice(0, 2)) { // Use first 2 assets
        await databaseService.createEvent({
          asset_id: asset.id,
          shift_id: newShift.id,
          event_type: 'SHIFT_START',
          previous_state: 'STOPPED',
          new_state: 'RUNNING',
          timestamp: new Date(),
          duration: 0,
          stop_reason: 'Shift started manually',
          logger_id: asset.logger_id || 1
        });
        
        console.log(`✅ Created SHIFT_START event for ${asset.name}`);
      }
    }
    
    // Get the current shift (either existing or newly created)
    const activeShift = await databaseService.getCurrentShift();
    console.log(`\n🔄 Working with shift: ${activeShift.shift_name} (ID: ${activeShift.id})`);
    
    // Get available assets
    const assetsResult = await databaseService.getAllAssets();
    const assets = assetsResult.rows || assetsResult || [];
    
    if (assets.length === 0) {
      console.log('❌ No assets found in database');
      return;
    }
    
    console.log(`\n📋 Found ${assets.length} assets:`);
    assets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.name} (ID: ${asset.id})`);
    });
    
    // Generate various types of events that would occur during a shift
    const eventTypes = [
      { type: 'STOP', prev: 'RUNNING', new: 'STOPPED', reason: 'Material change required' },
      { type: 'START', prev: 'STOPPED', new: 'RUNNING', reason: 'Material change completed' },
      { type: 'MAINTENANCE', prev: 'RUNNING', new: 'MAINTENANCE', reason: 'Scheduled maintenance check' },
      { type: 'START', prev: 'MAINTENANCE', new: 'RUNNING', reason: 'Maintenance completed' },
      { type: 'QUALITY_CHECK', prev: 'RUNNING', new: 'STOPPED', reason: 'Quality inspection' },
      { type: 'START', prev: 'STOPPED', new: 'RUNNING', reason: 'Quality check passed' },
      { type: 'MICRO_STOP', prev: 'RUNNING', new: 'STOPPED', reason: 'Minor jam cleared' },
      { type: 'START', prev: 'STOPPED', new: 'RUNNING', reason: 'Production resumed' }
    ];
    
    console.log(`\n🎯 Generating ${eventTypes.length} manual events...`);
    
    const baseTime = new Date();
    
    for (let i = 0; i < eventTypes.length; i++) {
      const eventType = eventTypes[i];
      const asset = assets[i % assets.length]; // Rotate through assets
      
      // Create event with timestamps spread over the last hour
      const eventTime = new Date(baseTime.getTime() - (eventTypes.length - i) * 5 * 60 * 1000); // 5 minutes apart
      
      const eventData = {
        asset_id: asset.id,
        shift_id: activeShift.id,
        event_type: eventType.type,
        previous_state: eventType.prev,
        new_state: eventType.new,
        timestamp: eventTime,
        duration: Math.floor(Math.random() * 300 + 60) * 1000, // 1-5 minutes in milliseconds
        stop_reason: eventType.reason,
        logger_id: asset.logger_id || 1,
        metadata: {
          manually_generated: true,
          test_event: true
        }
      };
      
      await databaseService.createEvent(eventData);
      
      console.log(`  ✅ ${i + 1}. ${eventTime.toLocaleTimeString()} - ${asset.name} - ${eventType.type} (${eventType.prev} → ${eventType.new})`);
    }
    
    // Check final event count
    console.log('\n📊 FINAL EVENT COUNT:');
    const allEventsResult = await databaseService.getAllEvents();
    const allEvents = allEventsResult.rows || [];
    
    console.log(`Total events in database: ${allEvents.length}`);
    
    // Group by event type
    const eventTypeCounts = {};
    allEvents.forEach(event => {
      eventTypeCounts[event.event_type] = (eventTypeCounts[event.event_type] || 0) + 1;
    });
    
    console.log('\nEvent breakdown by type:');
    Object.entries(eventTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Show events for current shift
    const shiftEventsResult = await databaseService.getAllEvents({
      where: { shift_id: activeShift.id }
    });
    const shiftEvents = shiftEventsResult.rows || [];
    
    console.log(`\n🔄 Events for current shift (${activeShift.shift_name}): ${shiftEvents.length}`);
    
    console.log('\n✅ Manual event generation completed!');
    console.log('\n💡 Now you can:');
    console.log('   1. Check the Events page in the frontend to see the new events');
    console.log('   2. Create an archive to test if all events are captured');
    console.log('   3. End the shift to trigger automatic archiving');
    
  } catch (error) {
    console.error('❌ Error generating manual events:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

generateManualEvents().catch(console.error);