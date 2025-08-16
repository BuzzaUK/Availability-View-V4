// Test environment variable loading
require('dotenv').config({ path: __dirname + '/src/backend/.env' });

console.log('🔍 ENVIRONMENT VARIABLES TEST');
console.log('=' .repeat(40));

console.log('\n📧 EMAIL ENVIRONMENT VARIABLES:');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('EMAIL_PASSWORD configured:', process.env.EMAIL_PASSWORD ? 'YES' : 'NO');

console.log('\n🔧 OTHER ENVIRONMENT VARIABLES:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET configured:', process.env.JWT_SECRET ? 'YES' : 'NO');

console.log('\n📁 CURRENT WORKING DIRECTORY:');
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());

console.log('\n✅ ENVIRONMENT VARIABLES TEST COMPLETE');

// Test nodemailer configuration
const nodemailer = require('nodemailer');

console.log('\n🔧 NODEMAILER TRANSPORTER TEST:');
try {
  const port = parseInt(process.env.EMAIL_PORT, 10);
  console.log('Parsed port:', port, '(type:', typeof port, ')');
  console.log('Is port NaN?', isNaN(port));
  console.log('Port === 465?', port === 465);
  
  const transporterConfig = {
    host: process.env.EMAIL_HOST,
    port: isNaN(port) ? undefined : port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  };
  
  console.log('\nTransporter configuration:');
  console.log('Host:', transporterConfig.host);
  console.log('Port:', transporterConfig.port);
  console.log('Secure:', transporterConfig.secure);
  console.log('Auth user:', transporterConfig.auth.user);
  console.log('Auth pass configured:', transporterConfig.auth.pass ? 'YES' : 'NO');
  
  const transporter = nodemailer.createTransporter(transporterConfig);
  console.log('\n✅ Transporter created successfully');
  
  // Test connection
  console.log('\n🔗 TESTING SMTP CONNECTION...');
  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ SMTP connection failed:', error.message);
      console.log('Error code:', error.code);
      console.log('Error command:', error.command);
    } else {
      console.log('✅ SMTP connection successful!');
    }
  });
  
} catch (error) {
  console.error('❌ Transporter creation failed:', error.message);
}