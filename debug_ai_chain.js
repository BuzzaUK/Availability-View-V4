const aiNaturalLanguageService = require('./src/backend/services/aiNaturalLanguageService');
const naturalLanguageReportService = require('./src/backend/services/naturalLanguageReportService');
const reportService = require('./src/backend/services/reportService');
require('dotenv').config({ path: './src/backend/.env' });

async function debugAIChain() {
    try {
        console.log('🔍 Debugging AI Chain...');
        
        // Step 1: Check environment
        console.log('\n=== Environment Check ===');
        console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
        console.log('API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
        
        // Step 2: Get shift data
        console.log('\n=== Getting Shift Data ===');
        const shiftId = 74;
        
        const reportData = await reportService.generateShiftReport(shiftId, {
            includeAnalysis: true,
            includeCsv: false,
            includeHtml: false
        });
        
        console.log('Shift data retrieved:');
        console.log('- Shift ID:', reportData.shift?.id);
        console.log('- Events count:', reportData.events?.length || 0);
        console.log('- Assets count:', reportData.assets?.length || 0);
        console.log('- Metrics present:', !!reportData.metrics);
        
        const shiftData = {
            shift: reportData.shift,
            metrics: reportData.metrics,
            assets: reportData.assets,
            events: reportData.events || []
        };
        
        // Step 3: Test AI service directly
        console.log('\n=== Testing AI Service Directly ===');
        try {
            const aiResult = await aiNaturalLanguageService.generateIntelligentShiftReport(shiftData, {
                includeRawData: false,
                useAI: true
            });
            
            console.log('✅ AI Service Success!');
            console.log('- Success:', aiResult.success);
            console.log('- Report Type:', aiResult.report_type);
            console.log('- Has Narrative:', !!aiResult.narrative);
            
            if (aiResult.narrative) {
                console.log('- Executive Summary Length:', aiResult.narrative.executive_summary?.length || 0);
                console.log('- Shift Overview Length:', aiResult.narrative.shift_overview?.length || 0);
            }
            
        } catch (aiError) {
            console.log('❌ AI Service Failed:', aiError.message);
            console.log('Error stack:', aiError.stack);
        }
        
        // Step 4: Test through natural language service
        console.log('\n=== Testing Natural Language Service ===');
        try {
            const nlResult = await naturalLanguageReportService.generateNaturalLanguageShiftReport(shiftId, {
                useAI: true,
                includeRawData: false
            });
            
            console.log('✅ NL Service Result:');
            console.log('- Success:', nlResult.success);
            console.log('- AI Used:', nlResult.ai_used);
            console.log('- Report Type:', nlResult.report_type);
            console.log('- Has Narrative:', !!nlResult.narrative);
            
        } catch (nlError) {
            console.log('❌ NL Service Failed:', nlError.message);
            console.log('Error stack:', nlError.stack);
        }
        
        // Step 5: Test OpenAI connection directly
        console.log('\n=== Testing OpenAI Connection ===');
        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            
            const testResponse = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Say "Hello World"' }],
                max_tokens: 10,
                timeout: 30000
            });
            
            console.log('✅ OpenAI Connection Success!');
            console.log('Response:', testResponse.choices[0]?.message?.content);
            
        } catch (openaiError) {
            console.log('❌ OpenAI Connection Failed:', openaiError.message);
            if (openaiError.status) {
                console.log('Status:', openaiError.status);
            }
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugAIChain();