const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

/**
 * Test script to verify the three implemented fixes:
 * 1. Enhanced generation metadata
 * 2. Improved metrics validation
 * 3. Asset performance fallbacks
 */
async function testFixesVerification() {
  try {
    console.log('🧪 TESTING IMPLEMENTED FIXES');
    console.log('=' .repeat(60));
    
    // Get the most recent completed shift
    const allShifts = await databaseService.getAllShifts();
    const completedShifts = allShifts.filter(s => s.status === 'completed');
    
    if (completedShifts.length === 0) {
      console.log('❌ No completed shifts found for testing');
      return;
    }
    
    const testShift = completedShifts[0];
    console.log(`\n📊 Testing with shift: ${testShift.shift_name} (ID: ${testShift.id})`);
    console.log(`   Start: ${new Date(testShift.start_time).toLocaleString()}`);
    console.log(`   End: ${new Date(testShift.end_time).toLocaleString()}`);
    
    // Test Fix 1: Generate a new report and check generation metadata
    console.log('\n1️⃣ TESTING FIX 1: Enhanced Generation Metadata');
    console.log('-'.repeat(50));
    
    try {
      const reportResult = await reportService.generateAndArchiveShiftReportFromShift(testShift.id, {
        includeCsv: true,
        includeHtml: true,
        includeAnalysis: true
      });
      
      if (reportResult.success && reportResult.reportArchive) {
        const archiveData = reportResult.reportArchive.archived_data;
        const metadata = archiveData.generation_metadata;
        
        console.log('✅ Report generated and archived successfully');
        console.log(`   Archive ID: ${reportResult.reportArchive.id}`);
        console.log('\n📋 Generation Metadata Check:');
        console.log(`   ✓ events_processed: ${metadata.events_processed} (${typeof metadata.events_processed})`);
        console.log(`   ✓ assets_analyzed: ${metadata.assets_analyzed} (${typeof metadata.assets_analyzed})`);
        console.log(`   ✓ report_version: ${metadata.report_version}`);
        console.log(`   ✓ data_source: ${metadata.data_source}`);
        console.log(`   ✓ generation_timestamp: ${metadata.generation_timestamp ? 'Present' : 'Missing'}`);
        console.log(`   ✓ shift_duration_ms: ${metadata.shift_duration_ms} (${typeof metadata.shift_duration_ms})`);
        console.log(`   ✓ analytics_summary_available: ${metadata.analytics_summary_available}`);
        console.log(`   ✓ total_events_from_analytics: ${metadata.total_events_from_analytics}`);
        
        // Verify all required metadata fields are present
        const requiredFields = ['events_processed', 'assets_analyzed', 'generation_timestamp', 'shift_duration_ms'];
        const missingFields = requiredFields.filter(field => metadata[field] === undefined || metadata[field] === null);
        
        if (missingFields.length === 0) {
          console.log('   🎉 All required metadata fields are present!');
        } else {
          console.log(`   ❌ Missing metadata fields: ${missingFields.join(', ')}`);
        }
      } else {
        console.log('❌ Failed to generate or archive report');
      }
    } catch (error) {
      console.log('❌ Error testing Fix 1:', error.message);
    }
    
    // Test Fix 2: Check metrics validation
    console.log('\n2️⃣ TESTING FIX 2: Improved Metrics Validation');
    console.log('-'.repeat(50));
    
    try {
      const reportData = await reportService.generateShiftReport(testShift.id);
      const metrics = reportData.metrics;
      
      console.log('✅ Shift metrics generated successfully');
      console.log('\n📊 Metrics Validation Check:');
      
      // Check for NaN values
      const metricsToCheck = [
        'total_runtime', 'total_downtime', 'total_stops', 'availability_percentage',
        'performance_percentage', 'quality_percentage', 'oee_percentage',
        'runtime_minutes', 'downtime_minutes'
      ];
      
      let nanCount = 0;
      let negativeCount = 0;
      let validCount = 0;
      
      metricsToCheck.forEach(metric => {
        const value = metrics[metric];
        const isNaN = Number.isNaN(value);
        const isNegative = value < 0;
        const isValid = !isNaN && !isNegative && typeof value === 'number';
        
        console.log(`   ${isValid ? '✓' : '❌'} ${metric}: ${value} (${typeof value}${isNaN ? ' - NaN!' : ''}${isNegative ? ' - Negative!' : ''})`);
        
        if (isNaN) nanCount++;
        if (isNegative) negativeCount++;
        if (isValid) validCount++;
      });
      
      console.log(`\n📈 Validation Summary:`);
      console.log(`   Valid metrics: ${validCount}/${metricsToCheck.length}`);
      console.log(`   NaN values: ${nanCount}`);
      console.log(`   Negative values: ${negativeCount}`);
      
      if (nanCount === 0 && negativeCount === 0) {
        console.log('   🎉 All metrics are valid!');
      } else {
        console.log('   ⚠️ Some metrics need attention');
      }
      
      // Check percentage bounds (0-100)
      const percentageMetrics = ['availability_percentage', 'performance_percentage', 'quality_percentage', 'oee_percentage'];
      const outOfBounds = percentageMetrics.filter(metric => {
        const value = metrics[metric];
        return value < 0 || value > 100;
      });
      
      if (outOfBounds.length === 0) {
        console.log('   ✅ All percentage values are within bounds (0-100)');
      } else {
        console.log(`   ❌ Percentage values out of bounds: ${outOfBounds.join(', ')}`);
      }
      
    } catch (error) {
      console.log('❌ Error testing Fix 2:', error.message);
    }
    
    // Test Fix 3: Check asset performance fallbacks
    console.log('\n3️⃣ TESTING FIX 3: Asset Performance Fallbacks');
    console.log('-'.repeat(50));
    
    try {
      // Get the most recent report archive to check asset performance
      const allArchives = await databaseService.getAllArchives();
      const reportArchives = allArchives.filter(a => a.archive_type === 'SHIFT_REPORT');
      
      if (reportArchives.length === 0) {
        console.log('❌ No report archives found for testing');
        return;
      }
      
      const latestReport = reportArchives[0];
      const assetPerformance = latestReport.archived_data?.asset_performance || [];
      
      console.log(`✅ Checking asset performance data from archive ID: ${latestReport.id}`);
      console.log(`   Assets found: ${assetPerformance.length}`);
      
      if (assetPerformance.length === 0) {
        console.log('   ⚠️ No asset performance data found');
      } else {
        console.log('\n🏭 Asset Performance Validation:');
        
        let completeAssets = 0;
        let incompleteAssets = 0;
        
        assetPerformance.forEach((asset, index) => {
          const requiredFields = ['asset_id', 'name', 'runtime_minutes', 'downtime_minutes', 'stop_count', 'availability'];
          const missingFields = requiredFields.filter(field => asset[field] === undefined || asset[field] === null);
          const hasNaN = requiredFields.some(field => Number.isNaN(asset[field]));
          
          const isComplete = missingFields.length === 0 && !hasNaN;
          
          console.log(`   ${isComplete ? '✓' : '❌'} Asset ${index + 1}: ${asset.name || 'Unknown'}`);
          console.log(`     - ID: ${asset.asset_id || 'Missing'}`);
          console.log(`     - Runtime: ${asset.runtime_minutes || 0} min`);
          console.log(`     - Downtime: ${asset.downtime_minutes || 0} min`);
          console.log(`     - Stops: ${asset.stop_count || 0}`);
          console.log(`     - Availability: ${asset.availability || 0}%`);
          
          if (missingFields.length > 0) {
            console.log(`     - Missing: ${missingFields.join(', ')}`);
          }
          
          if (hasNaN) {
            console.log(`     - Has NaN values`);
          }
          
          if (isComplete) {
            completeAssets++;
          } else {
            incompleteAssets++;
          }
        });
        
        console.log(`\n📊 Asset Performance Summary:`);
        console.log(`   Complete assets: ${completeAssets}/${assetPerformance.length}`);
        console.log(`   Incomplete assets: ${incompleteAssets}`);
        
        if (incompleteAssets === 0) {
          console.log('   🎉 All asset performance data is complete!');
        } else {
          console.log('   ⚠️ Some assets have incomplete data');
        }
      }
      
    } catch (error) {
      console.log('❌ Error testing Fix 3:', error.message);
    }
    
    console.log('\n🏁 TESTING COMPLETE');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Test verification failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testFixesVerification().then(() => {
    console.log('\n✅ Test verification completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test verification failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testFixesVerification };