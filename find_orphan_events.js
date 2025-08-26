const { sequelize } = require('./src/backend/config/database');
const { Event } = require('./src/backend/models/database');
const { Op } = require('sequelize');

const findOrphanEvents = async () => {
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
      console.log('No orphan events found.');
      return;
    }

    console.log('Found orphan events:', JSON.stringify(orphanEvents, null, 2));

  } catch (error) {
    console.error('Error finding orphan events:', error);
  } finally {
    await sequelize.close();
  }
};

findOrphanEvents();