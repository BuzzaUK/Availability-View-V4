const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const axios = require('axios');

// Authentication function
async function authenticateUser() {
  try {
    console.log('🔐 AUTHENTICATION: Logging in as admin...');
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (response.data.success && response.data.token) {
      console.log('✅ Authentication successful');
      return response.data.token;
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

// Check archives
async function checkArchives(token) {
  try {
    console.log('\n📦 CHECKING ARCHIVES...');
    const response = await axios.get('http://localhost:5000/api/archives', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`✅ Archives API response: ${response.status}`);
    console.log('📊 Raw response data:', JSON.stringify(response.data, null, 2));
    
    const archives = response.data.archives || response.data.data || response.data || [];
    console.log(`📊 Total archives found: ${archives.length}`);
    
    // Filter for recent archives (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentArchives = archives.filter(archive => {
      const createdAt = new Date(archive.created_at);
      return createdAt > oneHourAgo;
    });
    
    console.log(`📊 Recent archives (last hour): ${recentArchives.length}`);
    
    if (recentArchives.length > 0) {
      console.log('\n📋 RECENT ARCHIVES:');
      recentArchives.forEach((archive, index) => {
        console.log(`  ${index + 1}. ${archive.title} (ID: ${archive.id})`);
        console.log(`     Type: ${archive.archive_type}`);
        console.log(`     Created: ${new Date(archive.created_at).toLocaleString()}`);
        if (archive.archived_data && archive.archived_data.event_count) {
          console.log(`     Events: ${archive.archived_data.event_count}`);
        }
        console.log('');
      });
    }
    
    return { total: archives.length, recent: recentArchives.length };
    
  } catch (error) {
    console.error('❌ Failed to check archives:', error.response?.data || error.message);
    return { total: 0, recent: 0 };
  }
}

// Check shift reports specifically
async function checkShiftReports(token) {
  try {
    console.log('\n📄 CHECKING SHIFT REPORTS...');
    const response = await axios.get('http://localhost:5000/api/archives?type=REPORTS', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`✅ Shift reports API response: ${response.status}`);
    console.log('📊 Raw response data:', JSON.stringify(response.data, null, 2));
    
    const reports = response.data.archives || response.data.data || response.data || [];
    console.log(`📊 Total shift reports found: ${reports.length}`);
    
    // Filter for recent reports (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentReports = reports.filter(report => {
      const createdAt = new Date(report.created_at);
      return createdAt > oneHourAgo;
    });
    
    console.log(`📊 Recent shift reports (last hour): ${recentReports.length}`);
    
    if (recentReports.length > 0) {
      console.log('\n📋 RECENT SHIFT REPORTS:');
      recentReports.forEach((report, index) => {
        console.log(`  ${index + 1}. ${report.title} (ID: ${report.id})`);
        console.log(`     Type: ${report.archive_type}`);
        console.log(`     Created: ${new Date(report.created_at).toLocaleString()}`);
        if (report.archived_data && report.archived_data.reports) {
          const reportTypes = Object.keys(report.archived_data.reports);
          console.log(`     Report Types: ${reportTypes.join(', ')}`);
        }
        console.log('');
      });
    }
    
    return { total: reports.length, recent: recentReports.length };
    
  } catch (error) {
    console.error('❌ Failed to check shift reports:', error.response?.data || error.message);
    return { total: 0, recent: 0 };
  }
}

// Main verification function
async function verifyArchivingSuccess() {
  try {
    console.log('🔍 VERIFYING ARCHIVING SUCCESS');
    console.log('===============================');
    console.log('This script will check if the recent shift change');
    console.log('successfully created archives and reports.');
    console.log('');
    
    // Authenticate
    const token = await authenticateUser();
    
    // Check archives
    const archiveResults = await checkArchives(token);
    
    // Check shift reports
    const reportResults = await checkShiftReports(token);
    
    console.log('\n📊 FINAL SUMMARY:');
    console.log('==================');
    console.log(`📦 Total Archives: ${archiveResults.total}`);
    console.log(`📦 Recent Archives: ${archiveResults.recent}`);
    console.log(`📄 Total Reports: ${reportResults.total}`);
    console.log(`📄 Recent Reports: ${reportResults.recent}`);
    
    const archivingWorking = archiveResults.recent > 0;
    const reportingWorking = reportResults.recent > 0;
    
    console.log('');
    if (archivingWorking && reportingWorking) {
      console.log('🎉 SUCCESS: Both archiving and reporting are working!');
      console.log('✅ Event archiving: WORKING');
      console.log('✅ Shift report generation: WORKING');
    } else {
      console.log('⚠️  PARTIAL SUCCESS:');
      console.log(`${archivingWorking ? '✅' : '❌'} Event archiving: ${archivingWorking ? 'WORKING' : 'NOT WORKING'}`);
      console.log(`${reportingWorking ? '✅' : '❌'} Shift report generation: ${reportingWorking ? 'WORKING' : 'NOT WORKING'}`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyArchivingSuccess().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});