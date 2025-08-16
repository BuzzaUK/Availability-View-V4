// Simple script to check current shift without verbose logging
process.env.NODE_ENV = 'production'; // Reduce logging

const { Shift } = require('./src/backend/models/database');

async function checkCurrentShift() {
  try {
    const currentShift = await Shift.findOne({
      where: { is_current: true },
      logging: false // Disable SQL logging
    });
    
    const now = new Date();
    console.log('Current time (London):', now.toLocaleString('en-GB', { timeZone: 'Europe/London' }));
    
    if (currentShift) {
      console.log('\nCurrent shift:');
      console.log('- Start:', new Date(currentShift.start_time).toLocaleString('en-GB', { timeZone: 'Europe/London' }));
      console.log('- End:', new Date(currentShift.end_time).toLocaleString('en-GB', { timeZone: 'Europe/London' }));
      
      const endTime = new Date(currentShift.end_time);
      const timeDiff = endTime - now;
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      console.log('\nCountdown calculation:');
      console.log('- Time until end:', `${hours}H ${minutes}M`);
      console.log('- Milliseconds diff:', timeDiff);
    } else {
      console.log('\nNo current shift found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCurrentShift();