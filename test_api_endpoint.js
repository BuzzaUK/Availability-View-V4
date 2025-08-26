const fetch = require('node-fetch');

async function testAPIEndpoint() {
    try {
        console.log('🔍 Testing API endpoint directly...');
        
        // First, login to get authentication token
        console.log('🔐 Logging in to get authentication token...');
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error(`Login failed! status: ${loginResponse.status}`);
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful, token obtained');
        
        // Now test the natural language report endpoint with authentication
        const response = await fetch('http://localhost:5000/api/reports/natural-language/shift/76?includeRawData=true', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('\n📊 API Response:');
        console.log('Success:', data.success);
        console.log('Report Type:', data.report_type);
        console.log('Shift ID:', data.shift_id);
        
        if (data.narrative) {
            console.log('\n📝 Narrative Sections:');
            console.log('Executive Summary Preview:', data.narrative.executive_summary.substring(0, 100) + '...');
            console.log('Shift Overview Preview:', data.narrative.shift_overview.substring(0, 100) + '...');
        }
        
        if (data.raw_data && data.raw_data.shift) {
            console.log('\n📋 Raw Shift Data:');
            console.log('shift.id:', data.raw_data.shift.id);
            console.log('shift.shift_name:', data.raw_data.shift.shift_name);
            console.log('shift.name:', data.raw_data.shift.name);
        }
        
    } catch (error) {
        console.error('❌ Error testing API endpoint:', error);
    }
}

// Run the test
testAPIEndpoint().then(() => {
    console.log('\n✅ API test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ API test failed:', error);
    process.exit(1);
});