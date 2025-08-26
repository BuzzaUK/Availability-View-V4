const path = require('path');
const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

// Define models based on actual database schema
const Shift = sequelize.define('Shift', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    shift_name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    start_time: {
        type: Sequelize.DATE,
        allowNull: false
    },
    end_time: {
        type: Sequelize.DATE,
        allowNull: true
    },
    status: {
        type: Sequelize.STRING,
        allowNull: false
    },
    archived: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },
    archive_path: {
        type: Sequelize.STRING,
        allowNull: true
    }
}, {
    tableName: 'shifts',
    timestamps: true
});

const EventArchive = sequelize.define('EventArchive', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    shift_id: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    archive_type: {
        type: Sequelize.STRING,
        allowNull: false
    },
    data: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    file_path: {
        type: Sequelize.STRING,
        allowNull: true
    },
    archived_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: 'event_archives',
    timestamps: true
});

async function countShiftReports() {
    try {
        console.log('🔍 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connection established.');

        // Count total shifts
        const totalShifts = await Shift.count();
        console.log(`\n📊 SHIFTS COUNT:`);
        console.log(`Total Shifts: ${totalShifts}`);

        if (totalShifts > 0) {
            // Count archived vs non-archived shifts
            const archivedCount = await Shift.count({ where: { archived: true } });
            const nonArchivedCount = await Shift.count({ where: { archived: false } });
            
            console.log(`Archived Shifts: ${archivedCount}`);
            console.log(`Non-Archived Shifts: ${nonArchivedCount}`);

            // Count completed vs active shifts
            const completedCount = await Shift.count({ where: { status: 'completed' } });
            const activeCount = await Shift.count({ where: { status: 'active' } });
            
            console.log(`Completed Shifts: ${completedCount}`);
            console.log(`Active Shifts: ${activeCount}`);

            // Get all shifts with details
            console.log('\n📋 ALL SHIFTS:');
            const allShifts = await Shift.findAll({
                order: [['created_at', 'DESC']],
                attributes: ['id', 'shift_name', 'start_time', 'end_time', 'status', 'archived', 'archive_path']
            });

            allShifts.forEach(shift => {
                console.log(`ID: ${shift.id}`);
                console.log(`  Name: ${shift.shift_name}`);
                console.log(`  Start: ${shift.start_time}`);
                console.log(`  End: ${shift.end_time || 'N/A'}`);
                console.log(`  Status: ${shift.status}`);
                console.log(`  Archived: ${shift.archived}`);
                console.log(`  Archive Path: ${shift.archive_path || 'N/A'}`);
                console.log('---');
            });
        }

        // Check event archives for shift reports
        console.log('\n📁 EVENT ARCHIVES:');
        const totalArchives = await EventArchive.count();
        console.log(`Total Event Archives: ${totalArchives}`);

        if (totalArchives > 0) {
            // Check all archive types
            const archiveTypes = await EventArchive.findAll({
                attributes: [
                    'archive_type',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['archive_type']
            });

            console.log('\n📂 ARCHIVE TYPES:');
            archiveTypes.forEach(type => {
                console.log(`${type.archive_type}: ${type.dataValues.count}`);
            });

            // Get all archives
            console.log('\n📋 ALL EVENT ARCHIVES:');
            const allArchives = await EventArchive.findAll({
                order: [['archived_at', 'DESC']],
                attributes: ['id', 'shift_id', 'archive_type', 'archived_at', 'file_path']
            });

            allArchives.forEach(archive => {
                console.log(`ID: ${archive.id}, Shift: ${archive.shift_id}, Type: ${archive.archive_type}, Archived: ${archive.archived_at}, File: ${archive.file_path || 'N/A'}`);
            });
        }

        // Check for shift reports in the reports directory
        console.log('\n📁 CHECKING REPORTS DIRECTORY:');
        const fs = require('fs');
        const reportsDir = path.join(__dirname, 'reports');
        
        if (fs.existsSync(reportsDir)) {
            const files = fs.readdirSync(reportsDir);
            const csvFiles = files.filter(file => file.endsWith('.csv'));
            console.log(`CSV files in reports directory: ${csvFiles.length}`);
            
            csvFiles.forEach(file => {
                console.log(`- ${file}`);
            });
        } else {
            console.log('Reports directory does not exist');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
        console.log('\n🔒 Database connection closed.');
    }
}

countShiftReports();