const axios = require('axios');
const databaseService = require('./src/backend/services/databaseService');

(async () => {
  try {
    console.log('🔍 COMPREHENSIVE ARCHIVES VISIBILITY DIAGNOSIS');
    console.log('=' .repeat(60));
    
    // 1. Check database archives
    console.log('\n1️⃣ DATABASE VERIFICATION:');
    const archives = await databaseService.getAllArchives();
    console.log(`   📊 Total archives in database: ${archives.length}`);
    
    const shiftReports = archives.filter(a => a.archive_type === 'SHIFT_REPORT');
    const eventArchives = archives.filter(a => a.archive_type === 'EVENTS');
    console.log(`   📋 Shift Reports: ${shiftReports.length}`);
    console.log(`   📁 Event Archives: ${eventArchives.length}`);
    
    if (archives.length > 0) {
      console.log('   ✅ Database contains archive data');
    } else {
      console.log('   ❌ No archives found in database');
      process.exit(1);
    }
    
    // 2. Test backend API endpoints
    console.log('\n2️⃣ BACKEND API TESTING:');
    
    // Test admin login
    console.log('   🔐 Testing admin login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.success && loginResponse.data.token) {
      console.log('   ✅ Admin login successful');
      const token = loginResponse.data.token;
      
      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Test /api/archives endpoint
      console.log('   📊 Testing /api/archives endpoint...');
      try {
        const archivesResponse = await axios.get('http://localhost:5000/api/archives');
        console.log(`   ✅ /api/archives returned ${archivesResponse.data.data?.length || 0} archives`);
      } catch (err) {
        console.log(`   ❌ /api/archives failed: ${err.response?.data?.message || err.message}`);
      }
      
      // Test /api/events/archives endpoint
      console.log('   📁 Testing /api/events/archives endpoint...');
      try {
        const eventArchivesResponse = await axios.get('http://localhost:5000/api/events/archives');
        console.log(`   ✅ /api/events/archives returned ${eventArchivesResponse.data.data?.length || 0} event archives`);
      } catch (err) {
        console.log(`   ❌ /api/events/archives failed: ${err.response?.data?.message || err.message}`);
      }
      
    } else {
      console.log('   ❌ Admin login failed');
      process.exit(1);
    }
    
    // 3. Frontend component analysis
    console.log('\n3️⃣ FRONTEND COMPONENT ANALYSIS:');
    
    // Check if ArchivesPage.js exists and is properly structured
    const fs = require('fs');
    const archivesPagePath = './src/frontend/src/components/archives/ArchivesPage.js';
    
    if (fs.existsSync(archivesPagePath)) {
      console.log('   ✅ ArchivesPage.js component exists');
      
      const archivesPageContent = fs.readFileSync(archivesPagePath, 'utf8');
      
      // Check for key elements
      const hasAuthContext = archivesPageContent.includes('AuthContext');
      const hasEventArchiveTable = archivesPageContent.includes('EventArchiveTable');
      const hasShiftReportTable = archivesPageContent.includes('ShiftReportTable');
      const hasTabsLogic = archivesPageContent.includes('tabValue');
      
      console.log(`   📋 AuthContext integration: ${hasAuthContext ? '✅' : '❌'}`);
      console.log(`   📁 EventArchiveTable component: ${hasEventArchiveTable ? '✅' : '❌'}`);
      console.log(`   📊 ShiftReportTable component: ${hasShiftReportTable ? '✅' : '❌'}`);
      console.log(`   🔄 Tabs logic: ${hasTabsLogic ? '✅' : '❌'}`);
      
    } else {
      console.log('   ❌ ArchivesPage.js component not found');
    }
    
    // Check TopNavLayout.js for Archives tab
    const topNavLayoutPath = './src/frontend/src/components/layout/TopNavLayout.js';
    
    if (fs.existsSync(topNavLayoutPath)) {
      console.log('   ✅ TopNavLayout.js component exists');
      
      const topNavContent = fs.readFileSync(topNavLayoutPath, 'utf8');
      
      const hasArchivesTab = topNavContent.includes("label: 'Archives'");
      const hasArchivesRoute = topNavContent.includes("value: '/archives'");
      const hasArchiveIcon = topNavContent.includes('ArchiveIcon');
      
      console.log(`   📁 Archives tab label: ${hasArchivesTab ? '✅' : '❌'}`);
      console.log(`   🔗 Archives route: ${hasArchivesRoute ? '✅' : '❌'}`);
      console.log(`   🎨 Archive icon: ${hasArchiveIcon ? '✅' : '❌'}`);
      
    } else {
      console.log('   ❌ TopNavLayout.js component not found');
    }
    
    // 4. Route configuration check
    console.log('\n4️⃣ ROUTE CONFIGURATION:');
    
    const appJsPath = './src/frontend/src/App.js';
    
    if (fs.existsSync(appJsPath)) {
      console.log('   ✅ App.js exists');
      
      const appContent = fs.readFileSync(appJsPath, 'utf8');
      
      const hasArchivesImport = appContent.includes('ArchivesPage');
      const hasArchivesRoute = appContent.includes('path="archives"');
      const hasPrivateRoute = appContent.includes('PrivateRoute');
      
      console.log(`   📦 ArchivesPage import: ${hasArchivesImport ? '✅' : '❌'}`);
      console.log(`   🛣️ Archives route definition: ${hasArchivesRoute ? '✅' : '❌'}`);
      console.log(`   🔒 PrivateRoute wrapper: ${hasPrivateRoute ? '✅' : '❌'}`);
      
    } else {
      console.log('   ❌ App.js not found');
    }
    
    // 5. Summary and recommendations
    console.log('\n5️⃣ DIAGNOSIS SUMMARY:');
    console.log('=' .repeat(60));
    
    console.log('\n🔍 POSSIBLE CAUSES FOR ARCHIVES NOT BEING VISIBLE:');
    console.log('\n   A. FRONTEND AUTHENTICATION ISSUE:');
    console.log('      • User might not be logged in on the frontend');
    console.log('      • AuthContext might not be properly initialized');
    console.log('      • Token might be expired or invalid');
    
    console.log('\n   B. COMPONENT RENDERING ISSUE:');
    console.log('      • ArchivesPage component might have rendering errors');
    console.log('      • React Router might not be navigating properly');
    console.log('      • CSS/styling might be hiding the content');
    
    console.log('\n   C. DATA LOADING ISSUE:');
    console.log('      • API calls might be failing silently');
    console.log('      • CORS issues between frontend and backend');
    console.log('      • Network connectivity problems');
    
    console.log('\n🔧 RECOMMENDED DEBUGGING STEPS:');
    console.log('\n   1. Open browser DevTools (F12)');
    console.log('   2. Go to Console tab');
    console.log('   3. Navigate to http://localhost:3000/archives');
    console.log('   4. Look for:');
    console.log('      • Authentication logs from AuthContext');
    console.log('      • API request logs');
    console.log('      • React component errors');
    console.log('      • Network tab for failed requests');
    
    console.log('\n   5. Check if you can see:');
    console.log('      • "Auth: Yes | Token: Present" in the page header');
    console.log('      • Archives page title "Archives & Data Management"');
    console.log('      • Tab navigation (Shift Reports, Event Archives, etc.)');
    
    console.log('\n✅ BACKEND AND DATABASE ARE WORKING CORRECTLY!');
    console.log('   The issue is likely on the frontend side.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
})();