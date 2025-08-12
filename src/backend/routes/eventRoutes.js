const express = require('express');
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  exportEvents,
  archiveEvents,
  getEventArchives,
  restoreEventArchive,
  deleteEventArchive
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

// Archive routes
router.route('/archive')
  .post(archiveEvents);

router.route('/archives')
  .get(getEventArchives);

router.route('/archives/:id/restore')
  .post(restoreEventArchive);

router.route('/archives/:id')
  .delete(deleteEventArchive);

router.route('/:id')
  .get(getEvent)
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;