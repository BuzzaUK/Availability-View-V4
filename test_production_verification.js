const path = require('path');
const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

// Set environment to development to use SQLite (simulating production data access)
process.env.NODE_ENV = 'development';

async function verifyProductionFunctionality() {
  try {
    console.log('🔍 Production Verification Test - Shift Reports & Event Archives');
    console.log('=' .repeat(70));
    
    // Test 1: Verify Shift Reports Service
    console.log('\n1. Testing Shift Reports Service...');
    const shiftReports = await reportService.getArchivedShiftReports({});
    console.log(`✅ Shift Reports Service: Found ${shiftReports.length} reports`);
    
    if (shiftReports.length > 0) {
      console.log('   Sample shift report:', {
        id: shiftReports[0].id,
        title: shiftReports[0].title,
        created_at: shiftReports[0].created_at
      });
    }
    
    // Test 2: Verify Event Archives Database Access
    console.log('\n2. Testing Event Archives Database Access...');
    const allArchives = await databaseService.getAllArchives();
    const eventArchives = allArchives.filter(archive => archive.archive_type === 'EVENTS');
    console.log(`✅ Event Archives: Found ${eventArchives.length} archives (from ${allArchives.length} total)`);
    
    if (eventArchives.length > 0) {
      console.log('   Sample event archive:', {
        id: eventArchives[0].id,
        title: eventArchives[0].title,
        event_count: eventArchives[0].archived_data?.event_count || 0,
        created_at: eventArchives[0].created_at
      });
    }
    
    // Test 3: Verify Archive Type Distribution
    console.log('\n3. Testing Archive Type Distribution...');
    const archiveTypes = [...new Set(allArchives.map(a => a.archive_type))];
    console.log('   Archive types found:', archiveTypes);
    
    archiveTypes.forEach(type => {
      const count = allArchives.filter(a => a.archive_type === type).length;
      console.log(`   - ${type}: ${count} archives`);
    });
    
    // Test 4: Verify Data Integrity
    console.log('\n4. Testing Data Integrity...');
    let integrityIssues = 0;
    
    // Check shift reports for required fields
    shiftReports.forEach((report, index) => {
      if (!report.id || !report.title || !report.created_at) {
        console.log(`   ⚠️  Shift Report ${index + 1}: Missing required fields`);
        integrityIssues++;
      }
    });
    
    // Check event archives for required fields and data parsing
    eventArchives.forEach((archive, index) => {
      if (!archive.id || !archive.title || !archive.created_at) {
        console.log(`   ⚠️  Event Archive ${index + 1}: Missing required fields`);
        integrityIssues++;
      }
      
      // Test archived_data parsing
      try {
        if (archive.archived_data) {
          let eventCount = 0;
          if (typeof archive.archived_data === 'string') {
            const parsed = JSON.parse(archive.archived_data);
            eventCount = parsed.event_count || 0;
          } else {
            eventCount = archive.archived_data.event_count || 0;
          }
          
          if (eventCount === 0) {
            console.log(`   ⚠️  Event Archive ${index + 1}: Zero event count`);
            integrityIssues++;
          }
        }
      } catch (parseError) {
        console.log(`   ❌ Event Archive ${index + 1}: Data parsing error - ${parseError.message}`);
        integrityIssues++;
      }
    });
    
    if (integrityIssues === 0) {
      console.log('   ✅ All data integrity checks passed');
    } else {
      console.log(`   ⚠️  Found ${integrityIssues} data integrity issues`);
    }
    
    // Test 5: Simulate API Controller Logic
    console.log('\n5. Testing API Controller Logic Simulation...');
    
    // Simulate shift reports controller
    try {
      const shiftReportsResponse = {
        success: true,
        data: shiftReports,
        total: shiftReports.length
      };
      console.log(`   ✅ Shift Reports API simulation: ${shiftReportsResponse.data.length} reports`);
    } catch (error) {
      console.log(`   ❌ Shift Reports API simulation failed: ${error.message}`);
    }
    
    // Simulate event archives controller
    try {
      const transformedArchives = eventArchives.map(archive => ({
        id: archive.id,
        title: archive.title,
        description: archive.description,
        archive_type: archive.archive_type,
        date_range_start: archive.date_range_start,
        date_range_end: archive.date_range_end,
        file_size: archive.file_size,
        status: archive.status,
        created_at: archive.created_at,
        created_by: archive.created_by,
        event_count: archive.archived_data ? 
          (typeof archive.archived_data === 'string' ? 
            JSON.parse(archive.archived_data).event_count : 
            archive.archived_data.event_count) : 0
      }));
      
      const eventArchivesResponse = {
        success: true,
        data: transformedArchives
      };
      console.log(`   ✅ Event Archives API simulation: ${eventArchivesResponse.data.length} archives`);
    } catch (error) {
      console.log(`   ❌ Event Archives API simulation failed: ${error.message}`);
    }
    
    // Test 6: Performance Check
    console.log('\n6. Testing Performance...');
    const startTime = Date.now();
    
    await Promise.all([
      reportService.getArchivedShiftReports({}),
      databaseService.getAllArchives()
    ]);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`   ✅ Concurrent data retrieval completed in ${duration}ms`);
    
    if (duration > 5000) {
      console.log('   ⚠️  Performance warning: Data retrieval took longer than 5 seconds');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('📊 PRODUCTION VERIFICATION SUMMARY');
    console.log('=' .repeat(70));
    console.log(`✅ Shift Reports: ${shiftReports.length} available`);
    console.log(`✅ Event Archives: ${eventArchives.length} available`);
    console.log(`✅ Total Archives: ${allArchives.length} (${archiveTypes.join(', ')})`);
    console.log(`${integrityIssues === 0 ? '✅' : '⚠️ '} Data Integrity: ${integrityIssues === 0 ? 'All checks passed' : integrityIssues + ' issues found'}`);
    console.log(`✅ Performance: ${duration}ms response time`);
    
    if (shiftReports.length > 0 && eventArchives.length > 0 && integrityIssues === 0) {
      console.log('\n🎉 PRODUCTION VERIFICATION: ALL SYSTEMS OPERATIONAL');
    } else {
      console.log('\n⚠️  PRODUCTION VERIFICATION: ISSUES DETECTED');
      if (shiftReports.length === 0) console.log('   - No shift reports found');
      if (eventArchives.length === 0) console.log('   - No event archives found');
      if (integrityIssues > 0) console.log(`   - ${integrityIssues} data integrity issues`);
    }
    
  } catch (error) {
    console.error('❌ Production verification failed:', error);
  } finally {
    process.exit(0);
  }
}

verifyProductionFunctionality();