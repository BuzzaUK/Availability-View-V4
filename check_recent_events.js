const databaseService = require('./src/backend/services/databaseService');

(async () => {
  try {
    const events = await databaseService.getAllEvents();
    const eventsArray = events.rows || events;
    
    console.log('Total events:', eventsArray.length);
    console.log('\nLast 10 events:');
    
    eventsArray.slice(-10).forEach(e => {
      console.log(`ID: ${e.id}, shift_id: ${e.shift_id}, timestamp: ${e.timestamp}, asset: ${e.asset_id || e.asset}`);
    });
    
    // Also check current shift
    const currentShift = await databaseService.getCurrentShift();
    console.log('\nCurrent shift:', currentShift ? `ID: ${currentShift.id}, Name: ${currentShift.name}` : 'None');
    
  } catch (error) {
    console.error('Error:', error);
  }
})();