const express = require('express');
const router = express.Router();
const {
  getUserTeams,
  getTeamById,
  createTeam,
  updateTeam,
  inviteToTeam,
  acceptInvitation,
  removeMember,
  leaveTeam,
  deleteTeam
} = require('../controllers/teamController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Get all teams for the authenticated user
router.get('/', authenticateJWT, getUserTeams);

// Get specific team details
router.get('/:teamId', authenticateJWT, getTeamById);

// Create a new team
router.post('/', authenticateJWT, createTeam);

// Update team details
router.put('/:teamId', authenticateJWT, updateTeam);

// Invite user to team
router.post('/:teamId/invite', authenticateJWT, inviteToTeam);

// Accept team invitation
router.post('/:teamId/accept', authenticateJWT, acceptInvitation);

// Remove team member
router.delete('/:teamId/members/:memberId', authenticateJWT, removeMember);

// Leave team
router.post('/:teamId/leave', authenticateJWT, leaveTeam);

// Delete team (requires confirmation)
router.delete('/:teamId', authenticateJWT, deleteTeam);

module.exports = router;