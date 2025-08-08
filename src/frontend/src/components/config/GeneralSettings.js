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

// Context
import AlertContext from '../../context/AlertContext';
import SettingsContext from '../../context/SettingsContext';

// Styled components
const SettingsSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const GeneralSettings = () => {
  const { error, success } = useContext(AlertContext);
  const { settings, loading, updateSettings } = useContext(SettingsContext);
  
  // Local state for form
  const [formSettings, setFormSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  // Update form when settings change
  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);
  
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

  // Refresh interval options (in seconds)
  const refreshIntervals = [
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
  ];

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      console.log('🔍 SUBMITTING FORM SETTINGS:', formSettings);
      const result = await updateSettings(formSettings);
      if (result.success) {
        success('Settings saved successfully');
      } else {
        error('Failed to save settings: ' + result.error);
      }
    } catch (err) {
      error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle input change
  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    setFormSettings(prev => ({
      ...prev,
      [name]: event.target.type === 'checkbox' ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    saveSettings();
  };

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
              value={formSettings.companyName || ''}
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
              value={formSettings.timezone || 'UTC'}
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
              value={formSettings.language || 'en'}
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
              value={formSettings.dateFormat || 'YYYY-MM-DD'}
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
              value={formSettings.timeFormat || '24h'}
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
                  checked={formSettings.enableNotifications || false}
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
                  checked={formSettings.enableEmailAlerts || false}
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
                  checked={formSettings.enableSmsAlerts || false}
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
              value={formSettings.dataRetentionDays || 90}
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
                  checked={formSettings.autoBackup || false}
                  onChange={handleChange}
                  name="autoBackup"
                  color="primary"
                />
              }
              label="Enable Automatic Backups"
            />
          </Grid>
          
          {formSettings.autoBackup && (
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Backup Frequency"
                name="autoBackupFrequency"
                value={formSettings.autoBackupFrequency || 'daily'}
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
      
      {/* Dashboard Auto-Refresh */}
      <SettingsSection>
        <Typography variant="h6" gutterBottom>
          Dashboard Auto-Refresh
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formSettings.autoRefresh || false}
                  onChange={handleChange}
                  name="autoRefresh"
                  color="primary"
                />
              }
              label="Enable Auto-Refresh"
            />
          </Grid>
          
          {formSettings.autoRefresh && (
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Refresh Interval"
                name="refreshInterval"
                value={formSettings.refreshInterval || 30}
                onChange={handleChange}
                variant="outlined"
                margin="normal"
                helperText="How often the dashboard should automatically refresh"
              >
                {refreshIntervals.map((option) => (
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
              value={formSettings.theme || 'light'}
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          onClick={() => {
            console.log('🔍 CURRENT FORM SETTINGS:', formSettings);
            console.log('🔍 CURRENT CONTEXT SETTINGS:', settings);
          }}
        >
          Debug Settings
        </Button>
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