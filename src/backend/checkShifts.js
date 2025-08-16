const databaseService = require('./services/databaseService');

async function checkShifts() {
  try {
    console.log('Checking shifts in database...');
    
    const shifts = await databaseService.getShifts();
    console.log('All shifts:', JSON.stringify(shifts, null, 2));
    
    const currentShift = await databaseService.getCurrentShift();
    console.log('Current shift:', JSON.stringify(currentShift, null, 2));
    
    // Check if there are any events
    const events = await databaseService.getAllEvents({ limit: 5 });
    console.log('Recent events count:', events.total || events.length || 0);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkShifts();