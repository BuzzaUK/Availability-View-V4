const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Import controllers
const {
  getArchives,
  getArchiveById,
  createArchive,
  downloadArchive,
  deleteArchive,
  sendArchiveEmail
} = require('../controllers/archiveController');

// Get all archives
router.get('/', (req, res, next) => {
  console.log('🔍 DEBUG: Archive route hit - GET /');
  console.log('🔍 DEBUG: User:', req.user ? req.user.id : 'No user');
  next();
}, getArchives);

// Get single archive
router.get('/:id', getArchiveById);

// Create archive
router.post('/', authorizeRoles('admin', 'manager', 'operator'), createArchive);

// Download archive
router.get('/:id/download', downloadArchive);

// Delete archive
router.delete('/:id', authorizeRoles('admin', 'manager'), deleteArchive);

// Send email with archive details
router.post('/send-email', authorizeRoles('admin', 'manager', 'operator'), sendArchiveEmail);

module.exports = router;