const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Import controllers (using development version for in-memory storage)
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// All routes require authentication
router.use(authenticateJWT);

// Routes
router.get('/', authorizeRoles('admin', 'manager'), getUsers);
router.get('/:id', authorizeRoles('admin', 'manager'), getUserById);
router.post('/', authorizeRoles('admin'), createUser);
router.put('/:id', authorizeRoles('admin'), updateUser);
router.delete('/:id', authorizeRoles('admin'), deleteUser);

module.exports = router;