const memoryDB = require('../utils/memoryDB');
const fs = require('fs').promises;
const path = require('path');

// @desc    Get all backups
// @route   GET /api/backups
// @access  Private (Admin, Manager)
const getBackups = async (req, res) => {
  try {
    const backups = memoryDB.getBackups();
    
    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get backup by ID
// @route   GET /api/backups/:id
// @access  Private (Admin, Manager)
const getBackupById = async (req, res) => {
  try {
    const backup = memoryDB.getBackupById(req.params.id);
    
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    
    res.json({ success: true, data: backup });
  } catch (error) {
    console.error('Error fetching backup:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new backup
// @route   POST /api/backups
// @access  Private (Admin)
const createBackup = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide backup name' 
      });
    }
    
    // Create backup data
    const backupData = {
      users: memoryDB.getUsers(),
      events: memoryDB.getEvents(),
      assets: memoryDB.getAssets(),
      settings: memoryDB.getSettings(),
      shifts: memoryDB.getShifts(),
      reports: memoryDB.getReports(),
      archives: memoryDB.getArchives()
    };
    
    // Create backup record
    const newBackup = memoryDB.createBackup({
      name,
      description: description || '',
      data: backupData,
      createdBy: req.user.id
    });
    
    res.status(201).json({ success: true, data: newBackup });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Restore backup
// @route   POST /api/backups/:id/restore
// @access  Private (Admin)
const restoreBackup = async (req, res) => {
  try {
    const backup = memoryDB.getBackupById(req.params.id);
    
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    
    // Restore data from backup
    if (backup.data) {
      if (backup.data.users) memoryDB.restoreUsers(backup.data.users);
      if (backup.data.events) memoryDB.restoreEvents(backup.data.events);
      if (backup.data.assets) memoryDB.restoreAssets(backup.data.assets);
      if (backup.data.settings) memoryDB.restoreSettings(backup.data.settings);
      if (backup.data.shifts) memoryDB.restoreShifts(backup.data.shifts);
      if (backup.data.reports) memoryDB.restoreReports(backup.data.reports);
      if (backup.data.archives) memoryDB.restoreArchives(backup.data.archives);
    }
    
    res.json({ 
      success: true, 
      message: 'Backup restored successfully',
      restoredAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Download backup
// @route   GET /api/backups/:id/download
// @access  Private (Admin, Manager)
const downloadBackup = async (req, res) => {
  try {
    const backup = memoryDB.getBackupById(req.params.id);
    
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.name}.json"`);
    
    res.json(backup);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete backup
// @route   DELETE /api/backups/:id
// @access  Private (Admin)
const deleteBackup = async (req, res) => {
  try {
    const backup = memoryDB.getBackupById(req.params.id);
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    
    memoryDB.deleteBackup(req.params.id);
    
    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Upload backup
// @route   POST /api/backups/upload
// @access  Private (Admin)
const uploadBackup = async (req, res) => {
  try {
    const { name, data } = req.body;
    
    // Validation
    if (!name || !data) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide backup name and data' 
      });
    }
    
    // Create backup record from uploaded data
    const newBackup = memoryDB.createBackup({
      name,
      description: 'Uploaded backup',
      data: data,
      createdBy: req.user.id
    });
    
    res.status(201).json({ 
      success: true, 
      data: newBackup,
      message: 'Backup uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading backup:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getBackups,
  getBackupById,
  createBackup,
  restoreBackup,
  downloadBackup,
  deleteBackup,
  uploadBackup
};