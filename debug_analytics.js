// Debug analytics summary service
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
const analyticsSummaryService = require('./src/backend/services/analyticsSummaryService');

async function debugAnalytics() {
  try {
    originalLog('=== ANALYTICS DEBUG ===');
    
    const shifts = await databaseService.getAllShifts();
    const shift = shifts[0];
    originalLog(`Testing: ${shift.shift_name} (ID: ${shift.id})`);
    
    // Get events and assets
    const allEvents = await databaseService.getAllEvents();
    const allEventsArray = allEvents.rows || allEvents;
    const allAssets = await databaseService.getAllAssets();
    
    // Filter events by time range
    const shiftStart = new Date(shift.start_time);
    const shiftEnd = shift.end_time ? new Date(shift.end_time) : new Date();
    const events = allEventsArray.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= shiftStart && eventDate <= shiftEnd;
    });
    
    originalLog(`\nFiltered events: ${events.length}`);
    originalLog(`Events type: ${typeof events}`);
    originalLog(`Events isArray: ${Array.isArray(events)}`);
    
    // Test generateAssetsSummaryForAnalytics
    originalLog('\n=== Testing generateAssetsSummaryForAnalytics ===');
    try {
      const assetsSummary = reportService.generateAssetsSummaryForAnalytics(events, allAssets);
      originalLog('✅ generateAssetsSummaryForAnalytics succeeded');
      originalLog(`Assets summary: ${JSON.stringify(assetsSummary, null, 2)}`);
    } catch (error) {
      originalLog('❌ generateAssetsSummaryForAnalytics failed:', error.message);
      originalLog('Stack:', error.stack);
      return;
    }
    
    // Create archived data structure
    const archivedData = {
      events: events.map(event => ({
        event_id: event.id,
        asset_id: event.asset_id,
        event_type: event.event_type,
        timestamp: event.timestamp,
        new_state: event.new_state,
        old_state: event.old_state,
        duration: event.duration,
        stop_reason: event.stop_reason,
        metadata: event.metadata
      })),
      shift_info: {
        id: shift.id,
        name: shift.shift_name,
        shift_number: shift.shift_number,
        start_time: shift.start_time,
        end_time: shift.end_time,
        status: shift.status
      },
      assets_summary: reportService.generateAssetsSummaryForAnalytics(events, allAssets)
    };
    
    originalLog('\n=== Testing analyticsSummaryService ===');
    originalLog(`archivedData.events type: ${typeof archivedData.events}`);
    originalLog(`archivedData.events isArray: ${Array.isArray(archivedData.events)}`);
    originalLog(`archivedData.events length: ${archivedData.events ? archivedData.events.length : 'UNDEFINED'}`);
    
    try {
      const analyticsSummary = analyticsSummaryService.generateAnalyticsSummary(archivedData, {
        includeDetailed: true,
        includeRecommendations: true
      });
      originalLog('✅ analyticsSummaryService.generateAnalyticsSummary succeeded');
      originalLog(`Executive summary: ${analyticsSummary.executive_summary}`);
    } catch (error) {
      originalLog('❌ analyticsSummaryService.generateAnalyticsSummary failed:', error.message);
      originalLog('Stack:', error.stack);
    }
    
  } catch (error) {
    originalLog('Error:', error.message);
    originalLog('Stack:', error.stack);
  }
}

debugAnalytics();