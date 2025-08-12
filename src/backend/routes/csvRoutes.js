const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csvController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Get available CSV templates
router.get('/templates', authenticateJWT, csvController.getTemplates);

// Export data using template
router.post('/export/:template', authenticateJWT, csvController.exportWithTemplate);

// Generic export endpoint (for frontend compatibility)
router.post('/export', authenticateJWT, csvController.exportData);

// Import assets from CSV
router.post('/import/assets', authenticateJWT, csvController.importAssets);

// Generic import endpoint (for frontend compatibility)
router.post('/import', authenticateJWT, csvController.importData);

// Schedule automated CSV export
router.post('/schedule', authenticateJWT, csvController.scheduleExport);

// Alternative schedule endpoint (for frontend compatibility)
router.post('/schedules', authenticateJWT, csvController.createSchedule);

// Get scheduled exports
router.get('/schedules', authenticateJWT, csvController.getSchedules);

// Update scheduled export
router.put('/schedules/:id', authenticateJWT, csvController.updateSchedule);

// Delete scheduled export
router.delete('/schedules/:id', authenticateJWT, csvController.deleteSchedule);

// Get CSV analytics
router.get('/analytics', authenticateJWT, csvController.getAnalytics);

module.exports = router;