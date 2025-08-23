// Detailed debugging for report generation
const originalLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('Executing (default):')) {
    return; // Suppress database query logs
  }
  originalLog(...args);
};

const reportService = require('./src/backend/services/reportService');
const databaseService = require('./src/backend/services/databaseService');

async function detailedDebug() {
  try {
    originalLog('=== DETAILED REPORT DEBUG ===');
    
    const shifts = await databaseService.getAllShifts();
    originalLog(`Found ${shifts.length} shifts`);
    
    if (shifts.length === 0) {
      originalLog('No shifts to test');
      return;
    }
    
    const shift = shifts[0];
    originalLog(`Testing: ${shift.shift_name} (ID: ${shift.id})`);
    
    // Step by step debugging
    originalLog('\n1. Getting all events...');
    const allEvents = await databaseService.getAllEvents();
    originalLog(`getAllEvents result type: ${typeof allEvents}`);
    originalLog(`getAllEvents isArray: ${Array.isArray(allEvents)}`);
    originalLog(`getAllEvents has rows: ${allEvents && allEvents.rows ? 'YES' : 'NO'}`);
    
    const allEventsArray = allEvents.rows || allEvents;
    originalLog(`Events array length: ${allEventsArray ? allEventsArray.length : 'UNDEFINED'}`);
    
    originalLog('\n2. Getting all assets...');
    const allAssets = await databaseService.getAllAssets();
    originalLog(`getAllAssets result type: ${typeof allAssets}`);
    originalLog(`getAllAssets isArray: ${Array.isArray(allAssets)}`);
    originalLog(`Assets length: ${allAssets ? allAssets.length : 'UNDEFINED'}`);
    
    originalLog('\n3. Filtering events by time range...');
    const shiftStart = new Date(shift.start_time);
    const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
    originalLog(`Shift time range: ${shiftStart} to ${shiftEnd}`);
    
    const events = allEventsArray.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= shiftStart && eventDate <= shiftEnd;
    });
    originalLog(`Filtered events: ${events.length}`);
    
    originalLog('\n4. Calling calculateShiftMetrics...');
    try {
      const reportData = reportService.calculateShiftMetrics(shift, events, allAssets);
      originalLog('✅ calculateShiftMetrics succeeded');
      originalLog(`Report has ${reportData.events.length} events`);
      originalLog(`Report has ${reportData.assets.length} assets`);
    } catch (error) {
      originalLog('❌ calculateShiftMetrics failed:', error.message);
      originalLog('Stack:', error.stack);
    }
    
  } catch (error) {
    originalLog('Error:', error.message);
    originalLog('Stack:', error.stack);
  }
}

detailedDebug();