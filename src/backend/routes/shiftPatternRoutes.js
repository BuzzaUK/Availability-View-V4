const express = require('express');
const router = express.Router();
const {
  getShiftPatterns,
  getShiftPatternById,
  createShiftPattern,
  updateShiftPattern,
  deleteShiftPattern,
  assignShiftPatternToTeam,
  removeShiftPatternFromTeam,
  getTeamShiftAssignments
} = require('../controllers/shiftPatternController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Get all shift patterns
router.get('/', authenticateJWT, getShiftPatterns);

// Get shift pattern by ID
router.get('/:id', authenticateJWT, getShiftPatternById);

// Create new shift pattern (admin/manager only)
router.post('/', authenticateJWT, authorizeRoles(['super_admin', 'admin', 'manager']), createShiftPattern);

// Update shift pattern
router.put('/:id', authenticateJWT, updateShiftPattern);

// Delete shift pattern (requires confirmation)
router.delete('/:id', authenticateJWT, deleteShiftPattern);

// Assign shift pattern to team
router.post('/:shiftPatternId/assign/:teamId', authenticateJWT, assignShiftPatternToTeam);

// Remove shift pattern assignment from team
router.delete('/assignments/:assignmentId', authenticateJWT, removeShiftPatternFromTeam);

// Get team shift assignments
router.get('/teams/:teamId/assignments', authenticateJWT, getTeamShiftAssignments);

module.exports = router;