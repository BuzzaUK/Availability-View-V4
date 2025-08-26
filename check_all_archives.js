const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function checkAllArchives() {
  try {
    console.log('🔍 CHECKING ALL ARCHIVES IN DATABASE...\n');

    // Get all archives
    const [archives] = await sequelize.query(`
      SELECT 
        id,
        title,
        description,
        archive_type,
        date_range_start,
        date_range_end,
        created_at,
        status
      FROM archives 
      ORDER BY created_at DESC
    `);

    console.log(`📊 Total archives found: ${archives.length}\n`);

    if (archives.length === 0) {
      console.log('❌ No archives found in the database.');
      return;
    }

    console.log('📋 ALL ARCHIVES:');
    console.log('=' .repeat(100));

    archives.forEach((archive, index) => {
      console.log(`${index + 1}. ${archive.title}`);
      console.log(`   ID: ${archive.id}`);
      console.log(`   Type: ${archive.archive_type}`);
      console.log(`   Description: ${archive.description || 'No description'}`);
      console.log(`   Status: ${archive.status}`);
      console.log(`   Date Range: ${archive.date_range_start} to ${archive.date_range_end}`);
      console.log(`   Created: ${new Date(archive.created_at).toLocaleString()}`);
      console.log('');
    });

    // Group by archive type
    const archivesByType = {};
    archives.forEach(archive => {
      if (!archivesByType[archive.archive_type]) {
        archivesByType[archive.archive_type] = [];
      }
      archivesByType[archive.archive_type].push(archive);
    });

    console.log('\n📊 ARCHIVES BY TYPE:');
    console.log('=' .repeat(50));
    Object.keys(archivesByType).forEach(type => {
      console.log(`${type}: ${archivesByType[type].length} archives`);
      archivesByType[type].forEach(archive => {
        console.log(`   - ${archive.title} (ID: ${archive.id})`);
      });
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking archives:', error);
  } finally {
    await sequelize.close();
  }
}

checkAllArchives();