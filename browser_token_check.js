// Browser Console Script to Check and Fix Authentication
// Copy and paste this into your browser's developer console (F12)

console.log('=== Authentication Token Check ===');

// Check if token exists in localStorage
const currentToken = localStorage.getItem('token');
const currentUser = localStorage.getItem('user');

console.log('Current token:', currentToken ? 'EXISTS' : 'NOT FOUND');
console.log('Current user:', currentUser ? 'EXISTS' : 'NOT FOUND');

if (currentToken) {
  console.log('Token preview:', currentToken.substring(0, 50) + '...');
  
  // Try to decode the JWT to check expiration
  try {
    const payload = JSON.parse(atob(currentToken.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < now;
    
    console.log('Token expiration:', new Date(payload.exp * 1000));
    console.log('Token expired:', isExpired);
    console.log('User ID:', payload.id);
    console.log('User role:', payload.role);
    
    if (isExpired) {
      console.log('❌ Token is expired - this is the problem!');
      console.log('Solution: Please log out and log back in.');
    } else {
      console.log('✅ Token is valid');
    }
  } catch (e) {
    console.log('❌ Token format is invalid:', e.message);
  }
} else {
  console.log('❌ No token found - user needs to log in');
}

// Function to manually set a fresh token (for testing)
window.setTestToken = function() {
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6InN1cGVyX2FkbWluIiwiaWF0IjoxNzU2MDMzNzgwLCJleHAiOjE3NTY2Mzg1ODB9.zmu9VqjD-nOnaCe7lTIH4K83T1HvI9Opb6UeZ3mQM38';
  localStorage.setItem('token', testToken);
  localStorage.setItem('user', JSON.stringify({id: 1, role: 'super_admin', email: 'admin@example.com'}));
  console.log('✅ Test token set! Refresh the page to use it.');
};

console.log('\n=== Instructions ===');
console.log('1. If token is expired or missing, log out and log back in');
console.log('2. Or run setTestToken() to use a fresh token for testing');
console.log('3. Then refresh the page and try generating reports again');