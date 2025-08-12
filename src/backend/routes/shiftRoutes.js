const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Get all shifts
router.get('/', authenticateJWT, shiftController.getShifts);

// Get current/active shift
router.get('/current', authenticateJWT, shiftController.getCurrentShift);

// Get shift status and indicators
router.get('/status', authenticateJWT, shiftController.getShiftStatus);

// Get shift by ID
router.get('/:id', authenticateJWT, shiftController.getShiftById);

// Get shift analytics and insights
router.get('/:id/analytics', authenticateJWT, shiftController.getShiftAnalytics);

// Start a new shift (Manual)
router.post('/start', authenticateJWT, shiftController.startShift);

// End current shift (Manual)
router.post('/end', authenticateJWT, shiftController.endShift);

// Update shift
router.put('/:id', authenticateJWT, shiftController.updateShift);

// Generate and send shift report (Enhanced)
router.post('/:id/report', authenticateJWT, shiftController.sendShiftReport);

module.exports = router;