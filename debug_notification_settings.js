const databaseService = require('./src/backend/services/databaseService');

async function debugNotificationSettings() {
    try {
        console.log('=== NOTIFICATION SETTINGS DEBUG ===');
        
        const settings = await databaseService.getNotificationSettings();
        console.log('Raw notification settings:');
        console.log(JSON.stringify(settings, null, 2));
        
        if (settings && typeof settings === 'object') {
            console.log('\nSettings keys:', Object.keys(settings));
            
            if (settings.emailSettings) {
                console.log('\nEmail settings found:');
                console.log(JSON.stringify(settings.emailSettings, null, 2));
            } else {
                console.log('\nNo emailSettings found. Checking for other email-related keys...');
                const emailKeys = Object.keys(settings).filter(key => 
                    key.toLowerCase().includes('email') || 
                    key.toLowerCase().includes('smtp') ||
                    key.toLowerCase().includes('mail')
                );
                console.log('Email-related keys:', emailKeys);
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to get notification settings:', error.message);
    }
}

debugNotificationSettings().then(() => {
    console.log('\nDebug completed');
    process.exit(0);
}).catch(error => {
    console.error('Debug failed:', error);
    process.exit(1);
});