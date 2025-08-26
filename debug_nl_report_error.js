// Debug script to test natural language report generation
const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const SUPER_ADMIN_CREDENTIALS = {
    email: 'admin@example.com',
    password: 'admin123'
};

async function testNaturalLanguageReports() {
    try {
        console.log('🔐 Logging in as super_admin...');
        
        // Login to get token
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, SUPER_ADMIN_CREDENTIALS);
        const token = loginResponse.data.token;
        
        console.log('✅ Login successful');
        
        // Set up headers with token
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('\n📊 Testing Natural Language Report Endpoints:');
        
        // Test 1: Get available report types
        try {
            const reportTypesResponse = await axios.get(`${BASE_URL}/reports/natural-language`, { headers });
            console.log('✅ Get Report Types:', reportTypesResponse.status);
            console.log('Available shifts:', reportTypesResponse.data.shifts?.length || 0);
        } catch (error) {
            console.log('❌ Get Report Types Error:', error.response?.status, error.response?.data?.message || error.message);
        }
        
        // Test 2: Generate sample report
        try {
            const sampleResponse = await axios.get(`${BASE_URL}/reports/natural-language/sample`, { headers });
            console.log('✅ Generate Sample Report:', sampleResponse.status);
            console.log('Full sample response:', JSON.stringify(sampleResponse.data, null, 2));
            const sections = sampleResponse.data.narrative ? Object.keys(sampleResponse.data.narrative) : [];
             console.log('Sample report sections:', sections);
        } catch (error) {
            console.log('❌ Sample Report Error:', error.response?.status, error.response?.data?.message || error.message);
            console.log('Full error:', error.response?.data);
        }
        
        // Test 3: Try to generate a shift report (if shifts are available)
        try {
            const shiftsResponse = await axios.get(`${BASE_URL}/reports/natural-language`, { headers });
            const shifts = shiftsResponse.data.shifts;
            
            if (shifts && shifts.length > 0) {
                const firstShift = shifts[0];
                console.log(`\n🔄 Testing shift report for shift ID: ${firstShift.id}`);
                
                const shiftReportResponse = await axios.get(
                    `${BASE_URL}/reports/natural-language/shift/${firstShift.id}?includeRawData=true`, 
                    { headers }
                );
                console.log('✅ Generate Shift Report:', shiftReportResponse.status);
                console.log('Shift report sections:', Object.keys(shiftReportResponse.data.report || {}));
            } else {
                console.log('⚠️ No shifts available for testing');
            }
        } catch (error) {
            console.log('❌ Shift Report Error:', error.response?.status, error.response?.data?.message || error.message);
            console.log('Full error:', error.response?.data);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testNaturalLanguageReports();