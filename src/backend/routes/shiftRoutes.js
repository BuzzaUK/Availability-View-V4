const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Get all shifts
router.get('/', authenticateJWT, shiftController.getShifts);

// Get current/active shift
router.get('/current', authenticateJWT, shiftController.getCurrentShift);

// Get shift by ID
router.get('/:id', authenticateJWT, shiftController.getShiftById);

// Start a new shift
router.post('/start', authenticateJWT, shiftController.startShift);

// End current shift
router.post('/end', authenticateJWT, shiftController.endShift);

// Update shift
router.put('/:id', authenticateJWT, shiftController.updateShift);

// Send shift report
router.post('/:id/report', authenticateJWT, shiftController.sendShiftReport);

module.exports = router;