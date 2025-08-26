const axios = require('axios');
const reportService = require('./src/backend/services/reportService');

async function debugCacheBypass() {
  try {
    console.log('=== Testing Cache Bypass and Direct Database Access ===\n');
    
    // Test 1: Direct database query
    console.log('🔍 1. Direct database query for SHIFT_REPORT archives:');
    const { Sequelize } = require('sequelize');
    const path = require('path');
    
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, 'database.sqlite'),
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
    });
    
    await sequelize.close();
    
    // Test 2: Service call
    console.log('\n🔍 2. reportService.getArchivedShiftReports() call:');
    const serviceResults = await reportService.getArchivedShiftReports();
    console.log(`Service returned ${serviceResults.length} archives:`);
    serviceResults.forEach(archive => {
      console.log(`  - ID: ${archive.id}, Title: ${archive.title}`);
    });
    
    // Test 3: API call with cache-busting timestamp
    console.log('\n🔍 3. API call with cache-busting timestamp:');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    // Add cache-busting timestamp
    const timestamp = Date.now();
    const apiResponse = await axios.get(`http://localhost:5000/api/reports/shifts?_t=${timestamp}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    const apiResults = apiResponse.data.data;
    console.log(`API returned ${apiResults.length} reports:`);
    apiResults.forEach(report => {
      console.log(`  - ID: ${report.id}, Archive ID: ${report.archive_id}, Title: ${report.title}`);
    });
    
    // Test 4: Comparison
    console.log('\n🔍 4. Analysis:');
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
      console.log('✅ Service and API match');
    } else {
      console.log('❌ CRITICAL: Service and API mismatch!');
      console.log('This confirms the API layer is not serving the correct data.');
    }
    
    console.log('\n✅ Cache bypass test completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during cache bypass test:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.data);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

// Add a small delay to let any initialization complete
setTimeout(debugCacheBypass, 1000);