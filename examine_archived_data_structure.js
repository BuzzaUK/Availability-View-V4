const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Database setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

// Archive model
const Archive = sequelize.define('Archive', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  archive_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  archived_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  date_range_start: DataTypes.DATE,
  date_range_end: DataTypes.DATE,
  created_by: DataTypes.INTEGER,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'ACTIVE'
  }
}, {
  tableName: 'archives',
  timestamps: true
});

async function examineArchivedDataStructure() {
  try {
    console.log('🔍 EXAMINING ARCHIVED DATA STRUCTURE...');
    console.log('=' .repeat(60));
    
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Get all shift report archives using raw SQL
    const [archives] = await sequelize.query(`
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
    
    console.log(`\n📊 Found ${archives.length} shift report archives`);
    
    archives.forEach((archive, index) => {
      console.log(`\n📋 ARCHIVE ${index + 1}:`);
      console.log('=' .repeat(40));
      console.log(`ID: ${archive.id}`);
      console.log(`Title: ${archive.title}`);
      console.log(`Type: ${archive.archive_type}`);
      console.log(`Created: ${new Date(archive.created_at).toLocaleString()}`);
      
      if (archive.archived_data) {
        try {
          const archivedData = JSON.parse(archive.archived_data);
          console.log('\n🔍 ARCHIVED DATA STRUCTURE:');
          console.log(JSON.stringify(archivedData, null, 2));
          
          // Check different possible locations for shift_id
          const possibleShiftIds = {
            'archived_data.shift_id': archivedData.shift_id,
            'archived_data.shift_info.id': archivedData.shift_info?.id,
            'archived_data.shift_info.shift_id': archivedData.shift_info?.shift_id,
            'direct shift_id field': archive.shift_id
          };
          
          console.log('\n🔑 POSSIBLE SHIFT ID LOCATIONS:');
          Object.entries(possibleShiftIds).forEach(([location, value]) => {
            console.log(`   ${location}: ${value || 'undefined'}`);
          });
          
          // Determine the correct shift_id
          const correctShiftId = archivedData.shift_info?.id || 
                                archivedData.shift_id || 
                                archive.shift_id;
          
          console.log(`\n✅ DETERMINED SHIFT ID: ${correctShiftId}`);
        } catch (parseError) {
          console.log('\n❌ Error parsing archived_data JSON:', parseError.message);
        }
      } else {
        console.log('\n❌ No archived_data found');
      }
    });
    
    console.log('\n🎯 ANALYSIS COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error examining archived data structure:', error.message);
  } finally {
    await sequelize.close();
  }
}

examineArchivedDataStructure();