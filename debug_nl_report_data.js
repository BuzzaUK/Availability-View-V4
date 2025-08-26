const path = require('path');
const { Sequelize } = require('sequelize');
const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');
const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');

async function debugNaturalLanguageReportData() {
  try {
    console.log('🔍 Debugging Natural Language Report Data Retrieval');
    console.log('=' .repeat(60));
    
    // Wait for database to be ready
    if (!databaseService.initialized) {
      console.log('⏳ Waiting for database initialization...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('✅ Database ready');
    
    const testShifts = [74, 75, 76];
    
    for (const shiftId of testShifts) {
      console.log(`\n🔍 Testing Shift ${shiftId}`);
      console.log('-'.repeat(40));
      
      // Step 1: Check if shift exists
      console.log('Step 1: Checking shift existence...');
      const shift = await databaseService.findShiftById(shiftId);
      if (!shift) {
        console.log(`❌ Shift ${shiftId} not found in database`);
        continue;
      }
      console.log(`✅ Shift found: ${shift.shift_name} (${shift.start_time} - ${shift.end_time})`);
      
      // Step 2: Check events for this shift
      console.log('Step 2: Checking events...');
      const allEvents = await databaseService.getAllEvents();
      const allEventsArray = allEvents.rows || allEvents;
      const shiftEvents = allEventsArray.filter(event => event.shift_id === shiftId);
      console.log(`✅ Found ${shiftEvents.length} events for shift ${shiftId}`);
      
      if (shiftEvents.length > 0) {
        console.log('   Sample events:');
        shiftEvents.slice(0, 3).forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.event_type} - ${event.timestamp} (Duration: ${event.duration}s)`);
        });
      }
      
      // Step 3: Test report service data retrieval
      console.log('Step 3: Testing report service...');
      try {
        const reportData = await reportService.generateShiftReport(shiftId, {
          includeAnalysis: true,
          includeCsv: false,
          includeHtml: false
        });
        
        console.log(`✅ Report service returned data:`);
        console.log(`   - Shift: ${reportData.shift ? 'YES' : 'NO'}`);
        console.log(`   - Metrics: ${reportData.metrics ? 'YES' : 'NO'}`);
        console.log(`   - Assets: ${reportData.assets ? reportData.assets.length : 0} assets`);
        console.log(`   - Events: ${reportData.events ? reportData.events.length : 0} events`);
        
        if (reportData.metrics) {
          console.log(`   - Availability: ${reportData.metrics.availability_percentage}%`);
          console.log(`   - Runtime: ${reportData.metrics.runtime_minutes} minutes`);
          console.log(`   - Downtime: ${reportData.metrics.downtime_minutes} minutes`);
        }
        
      } catch (reportError) {
        console.log(`❌ Report service failed: ${reportError.message}`);
        continue;
      }
      
      // Step 4: Test natural language report generation
      console.log('Step 4: Testing natural language report generation...');
      try {
        const nlReport = await naturalLanguageReportService.generateNaturalLanguageShiftReport(shiftId, {
          includeRawData: true,
          useAI: false // Use fallback generation to avoid API issues
        });
        
        console.log(`✅ Natural language report generated:`);
        console.log(`   - Success: ${nlReport.success}`);
        console.log(`   - Report type: ${nlReport.report_type}`);
        console.log(`   - Generated at: ${nlReport.generated_at}`);
        console.log(`   - Has narrative: ${nlReport.narrative ? 'YES' : 'NO'}`);
        
        if (nlReport.narrative) {
          console.log(`   - Executive summary length: ${nlReport.narrative.executive_summary ? nlReport.narrative.executive_summary.length : 0} chars`);
          console.log(`   - Shift overview length: ${nlReport.narrative.shift_overview ? nlReport.narrative.shift_overview.length : 0} chars`);
        }
        
        if (nlReport.raw_data) {
          console.log(`   - Raw data included: YES`);
          console.log(`   - Raw events count: ${nlReport.raw_data.events ? nlReport.raw_data.events.length : 0}`);
        }
        
      } catch (nlError) {
        console.log(`❌ Natural language report failed: ${nlError.message}`);
        console.log(`   Stack: ${nlError.stack}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    // Close database connection
    try {
      if (databaseService.sequelize) {
        await databaseService.sequelize.close();
        console.log('\n✅ Database connection closed');
      }
    } catch (closeError) {
      console.error('❌ Error closing database:', closeError.message);
    }
  }
}

// Run the debug
debugNaturalLanguageReportData();