// Browser Debug Script for Report Generation Error
console.log('=== AUTHENTICATION DEBUG ===');
console.log('Token in localStorage:', localStorage.getItem('token'));
console.log('Token exists:', !!localStorage.getItem('token'));

// Check if token is valid JWT
const token = localStorage.getItem('token');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
    console.log('Token expires:', new Date(payload.exp * 1000));
    console.log('Token expired:', Date.now() > payload.exp * 1000);
  } catch (e) {
    console.log('Invalid token format:', e.message);
  }
}

console.log('\n=== API TEST ===');
// Test the API call that's failing
fetch('/api/reports/natural-language/', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('API Response Status:', response.status);
  console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
  return response.json();
})
.then(data => {
  console.log('API Response Data:', data);
})
.catch(error => {
  console.error('API Error:', error);
});

console.log('\n=== INSTRUCTIONS ===');
console.log('1. Copy and paste this entire script into your browser console');
console.log('2. Press Enter to run it');
console.log('3. Check the output for authentication issues');
console.log('4. If token is missing or expired, log in again at the login page');

// Also test a specific shift report generation
console.log('\n=== TESTING SHIFT REPORT GENERATION ===');
fetch('/api/shifts/archived', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(shifts => {
  console.log('Available shifts:', shifts.length);
  if (shifts.length > 0) {
    const firstShift = shifts[0];
    console.log('Testing with shift:', firstShift.id, firstShift.name);
    
    return fetch(`/api/reports/natural-language/shift/${firstShift.id}?includeRawData=true`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
  }
})
.then(response => {
  if (response) {
    console.log('Shift Report Status:', response.status);
    return response.json();
  }
})
.then(data => {
  if (data) {
    console.log('Shift Report Success:', data.success);
    console.log('Report Data:', data);
  }
})
.catch(error => {
  console.error('Shift Report Error:', error);
});