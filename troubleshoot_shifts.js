const { sequelize } = require('./src/backend/config/database');
const { Event, Shift } = require('./src/backend/models/database');

const troubleshootShifts = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    const shifts = await Shift.findAll({
      where: {
        id: [74, 75]
      }
    });

    if (!shifts.length) {
      console.log('Shifts 74 and 75 not found.');
      return;
    }

    console.log('Found shifts:', JSON.stringify(shifts, null, 2));

    for (const shift of shifts) {
      const events = await Event.findAll({
        where: {
          shift_id: shift.id
        }
      });
      console.log(`Events for shift ${shift.id}:`, JSON.stringify(events, null, 2));
    }

  } catch (error) {
    console.error('Error troubleshooting shifts:', error);
  } finally {
    await sequelize.close();
  }
};

troubleshootShifts();