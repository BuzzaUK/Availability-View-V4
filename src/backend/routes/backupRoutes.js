const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Import controllers (using development version for in-memory storage)
const {
  getBackups,
  getBackupById,
  createBackup,
  restoreBackup,
  downloadBackup,
  deleteBackup,
  uploadBackup
} = require('../controllers/backupController');

// All routes require authentication
router.use(authenticateJWT);

// Routes
router.get('/', authorizeRoles('admin', 'manager'), getBackups);
router.get('/:id', authorizeRoles('admin', 'manager'), getBackupById);
router.post('/', authorizeRoles('super_admin', 'admin'), createBackup);
router.post('/:id/restore', authorizeRoles('super_admin', 'admin'), restoreBackup);
router.get('/:id/download', authorizeRoles('admin', 'manager'), downloadBackup);
router.delete('/:id', authorizeRoles('super_admin', 'admin'), deleteBackup);
router.post('/upload', authorizeRoles('admin'), uploadBackup);

module.exports = router;