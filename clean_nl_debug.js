// Suppress Sequelize logging
process.env.NODE_ENV = 'production';

const path = require('path');
const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');
const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');

// Override console.log temporarily to filter out SQL queries
const originalLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  if (!message.includes('Executing (default):') && !message.includes('SELECT') && !message.includes('PRAGMA')) {
    originalLog(...args);
  }
};

async function cleanNLDebug() {
  originalLog('🔍 Clean Natural Language Report Debug');
  originalLog('=' .repeat(50));
  
  try {
    // Wait for database
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const testShifts = [74, 75, 76];
    
    for (const shiftId of testShifts) {
      originalLog(`\n--- Testing Shift ${shiftId} ---`);
      
      // Check shift exists
      const shift = await databaseService.findShiftById(shiftId);
      if (!shift) {
        originalLog(`❌ Shift ${shiftId} not found`);
        continue;
      }
      originalLog(`✅ Shift found: ${shift.shift_name}`);
      
      // Check events directly
      const allEvents = await databaseService.getAllEvents();
      const allEventsArray = allEvents.rows || allEvents;
      const shiftEvents = allEventsArray.filter(event => event.shift_id === shiftId);
      originalLog(`📊 Events for shift ${shiftId}: ${shiftEvents.length}`);
      
      if (shiftEvents.length > 0) {
        originalLog(`   Sample events:`);
        shiftEvents.slice(0, 3).forEach((event, index) => {
          originalLog(`   ${index + 1}. ${event.event_type} - ${event.timestamp}`);
        });
      }
      
      // Test report service
      try {
        const reportData = await reportService.generateShiftReport(shiftId, {
          includeAnalysis: true,
          includeCsv: false,
          includeHtml: false
        });
        originalLog(`📈 Report service events: ${reportData.events ? reportData.events.length : 0}`);
        originalLog(`📈 Report availability: ${reportData.metrics ? reportData.metrics.availability_percentage : 'N/A'}%`);
        
        if (reportData.events && reportData.events.length > 0) {
          originalLog(`   Report service sample events:`);
          reportData.events.slice(0, 3).forEach((event, index) => {
            originalLog(`   ${index + 1}. ${event.event_type} - ${event.timestamp}`);
          });
        }
        
      } catch (reportError) {
        originalLog(`❌ Report service error: ${reportError.message}`);
      }
      
      // Test natural language service
      try {
        const nlReport = await naturalLanguageReportService.generateNaturalLanguageShiftReport(shiftId, {
          includeRawData: true,
          useAI: false
        });
        originalLog(`📝 NL Report success: ${nlReport.success}`);
        originalLog(`📝 NL Report has narrative: ${nlReport.narrative ? 'YES' : 'NO'}`);
        if (nlReport.raw_data) {
          originalLog(`📝 NL Report raw events: ${nlReport.raw_data.events ? nlReport.raw_data.events.length : 0}`);
          if (nlReport.raw_data.events && nlReport.raw_data.events.length > 0) {
            originalLog(`   NL Report sample events:`);
            nlReport.raw_data.events.slice(0, 3).forEach((event, index) => {
              originalLog(`   ${index + 1}. ${event.event_type} - ${event.timestamp}`);
            });
          }
        }
        
        if (nlReport.narrative && nlReport.narrative.executive_summary) {
          originalLog(`📝 Executive summary preview: ${nlReport.narrative.executive_summary.substring(0, 100)}...`);
        }
        
      } catch (nlError) {
        originalLog(`❌ NL Report error: ${nlError.message}`);
      }
    }
    
  } catch (error) {
    originalLog('❌ Debug failed:', error.message);
  } finally {
    if (databaseService.sequelize) {
      await databaseService.sequelize.close();
    }
    originalLog('\n✅ Done');
  }
}

cleanNLDebug();