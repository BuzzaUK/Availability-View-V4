const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');
const { 
  authenticateWithPermissions, 
  requirePermission,
  validatePermissionUpdate,
  logPermissionAction
} = require('../middleware/enhancedAuthMiddleware');

// Import controllers
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
  updateCurrentUser
} = require('../controllers/userController');

// All routes require enhanced authentication
router.use(authenticateWithPermissions);

// Current user routes (no additional permissions needed)
router.get('/me', getCurrentUser);
router.put('/me', updateCurrentUser);

// Admin routes with permission checks
router.get('/', 
  requirePermission('system', 'manage_users'),
  logPermissionAction('view_users'),
  getUsers
);

router.get('/:id', 
  requirePermission('system', 'manage_users'),
  logPermissionAction('view_user'),
  getUserById
);

router.post('/', 
  requirePermission('system', 'manage_users'),
  validatePermissionUpdate(),
  logPermissionAction('create_user'),
  createUser
);

router.put('/:id', 
  requirePermission('system', 'manage_users'),
  validatePermissionUpdate(),
  logPermissionAction('update_user'),
  updateUser
);

router.delete('/:id', 
  requirePermission('system', 'manage_users'),
  logPermissionAction('delete_user'),
  deleteUser
);

module.exports = router;