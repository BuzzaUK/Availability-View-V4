import React, { useState, useEffect, useContext } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';

// Context
import AlertContext from '../../context/AlertContext';

// Styled components
const SettingsSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const GeneralSettings = () => {
  const { error, success } = useContext(AlertContext);
  
  // State for settings
  const [settings, setSettings] = useState({
    companyName: '',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    language: 'en',
    enableNotifications: true,
    enableEmailAlerts: false,
    enableSmsAlerts: false,
    dataRetentionDays: 90,
    autoBackup: true,
    autoBackupFrequency: 'daily',
    theme: 'light',
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Timezone options
  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  ];
  
  // Date format options
  const dateFormats = [
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY' },
  ];
  
  // Time format options
  const timeFormats = [
    { value: '24h', label: '24-hour (14:30)' },
    { value: '12h', label: '12-hour (2:30 PM)' },
  ];
  
  // Language options
  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Chinese' },
  ];
  
  // Auto backup frequency options
  const backupFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];
  
  // Theme options
  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System Default' },
  ];

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings');
      setSettings(response.data);
    } catch (err) {
      error('Failed to fetch settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      await axios.put('/api/settings', settings);
      success('Settings saved successfully');
    } catch (err) {
      error('Failed to save settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Handle input change
  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    setSettings(prev => ({
      ...prev,
      [name]: event.target.type === 'checkbox' ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    saveSettings();
  };

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Company Information */}
      <SettingsSection>
        <Typography variant="h6" gutterBottom>
          Company Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Company Name"
              name="companyName"
              value={settings.companyName}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
            />
          </Grid>
        </Grid>
      </SettingsSection>
      
      {/* Regional Settings */}
      <SettingsSection>
        <Typography variant="h6" gutterBottom>
          Regional Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Timezone"
              name="timezone"
              value={settings.timezone}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
            >
              {timezones.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Language"
              name="language"
              value={settings.language}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
            >
              {languages.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Date Format"
              name="dateFormat"
              value={settings.dateFormat}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
            >
              {dateFormats.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Time Format"
              name="timeFormat"
              value={settings.timeFormat}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
            >
              {timeFormats.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </SettingsSection>
      
      {/* Notification Settings */}
      <SettingsSection>
        <Typography variant="h6" gutterBottom>
          Notification Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableNotifications}
                  onChange={handleChange}
                  name="enableNotifications"
                  color="primary"
                />
              }
              label="Enable In-App Notifications"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableEmailAlerts}
                  onChange={handleChange}
                  name="enableEmailAlerts"
                  color="primary"
                />
              }
              label="Enable Email Alerts"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableSmsAlerts}
                  onChange={handleChange}
                  name="enableSmsAlerts"
                  color="primary"
                />
              }
              label="Enable SMS Alerts"
            />
          </Grid>
        </Grid>
      </SettingsSection>
      
      {/* Data Management */}
      <SettingsSection>
        <Typography variant="h6" gutterBottom>
          Data Management
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Data Retention (days)"
              name="dataRetentionDays"
              value={settings.dataRetentionDays}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
              InputProps={{ inputProps: { min: 1, max: 365 } }}
              helperText="Number of days to keep historical data"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoBackup}
                  onChange={handleChange}
                  name="autoBackup"
                  color="primary"
                />
              }
              label="Enable Automatic Backups"
            />
          </Grid>
          
          {settings.autoBackup && (
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Backup Frequency"
                name="autoBackupFrequency"
                value={settings.autoBackupFrequency}
                onChange={handleChange}
                variant="outlined"
                margin="normal"
              >
                {backupFrequencies.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
      </SettingsSection>
      
      {/* Appearance */}
      <SettingsSection>
        <Typography variant="h6" gutterBottom>
          Appearance
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Theme"
              name="theme"
              value={settings.theme}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
            >
              {themes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </SettingsSection>
      
      {/* Submit Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          disabled={saving}
          sx={{ minWidth: 120 }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
};

export default GeneralSettings;