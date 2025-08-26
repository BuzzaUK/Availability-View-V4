const path = require('path');
const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

// Define Shift model
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
    }
}, {
    tableName: 'shifts',
    timestamps: false
});

async function debugShift76Data() {
    try {
        console.log('🔍 Debugging shift 76 data...');
        
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connected');
        
        // Find shift 76
        const shift = await Shift.findOne({
            where: { id: 76, archived: false }
        });
        
        if (!shift) {
            console.log('❌ Shift 76 not found or is archived');
            return;
        }
        
        console.log('\n📊 Raw Shift 76 Data:');
        console.log('ID:', shift.id);
        console.log('shift_name:', shift.shift_name);
        console.log('start_time:', shift.start_time);
        console.log('end_time:', shift.end_time);
        console.log('status:', shift.status);
        console.log('archived:', shift.archived);
        console.log('\n🔍 Full shift object:');
        console.log(JSON.stringify(shift.toJSON(), null, 2));
        
        // Check if shift_name is null/undefined
        if (!shift.shift_name) {
            console.log('\n⚠️  ISSUE FOUND: shift_name is null/undefined');
        }
        
        // Check if dates are valid
        if (!shift.start_time || isNaN(new Date(shift.start_time))) {
            console.log('\n⚠️  ISSUE FOUND: start_time is invalid');
        }
        
        if (shift.end_time && isNaN(new Date(shift.end_time))) {
            console.log('\n⚠️  ISSUE FOUND: end_time is invalid');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the debug
debugShift76Data().then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});