const axios = require('axios');

async function testShiftReportsAPI() {
    try {
        console.log('🔍 Testing /api/reports/shifts endpoint...');
        
        // First login to get token
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@example.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');
        
        // Test the shift reports endpoint
        console.log('\n📊 Fetching archived shift reports...');
        const reportsResponse = await axios.get('http://localhost:5000/api/reports/shifts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ API Response Status:', reportsResponse.status);
        console.log('📊 Total reports found:', reportsResponse.data.shiftReports?.length || 0);
        
        if (reportsResponse.data.shiftReports && reportsResponse.data.shiftReports.length > 0) {
            console.log('\n📋 Shift Reports Details:');
            reportsResponse.data.shiftReports.forEach((report, index) => {
                console.log(`\n--- Report ${index + 1} ---`);
                console.log('Shift ID:', report.shift_id);
                console.log('Title:', report.title);
                console.log('Start Time:', report.start_time);
                console.log('End Time:', report.end_time);
                console.log('Duration:', report.duration);
                console.log('Availability:', report.availability);
                console.log('Performance:', report.performance);
                console.log('Quality:', report.quality);
                console.log('OEE:', report.oee);
            });
            
            // Extract unique shift IDs
            const shiftIds = [...new Set(reportsResponse.data.shiftReports.map(report => report.shift_id))];
            console.log('\n🎯 Unique Shift IDs with reports:', shiftIds);
        } else {
            console.log('\n❌ No shift reports found!');
        }
        
        // Also test the shifts endpoint
        console.log('\n\n🔍 Testing /api/shifts endpoint...');
        const shiftsResponse = await axios.get('http://localhost:5000/api/shifts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Shifts API Response Status:', shiftsResponse.status);
        console.log('📊 Total shifts found:', shiftsResponse.data.length || 0);
        
        if (shiftsResponse.data && shiftsResponse.data.length > 0) {
            console.log('\n📋 Available Shifts:');
            shiftsResponse.data.forEach((shift, index) => {
                console.log(`${index + 1}. ID: ${shift.id}, Name: ${shift.name}, Status: ${shift.status}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

testShiftReportsAPI();