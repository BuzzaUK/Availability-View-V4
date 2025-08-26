const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function checkArchives() {
  try {
    console.log('🔍 CHECKING ARCHIVED REPORTS IN DATABASE...\n');

    // Get all archived shift reports
    const [results] = await sequelize.query(`
      SELECT 
        id, 
        title, 
        archive_type, 
        archived_data,
        created_at
      FROM archives 
      WHERE archive_type = 'SHIFT_REPORT' 
      ORDER BY created_at DESC
    `);

    console.log(`📊 Total archived shift reports: ${results.length}\n`);

    if (results.length === 0) {
      console.log('❌ No archived shift reports found in database.');
      return;
    }

    console.log('📋 ARCHIVED SHIFT REPORTS:');
    console.log('=' .repeat(80));

    results.forEach((archive, index) => {
      console.log(`${index + 1}. Archive ID: ${archive.id}`);
      console.log(`   Title: ${archive.title}`);
      console.log(`   Created: ${new Date(archive.created_at).toLocaleString()}`);
      
      try {
        const archivedData = JSON.parse(archive.archived_data);
        console.log(`   Shift ID: ${archivedData.shift_id || 'N/A'}`);
        if (archivedData.shift_info) {
          console.log(`   Shift Name: ${archivedData.shift_info.name || 'N/A'}`);
          console.log(`   Shift Start: ${archivedData.shift_info.start_time || 'N/A'}`);
          console.log(`   Shift End: ${archivedData.shift_info.end_time || 'N/A'}`);
        }
      } catch (e) {
        console.log(`   Shift ID: [Unable to parse archived_data]`);
      }
      
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking archives:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkArchives()
  .then(() => {
    console.log('🎉 Archive check completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });