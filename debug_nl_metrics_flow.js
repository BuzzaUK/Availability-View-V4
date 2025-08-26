const reportService = require('./src/backend/services/reportService');
const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');
const databaseService = require('./src/backend/services/databaseService');

async function debugMetricsFlow() {
  try {
    console.log('🔍 Debugging Natural Language Report Metrics Flow');
    console.log('=' .repeat(60));
    
    // Test with shifts 74, 75, and 76
    const testShifts = [74, 75, 76];
    
    for (const shiftId of testShifts) {
      console.log(`\n📊 Testing Shift ${shiftId}:`);
      console.log('-'.repeat(40));
      
      try {
        // Step 1: Check if shift exists
        const shift = await databaseService.findShiftById(shiftId);
        if (!shift) {
          console.log(`❌ Shift ${shiftId} not found`);
          continue;
        }
        console.log(`✅ Shift found: ${shift.shift_name || shift.name}`);
        
        // Step 2: Get report service data
        console.log('\n🔧 Report Service Data:');
        const reportData = await reportService.generateShiftReport(shiftId, {
          includeAnalysis: true,
          includeCsv: false,
          includeHtml: false
        });
        
        console.log(`   - Shift: ${reportData.shift ? 'YES' : 'NO'}`);
        console.log(`   - Metrics: ${reportData.metrics ? 'YES' : 'NO'}`);
        console.log(`   - Assets: ${reportData.assets ? reportData.assets.length : 0} assets`);
        console.log(`   - Events: ${reportData.events ? reportData.events.length : 0} events`);
        
        if (reportData.metrics) {
          console.log('\n📈 Raw Metrics from Report Service:');
          console.log(`   - availability_percentage: ${reportData.metrics.availability_percentage}`);
          console.log(`   - runtime_minutes: ${reportData.metrics.runtime_minutes}`);
          console.log(`   - downtime_minutes: ${reportData.metrics.downtime_minutes}`);
          console.log(`   - total_stops: ${reportData.metrics.total_stops}`);
          console.log(`   - total_runtime: ${reportData.metrics.total_runtime}`);
          console.log(`   - total_downtime: ${reportData.metrics.total_downtime}`);
          console.log(`   - average_availability: ${reportData.metrics.average_availability}`);
        }
        
        // Step 3: Test natural language service
        console.log('\n📝 Natural Language Service:');
        const nlReport = await naturalLanguageReportService.generateNaturalLanguageShiftReport(shiftId, {
          includeRawData: true,
          useAI: false // Force fallback to see basic generation
        });
        
        if (nlReport.success) {
          console.log('✅ Natural language report generated successfully');
          
          // Check if metrics are being used in the narrative
          const executiveSummary = nlReport.narrative.executive_summary;
          const shiftOverview = nlReport.narrative.shift_overview;
          
          console.log('\n📊 Metrics Usage in Narrative:');
          
          // Check for availability percentage
          const availabilityMatch = executiveSummary.match(/(\d+\.\d+)% overall availability/);
          if (availabilityMatch) {
            console.log(`   ✅ Availability found in executive summary: ${availabilityMatch[1]}%`);
          } else {
            console.log(`   ❌ Availability NOT found in executive summary`);
            console.log(`   Executive summary: ${executiveSummary.substring(0, 200)}...`);
          }
          
          // Check for runtime/downtime in overview
          const runtimeMatch = shiftOverview.match(/Runtime: ([\d.]+) minutes/);
          const downtimeMatch = shiftOverview.match(/Downtime: ([\d.]+) minutes/);
          
          if (runtimeMatch) {
            console.log(`   ✅ Runtime found in overview: ${runtimeMatch[1]} minutes`);
          } else {
            console.log(`   ❌ Runtime NOT found in overview`);
          }
          
          if (downtimeMatch) {
            console.log(`   ✅ Downtime found in overview: ${downtimeMatch[1]} minutes`);
          } else {
            console.log(`   ❌ Downtime NOT found in overview`);
          }
          
          // Show raw data if available
          if (nlReport.raw_data && nlReport.raw_data.metrics) {
            console.log('\n🔍 Raw Data Metrics in NL Report:');
            const rawMetrics = nlReport.raw_data.metrics;
            console.log(`   - availability_percentage: ${rawMetrics.availability_percentage}`);
            console.log(`   - runtime_minutes: ${rawMetrics.runtime_minutes}`);
            console.log(`   - downtime_minutes: ${rawMetrics.downtime_minutes}`);
          }
          
        } else {
          console.log(`❌ Natural language report failed: ${nlReport.message || 'Unknown error'}`);
        }
        
      } catch (shiftError) {
        console.log(`❌ Error testing shift ${shiftId}: ${shiftError.message}`);
        console.log(`Stack: ${shiftError.stack}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugMetricsFlow();