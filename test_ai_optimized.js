const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testOptimizedAI() {
  console.log('🔍 Testing Optimized AI Service...');
  
  try {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (loginResponse.status !== 200) {
      throw new Error('Authentication failed');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Authentication successful');
    
    // Test AI report with longer timeout (2 minutes)
    console.log('🔍 Testing AI report generation with 2-minute timeout...');
    
    const startTime = Date.now();
    
    try {
      const reportResponse = await axios.get(
        `${BASE_URL}/api/reports/natural-language/shift/78?useAI=true&includeRawData=true`,
        // No body needed for GET request
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minutes
        }
      );
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (reportResponse.status === 200) {
        const report = reportResponse.data;
        console.log(`✅ AI Report Generated Successfully in ${duration}s`);
        console.log('- Success:', report.success);
        console.log('- AI Used:', report.ai_used);
        console.log('- Report Type:', report.report_type);
        console.log('- Has Narrative:', !!report.narrative);
        
        if (report.narrative) {
          console.log('\n📊 Report Sections:');
          console.log('- Executive Summary:', report.narrative.executive_summary ? 'Present' : 'Missing');
          console.log('- Shift Overview:', report.narrative.shift_overview ? 'Present' : 'Missing');
          console.log('- Asset Performance:', report.narrative.asset_performance ? 'Present' : 'Missing');
          console.log('- Key Events:', report.narrative.key_events ? 'Present' : 'Missing');
          console.log('- Recommendations:', report.narrative.recommendations ? 'Present' : 'Missing');
          console.log('- Conclusion:', report.narrative.conclusion ? 'Present' : 'Missing');
          
          // Show sample content
          if (report.narrative.executive_summary) {
            console.log('\n📝 Executive Summary Sample:');
            console.log(report.narrative.executive_summary.substring(0, 200) + '...');
          }
        }
        
      } else {
        console.error('❌ AI Report failed with status:', reportResponse.status);
      }
      
    } catch (timeoutError) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      if (timeoutError.code === 'ECONNABORTED') {
        console.log(`⏰ AI request timed out after ${duration}s (2-minute limit)`);
        console.log('🔍 This suggests the AI service needs further optimization');
      } else {
        console.error('❌ AI request failed:', timeoutError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOptimizedAI();