const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Import controllers (using development version for in-memory storage)
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout
} = require('../controllers/authController.dev');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

// Protected routes - require authentication
router.get('/me', authenticateJWT, getMe);
router.put('/update-details', authenticateJWT, updateDetails);
router.put('/update-password', authenticateJWT, updatePassword);
router.get('/logout', authenticateJWT, logout);

module.exports = router;