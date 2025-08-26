const axios = require('axios');

async function testSimpleNLReport() {
    try {
        console.log('🔍 Testing Simple NL Report (without AI)...');
        
        // First authenticate
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@example.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Authentication successful');
        
        // Test WITHOUT AI first
        console.log('🔍 Testing report generation WITHOUT AI...');
        const responseNoAI = await axios.get('http://localhost:5000/api/reports/natural-language/shift/78?useAI=false', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        console.log('✅ Report WITHOUT AI - Status:', responseNoAI.status);
        console.log('- Success:', responseNoAI.data.success);
        console.log('- AI Used:', responseNoAI.data.ai_used);
        console.log('- Report Type:', responseNoAI.data.report_type);
        console.log('- Has Narrative:', !!responseNoAI.data.narrative);
        
        if (responseNoAI.data.narrative) {
            console.log('- Executive Summary Length:', responseNoAI.data.narrative.executive_summary?.length || 0);
        }
        
        // Now test WITH AI but with shorter timeout
        console.log('\n🔍 Testing report generation WITH AI (short timeout)...');
        try {
            const responseWithAI = await axios.get('http://localhost:5000/api/reports/natural-language/shift/78?useAI=true', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000 // 15 second timeout
            });
            
            console.log('✅ Report WITH AI - Status:', responseWithAI.status);
            console.log('- Success:', responseWithAI.data.success);
            console.log('- AI Used:', responseWithAI.data.ai_used);
            console.log('- Report Type:', responseWithAI.data.report_type);
            
        } catch (aiError) {
            if (aiError.code === 'ECONNABORTED') {
                console.log('⏰ AI request timed out - this suggests the AI service is taking too long');
            } else {
                console.error('❌ AI request failed:', aiError.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testSimpleNLReport();