const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');
const invitationController = require('../controllers/invitationController');

// Public routes
router.get('/verify/:token', invitationController.verifyInvitation);
router.post('/accept', invitationController.acceptInvitation);

// Protected routes
router.post('/send', authenticateJWT, authorizeRoles('admin'), invitationController.sendInvitation);
router.get('/', authenticateJWT, authorizeRoles('admin', 'manager'), invitationController.getPendingInvitations);
router.delete('/:id', authenticateJWT, authorizeRoles('admin'), invitationController.cancelInvitation);

module.exports = router;