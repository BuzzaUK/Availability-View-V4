const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles, authenticateDevice } = require('../middleware/authMiddleware');

// Import controllers
const {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetEvents,
  getAssetAnalytics
} = require('../controllers/assetController');

// Public routes
router.get('/', getAssets);
router.get('/:id', getAssetById);

// Protected routes - require authentication
router.post('/', authenticateJWT, authorizeRoles('admin', 'manager'), createAsset);
router.put('/:id', authenticateJWT, authorizeRoles('admin', 'manager'), updateAsset);
router.delete('/:id', authenticateJWT, authorizeRoles('admin'), deleteAsset);

// Asset events and statistics
router.get('/:id/events', authenticateJWT, getAssetEvents);
router.get('/:id/analytics', authenticateJWT, getAssetAnalytics);

// ESP32 device routes
router.post('/state-update', authenticateDevice, (req, res) => {
  // This route is handled directly in server.js for WebSocket integration
  res.status(200).json({ success: true });
});

module.exports = router;