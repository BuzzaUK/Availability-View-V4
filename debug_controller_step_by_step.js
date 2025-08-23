const axios = require('axios');
const reportService = require('./src/backend/services/reportService');

async function debugControllerStepByStep() {
  try {
    console.log('=== Step-by-Step Controller Debug ===\n');
    
    // Step 1: Test the service directly
    console.log('🔍 Step 1: Direct service call');
    const serviceResults = await reportService.getArchivedShiftReports();
    console.log(`Service returned ${serviceResults.length} archives:`);
    serviceResults.forEach((archive, index) => {
      console.log(`  ${index + 1}. ID: ${archive.id}, Title: ${archive.title}`);
      console.log(`     Date Range: ${archive.date_range_start} to ${archive.date_range_end}`);
    });
    
    // Step 2: Simulate the controller's pagination logic
    console.log('\n🔍 Step 2: Simulating controller pagination');
    const page = 1;
    const limit = 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedReports = serviceResults.slice(startIndex, endIndex);
    console.log(`After pagination (page=${page}, limit=${limit}): ${paginatedReports.length} reports`);
    paginatedReports.forEach((archive, index) => {
      console.log(`  ${index + 1}. ID: ${archive.id}, Title: ${archive.title}`);
    });
    
    // Step 3: Simulate the controller's transformation logic
    console.log('\n🔍 Step 3: Simulating controller transformation');
    const transformedReports = paginatedReports.map(archive => {
      const archivedData = archive.archived_data || {};
      const metrics = archivedData.shift_metrics || archivedData;
      const meta = archivedData.generation_metadata || archivedData;
      
      console.log(`  Transforming archive ${archive.id}:`);
      console.log(`    - Has archived_data: ${!!archive.archived_data}`);
      console.log(`    - Has shift_metrics: ${!!archivedData.shift_metrics}`);
      console.log(`    - Has generation_metadata: ${!!archivedData.generation_metadata}`);
      
      // Calculate duration
      let duration = 0;
      if (metrics.shift_duration) {
        duration = Number(metrics.shift_duration);
      } else if (meta.shift_duration_ms) {
        duration = Number(meta.shift_duration_ms);
      } else {
        const startTime = archive.date_range_start ? new Date(archive.date_range_start) : null;
        const endTime = archive.date_range_end ? new Date(archive.date_range_end) : null;
        duration = startTime && endTime ? Math.max(0, endTime - startTime) : 0;
      }
      
      console.log(`    - Calculated duration: ${duration}`);
      
      return {
        id: archive.id,
        archive_id: archive.id,
        title: archive.title,
        start_time: archive.date_range_start,
        end_time: archive.date_range_end,
        duration: duration,
        status: archive.status || 'COMPLETED'
      };
    });
    
    console.log(`\nTransformed ${transformedReports.length} reports:`);
    transformedReports.forEach((report, index) => {
      console.log(`  ${index + 1}. ID: ${report.id}, Archive ID: ${report.archive_id}`);
      console.log(`     Title: ${report.title}`);
      console.log(`     Duration: ${report.duration}`);
    });
    
    // Step 4: Make actual API call to compare
    console.log('\n🔍 Step 4: Actual API call');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    const apiResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const apiResults = apiResponse.data.data;
    console.log(`API returned ${apiResults.length} reports:`);
    apiResults.forEach((report, index) => {
      console.log(`  ${index + 1}. ID: ${report.id}, Archive ID: ${report.archive_id}`);
      console.log(`     Title: ${report.title}`);
      console.log(`     Duration: ${report.duration}`);
    });
    
    // Step 5: Final comparison
    console.log('\n🔍 Step 5: Final Analysis');
    console.log(`Service: ${serviceResults.length} archives`);
    console.log(`Paginated: ${paginatedReports.length} archives`);
    console.log(`Transformed: ${transformedReports.length} reports`);
    console.log(`API: ${apiResults.length} reports`);
    
    if (transformedReports.length === apiResults.length) {
      console.log('✅ Transformation logic is working correctly');
      console.log('✅ The issue has been resolved!');
    } else {
      console.log('❌ CRITICAL: There is still a mismatch between transformation and API');
      console.log('❌ This suggests there might be caching, middleware, or another issue');
    }
    
    console.log('\n✅ Step-by-step debug completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during step-by-step debug:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.data);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

// Add a small delay to let any initialization complete
setTimeout(debugControllerStepByStep, 1000);