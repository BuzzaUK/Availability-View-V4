const axios = require('axios');

// Test script to verify super_admin access to all endpoints
const BASE_URL = 'http://localhost:5000/api';

// Super admin credentials
const SUPER_ADMIN_CREDENTIALS = {
    email: 'admin@example.com',
    password: 'admin123'
};

let authToken = '';

async function login() {
    try {
        console.log('🔐 Logging in as super_admin...');
        console.log('🌐 Testing connection to:', `${BASE_URL}/auth/login`);
        
        const response = await axios.post(`${BASE_URL}/auth/login`, SUPER_ADMIN_CREDENTIALS, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        authToken = response.data.token;
        console.log('✅ Login successful');
        console.log('👤 User role:', response.data.user?.role);
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Connection refused - Server may not be running on port 3001');
        } else if (error.response) {
            console.error('❌ Login failed:', error.response.status, error.response.data?.message || error.response.statusText);
        } else {
            console.error('❌ Login failed:', error.message);
        }
        return false;
    }
}

async function testEndpoint(method, endpoint, description, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            config.data = data;
        }
        
        const response = await axios(config);
        console.log(`✅ ${description}: ${response.status}`);
        return true;
    } catch (error) {
        const status = error.response?.status || 'Network Error';
        const message = error.response?.data?.message || error.message;
        console.error(`❌ ${description}: ${status} - ${message}`);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Super Admin Access Tests\n');
    
    // Login first
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('Cannot proceed without authentication');
        return;
    }
    
    console.log('\n📋 Testing Settings Endpoints:');
    await testEndpoint('GET', '/settings', 'Get Settings');
    await testEndpoint('GET', '/settings/notifications', 'Get Notification Settings');
    
    console.log('\n📊 Testing Natural Language Report Endpoints:');
    await testEndpoint('GET', '/reports/natural-language', 'Get Report Types');
    await testEndpoint('GET', '/reports/natural-language/sample', 'Get Sample Report');
    
    console.log('\n⚙️ Testing Configuration Endpoints:');
    await testEndpoint('GET', '/config', 'Get Configuration');
    await testEndpoint('GET', '/config/downtime-reasons', 'Get Downtime Reasons');
    await testEndpoint('GET', '/config/shift-schedules', 'Get Shift Schedules');
    await testEndpoint('GET', '/config/report-recipients', 'Get Report Recipients');
    
    console.log('\n🚨 Testing Alert Endpoints:');
    await testEndpoint('GET', '/alerts', 'Get Alerts');
    
    console.log('\n🏭 Testing Asset Endpoints:');
    await testEndpoint('GET', '/assets', 'Get Assets');
    
    console.log('\n💾 Testing Backup Endpoints:');
    await testEndpoint('GET', '/backups', 'Get Backups');
    
    console.log('\n📁 Testing Archive Endpoints:');
    await testEndpoint('GET', '/archives', 'Get Archives');
    
    console.log('\n📈 Testing Analytics Endpoints:');
    await testEndpoint('GET', '/analytics/dashboard', 'Get Dashboard Analytics');
    await testEndpoint('GET', '/analytics/performance', 'Get Performance Analytics');
    
    console.log('\n🔍 Testing Advanced Analytics Endpoints:');
    await testEndpoint('GET', '/advanced-analytics/trends', 'Get Trends');
    await testEndpoint('GET', '/advanced-analytics/predictions', 'Get Predictions');
    
    console.log('\n✨ Super Admin Access Tests Completed!');
}

// Run the tests
runTests().catch(console.error);