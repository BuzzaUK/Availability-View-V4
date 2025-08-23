const { Archive } = require('./models/database/index');
const { sequelize } = require('./config/database');

async function debugDatabase() {
  try {
    console.log('🔍 Direct database query for Archives...');
    
    // Raw SQL query to see what's actually in the database
    const [results] = await sequelize.query(
      'SELECT id, title, archive_type, created_at FROM Archives ORDER BY created_at DESC',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('📊 Raw SQL Results:');
    console.log(results);
    
    // Sequelize query
    const archives = await Archive.findAll({
      attributes: ['id', 'title', 'archive_type', 'created_at'],
      order: [['created_at', 'DESC']]
    });
    
    console.log('📊 Sequelize Results:');
    console.log(archives.map(a => a.toJSON()));
    
    // Check specifically for SHIFT_REPORT archives
    const shiftReports = await Archive.findAll({
      where: { archive_type: 'SHIFT_REPORT' },
      attributes: ['id', 'title', 'archive_type', 'created_at'],
      order: [['created_at', 'DESC']]
    });
    
    console.log('📊 Shift Report Archives:');
    console.log(shiftReports.map(a => a.toJSON()));
    
    // Check if Archive ID 1 exists
    const archiveOne = await Archive.findByPk(1);
    console.log('📊 Archive ID 1:');
    console.log(archiveOne ? archiveOne.toJSON() : 'NOT FOUND');
    
  } catch (error) {
    console.error('❌ Database query error:', error);
  } finally {
    process.exit(0);
  }
}

debugDatabase();