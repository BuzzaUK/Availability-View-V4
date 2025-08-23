// Suppress database logging
const originalLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('Executing (default):')) {
    return; // Suppress database query logs
  }
  originalLog(...args);
};

// Test assets retrieval
const databaseService = require('./src/backend/services/databaseService');

async function testAssets() {
  try {
    originalLog('Testing asset retrieval...');
    
    const assets = await databaseService.getAllAssets();
    originalLog('Assets result:', {
      type: typeof assets,
      isArray: Array.isArray(assets),
      length: assets ? assets.length : 'N/A'
    });
    
    if (assets && assets.length > 0) {
      originalLog('First asset keys:', Object.keys(assets[0]));
      originalLog('First asset name:', assets[0].name);
    } else {
      originalLog('No assets found or assets is null/undefined');
    }
    
  } catch (error) {
    originalLog('Error:', error.message);
    originalLog('Stack:', error.stack);
  }
}

testAssets();