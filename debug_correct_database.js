const axios = require('axios');
const reportService = require('./src/backend/services/reportService');
const path = require('path');

async function debugCorrectDatabase() {
  try {
    console.log('=== Testing with Correct Database Path ===\n');
    
    // Test 1: Direct database query using the SAME path as the service
    console.log('🔍 1. Direct database query using service database path:');
    const { Sequelize } = require('sequelize');
    
    // Use the same relative path as the service (from backend directory)
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: './src/backend/database.sqlite', // This should match the service
      logging: false
    });
    
    const [archives] = await sequelize.query(`
      SELECT id, title, archive_type, date_range_start, date_range_end, created_at
      FROM archives 
      WHERE archive_type = 'SHIFT_REPORT'
      ORDER BY created_at DESC
    `);
    
    console.log(`Direct DB query found ${archives.length} SHIFT_REPORT archives:`);
    archives.forEach(archive => {
      console.log(`  - ID: ${archive.id}, Title: ${archive.title}`);
      console.log(`    Date Range: ${archive.date_range_start} to ${archive.date_range_end}`);
    });
    
    await sequelize.close();
    
    // Test 2: Service call
    console.log('\n🔍 2. reportService.getArchivedShiftReports() call:');
    const serviceResults = await reportService.getArchivedShiftReports();
    console.log(`Service returned ${serviceResults.length} archives:`);
    serviceResults.forEach(archive => {
      console.log(`  - ID: ${archive.id}, Title: ${archive.title}`);
      console.log(`    Date Range: ${archive.date_range_start} to ${archive.date_range_end}`);
    });
    
    // Test 3: API call
    console.log('\n🔍 3. API call:');
    
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
    apiResults.forEach(report => {
      console.log(`  - ID: ${report.id}, Archive ID: ${report.archive_id}, Title: ${report.title}`);
      console.log(`    Start: ${report.start_time}, End: ${report.end_time}, Duration: ${report.duration}`);
    });
    
    // Test 4: Comparison
    console.log('\n🔍 4. Final Analysis:');
    const dbIds = archives.map(a => a.id).sort();
    const serviceIds = serviceResults.map(a => a.id).sort();
    const apiIds = apiResults.map(r => r.archive_id || r.id).sort();
    
    console.log('Database IDs:', dbIds);
    console.log('Service IDs:', serviceIds);
    console.log('API IDs:', apiIds);
    
    if (JSON.stringify(dbIds) === JSON.stringify(serviceIds)) {
      console.log('✅ Database and Service match');
    } else {
      console.log('❌ Database and Service mismatch!');
    }
    
    if (JSON.stringify(serviceIds) === JSON.stringify(apiIds)) {
      console.log('✅ Service and API match - Issue resolved!');
    } else {
      console.log('❌ CRITICAL: Service and API still mismatch!');
      console.log('The issue is in the API controller transformation logic.');
    }
    
    // Test 5: Check if the API is somehow filtering or transforming the data incorrectly
    if (serviceResults.length > 0 && apiResults.length !== serviceResults.length) {
      console.log('\n🔍 5. Investigating data transformation issue:');
      console.log('Service data structure (first item):');
      console.log(JSON.stringify(serviceResults[0], null, 2));
      
      if (apiResults.length > 0) {
        console.log('\nAPI data structure (first item):');
        console.log(JSON.stringify(apiResults[0], null, 2));
      }
    }
    
    console.log('\n✅ Correct database test completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during correct database test:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.data);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

// Add a small delay to let any initialization complete
setTimeout(debugCorrectDatabase, 1000);