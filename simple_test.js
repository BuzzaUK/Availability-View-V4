console.log('Hello from Node.js!');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

// Test axios import
try {
  const axios = require('axios');
  console.log('✅ Axios loaded successfully');
} catch (error) {
  console.log('❌ Axios failed to load:', error.message);
}

console.log('Script completed successfully');