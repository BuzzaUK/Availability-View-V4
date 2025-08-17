const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function testDirectCurl() {
  try {
    console.log('🔍 Testing direct curl to archives endpoint...');
    
    // First, let's login to get a token
    const loginCommand = `curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"`;
    
    console.log('\n1. Logging in...');
    const loginResult = await execPromise(loginCommand);
    console.log('Login response:', loginResult.stdout);
    
    // Extract token from response
    const loginData = JSON.parse(loginResult.stdout);
    const token = loginData.token;
    
    if (!token) {
      console.log('❌ No token received');
      return;
    }
    
    console.log('✅ Token received:', token.substring(0, 20) + '...');
    
    // Test archives endpoint
    console.log('\n2. Testing /api/archives endpoint...');
    const archivesCommand = `curl -X GET http://localhost:5000/api/archives -H "Authorization: Bearer ${token}" -H "Content-Type: application/json"`;
    
    const archivesResult = await execPromise(archivesCommand);
    console.log('Archives response:', archivesResult.stdout);
    
    // Test events/archives endpoint
    console.log('\n3. Testing /api/events/archives endpoint...');
    const eventsArchivesCommand = `curl -X GET http://localhost:5000/api/events/archives -H "Authorization: Bearer ${token}" -H "Content-Type: application/json"`;
    
    const eventsArchivesResult = await execPromise(eventsArchivesCommand);
    console.log('Events archives response:', eventsArchivesResult.stdout);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
  }
}

testDirectCurl().then(() => {
  console.log('\n✅ Direct curl test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});