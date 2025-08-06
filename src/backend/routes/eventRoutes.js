const express = require('express');
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  exportEvents
} = require('../controllers/eventsController');

const router = express.Router();

// Protect all routes
const { authenticateJWT } = require('../middleware/authMiddleware');
router.use(authenticateJWT);

// Routes
router.route('/')
  .get(getEvents)
  .post(createEvent);

router.route('/export')
  .get(exportEvents);

router.route('/:id')
  .get(getEvent)
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;