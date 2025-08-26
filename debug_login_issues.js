/**
 * Debug Login Issues Script
 * This script helps diagnose and fix authentication and socket connection problems
 * Run this in the browser console after attempting to log in
 */

console.log('🔧 Starting Login Issues Debug...');
console.log('=' .repeat(60));

// Function to check authentication state
function checkAuthState() {
  console.log('\n1️⃣ CHECKING AUTHENTICATION STATE:');
  
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('   Token in localStorage:', token ? 'Present ✅' : 'Missing ❌');
  console.log('   User in localStorage:', user ? 'Present ✅' : 'Missing ❌');
  
  if (token) {
    try {
      // Decode JWT to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < now;
      
      console.log('   Token expiration:', new Date(payload.exp * 1000).toLocaleString());
      console.log('   Token status:', isExpired ? 'EXPIRED ❌' : 'Valid ✅');
      console.log('   User ID from token:', payload.id);
      console.log('   User role from token:', payload.role);
      
      if (isExpired) {
        console.log('   🚨 TOKEN IS EXPIRED - This is likely the root cause!');
        return false;
      }
      return true;
    } catch (e) {
      console.log('   🚨 TOKEN IS MALFORMED:', e.message);
      return false;
    }
  }
  return false;
}

// Function to test API connectivity
async function testAPIConnectivity() {
  console.log('\n2️⃣ TESTING API CONNECTIVITY:');
  
  try {
    // Test backend health
    const response = await fetch('http://localhost:5000/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   Backend response status:', response.status);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('   ✅ API is working, user data:', data.data);
      return true;
    } else if (response.status === 401) {
      console.log('   ❌ Authentication failed - token is invalid or expired');
      return false;
    } else {
      console.log('   ❌ API error:', response.statusText);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Network error:', error.message);
    console.log('   🔍 Check if backend is running on http://localhost:5000');
    return false;
  }
}

// Function to check socket connection
function checkSocketConnection() {
  console.log('\n3️⃣ CHECKING SOCKET CONNECTION:');
  
  // Look for socket in window or global scope
  const socketContext = window.React && window.React.useContext ? 'Available' : 'Not Available';
  console.log('   React Context:', socketContext);
  
  // Check for socket.io connection
  if (window.io) {
    console.log('   Socket.IO library: Available ✅');
  } else {
    console.log('   Socket.IO library: Not Available ❌');
  }
  
  // Check for active socket connections
  const sockets = document.querySelectorAll('[data-socket]');
  console.log('   Active socket elements:', sockets.length);
}

// Function to attempt re-login
async function attemptReLogin() {
  console.log('\n4️⃣ ATTEMPTING RE-LOGIN:');
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('   ✅ Re-login successful!');
      console.log('   User:', data.user.name, '(' + data.user.role + ')');
      console.log('   🔄 Please refresh the page to apply changes');
      
      return true;
    } else {
      const errorData = await response.json();
      console.log('   ❌ Re-login failed:', errorData.message);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Re-login error:', error.message);
    return false;
  }
}

// Function to clear authentication and start fresh
function clearAuthAndRestart() {
  console.log('\n5️⃣ CLEARING AUTHENTICATION STATE:');
  
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.clear();
  
  console.log('   ✅ Cleared all authentication data');
  console.log('   🔄 Redirecting to login page...');
  
  setTimeout(() => {
    window.location.href = '/login';
  }, 1000);
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('\n🔍 RUNNING COMPREHENSIVE DIAGNOSTICS...');
  
  const hasValidToken = checkAuthState();
  const apiWorking = await testAPIConnectivity();
  checkSocketConnection();
  
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log('   Valid Token:', hasValidToken ? '✅' : '❌');
  console.log('   API Working:', apiWorking ? '✅' : '❌');
  
  if (!hasValidToken || !apiWorking) {
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    
    if (!hasValidToken) {
      console.log('   1. Token is missing or expired');
      console.log('   2. Try automatic re-login: await attemptReLogin()');
      console.log('   3. Or clear auth and login manually: clearAuthAndRestart()');
    }
    
    if (!apiWorking) {
      console.log('   1. Check if backend server is running');
      console.log('   2. Verify backend is accessible at http://localhost:5000');
      console.log('   3. Check network connectivity');
    }
    
    console.log('\n💡 QUICK FIXES:');
    console.log('   • Run: await attemptReLogin() - to try automatic login');
    console.log('   • Run: clearAuthAndRestart() - to clear state and restart');
    console.log('   • Refresh page after successful re-login');
  } else {
    console.log('\n✅ Authentication appears to be working correctly!');
    console.log('   If you\'re still having issues, check:');
    console.log('   • Browser console for React errors');
    console.log('   • Network tab for failed requests');
    console.log('   • Socket connection logs');
  }
}

// Export functions to global scope for easy access
window.checkAuthState = checkAuthState;
window.testAPIConnectivity = testAPIConnectivity;
window.attemptReLogin = attemptReLogin;
window.clearAuthAndRestart = clearAuthAndRestart;
window.runDiagnostics = runDiagnostics;

// Auto-run diagnostics
runDiagnostics();

console.log('\n🎯 AVAILABLE COMMANDS:');
console.log('   • runDiagnostics() - Run full diagnostic check');
console.log('   • checkAuthState() - Check token status');
console.log('   • testAPIConnectivity() - Test backend connection');
console.log('   • attemptReLogin() - Try automatic re-login');
console.log('   • clearAuthAndRestart() - Clear auth and restart');
console.log('\n📋 Copy and paste this entire script into browser console to run!');