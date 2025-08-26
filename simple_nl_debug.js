const path = require('path');
const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');
const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');

async function simpleNLDebug() {
  console.log('🔍 Simple Natural Language Report Debug');
  console.log('=' .repeat(50));
  
  try {
    // Wait for database
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const testShifts = [74, 75, 76];
    
    for (const shiftId of testShifts) {
      console.log(`\n--- Testing Shift ${shiftId} ---`);
      
      // Check shift exists
      const shift = await databaseService.findShiftById(shiftId);
      if (!shift) {
        console.log(`❌ Shift ${shiftId} not found`);
        continue;
      }
      console.log(`✅ Shift found: ${shift.shift_name}`);
      
      // Check events directly
      const allEvents = await databaseService.getAllEvents();
      const allEventsArray = allEvents.rows || allEvents;
      const shiftEvents = allEventsArray.filter(event => event.shift_id === shiftId);
      console.log(`📊 Events for shift ${shiftId}: ${shiftEvents.length}`);
      
      // Test report service
      try {
        const reportData = await reportService.generateShiftReport(shiftId, {
          includeAnalysis: true,
          includeCsv: false,
          includeHtml: false
        });
        console.log(`📈 Report service events: ${reportData.events ? reportData.events.length : 0}`);
        console.log(`📈 Report availability: ${reportData.metrics ? reportData.metrics.availability_percentage : 'N/A'}%`);
      } catch (reportError) {
        console.log(`❌ Report service error: ${reportError.message}`);
      }
      
      // Test natural language service
      try {
        const nlReport = await naturalLanguageReportService.generateNaturalLanguageShiftReport(shiftId, {
          includeRawData: true,
          useAI: false
        });
        console.log(`📝 NL Report success: ${nlReport.success}`);
        console.log(`📝 NL Report has narrative: ${nlReport.narrative ? 'YES' : 'NO'}`);
        if (nlReport.raw_data) {
          console.log(`📝 NL Report raw events: ${nlReport.raw_data.events ? nlReport.raw_data.events.length : 0}`);
        }
      } catch (nlError) {
        console.log(`❌ NL Report error: ${nlError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (databaseService.sequelize) {
      await databaseService.sequelize.close();
    }
    console.log('\n✅ Done');
  }
}

simpleNLDebug();