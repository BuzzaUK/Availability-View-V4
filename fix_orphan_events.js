const { sequelize } = require('./src/backend/config/database');
const { Event, Shift } = require('./src/backend/models/database');
const { Op } = require('sequelize');

const fixOrphanEvents = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    const orphanEvents = await Event.findAll({
      where: {
        shift_id: {
          [Op.is]: null
        }
      }
    });

    if (!orphanEvents.length) {
      console.log('No orphan events found to fix.');
      return;
    }

    console.log(`Found ${orphanEvents.length} orphan events. Attempting to fix...`);

    for (const event of orphanEvents) {
      const lastShift = await Shift.findOne({
        where: {
          status: 'completed',
          end_time: {
            [Op.ne]: null
          }
        },
        order: [['end_time', 'DESC']]
      });

      if (lastShift) {
        console.log(`Assigning shift_id ${lastShift.id} to event ${event.id}`);
        await event.update({ shift_id: lastShift.id });
      } else {
        console.log(`Could not find a completed shift for event ${event.id}`);
      }
    }

    console.log('Finished processing orphan events.');

  } catch (error) {
    console.error('Error fixing orphan events:', error);
  } finally {
    await sequelize.close();
  }
};

fixOrphanEvents();