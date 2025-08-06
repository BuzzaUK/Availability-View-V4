const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Import controllers
const {
  getArchives,
  getArchiveById,
  createArchive,
  downloadArchive,
  deleteArchive
} = require('../controllers/archiveController');

// Get all archives
router.get('/', getArchives);

// Get single archive
router.get('/:id', getArchiveById);

// Create archive
router.post('/', authorizeRoles('admin', 'manager', 'operator'), createArchive);

// Download archive
router.get('/:id/download', downloadArchive);

// Delete archive
router.delete('/:id', authorizeRoles('admin', 'manager'), deleteArchive);

module.exports = router;