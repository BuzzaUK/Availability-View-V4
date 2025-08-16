import React, { useState, useEffect, useContext } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ScheduleIcon from '@mui/icons-material/Schedule';
import axios from 'axios';

// Context
import AlertContext from '../../context/AlertContext';
import SocketContext from '../../context/SocketContext';

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const NotificationSettings = () => {
  const { error, success } = useContext(AlertContext);
  const { socket } = useContext(SocketContext);
  
  // State for notification settings
  const [settings, setSettings] = useState({
    enabled: true,
    channels: {
      inApp: true,
      email: false,
      sms: false
    },
    emailSettings: {
      smtpServer: '',
      port: 587,
      username: '',
      password: '',
      fromEmail: '',
      useTLS: true
    },
    smsSettings: {
      provider: 'twilio',
      accountSid: '',
      authToken: '',
      fromNumber: ''
    },
    shiftSettings: {
      enabled: false,
      shiftTimes: [],
      emailFormat: 'pdf',
      autoSend: true
    },
    eventNotifications: {
      assetStopped: {
        enabled: true,
        channels: ['inApp', 'email'],
        minDuration: 5,
        recipients: []
      },
      assetWarning: {
        enabled: true,
        channels: ['inApp'],
        recipients: []
      },
      shiftStart: {
        enabled: true,
        channels: ['inApp'],
        recipients: []
      },
      shiftEnd: {
        enabled: true,
        channels: ['inApp', 'email'],
        recipients: []
      },
      oeeThresholdAlert: {
        enabled: true,
        channels: ['inApp', 'email'],
        recipients: []
      }
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  
  // SMS providers
  const smsProviders = [
    { value: 'twilio', label: 'Twilio' },
    { value: 'aws-sns', label: 'AWS SNS' },
    { value: 'custom', label: 'Custom API' }
  ];

  // Helper functions for shift settings
  const handleShiftTimeChange = (index, value) => {
    const newShiftTimes = [...settings.shiftSettings.shiftTimes];
    newShiftTimes[index] = value;
    setSettings(prev => ({
      ...prev,
      shiftSettings: {
        ...prev.shiftSettings,
        shiftTimes: newShiftTimes
      }
    }));
  };

  const addShiftTime = () => {
    setSettings(prev => ({
      ...prev,
      shiftSettings: {
        ...prev.shiftSettings,
        shiftTimes: [...prev.shiftSettings.shiftTimes, '08:00']
      }
    }));
  };

  const removeShiftTime = (index) => {
    const newShiftTimes = settings.shiftSettings.shiftTimes.filter((_, i) => i !== index);
    setSettings(prev => ({
      ...prev,
      shiftSettings: {
        ...prev.shiftSettings,
        shiftTimes: newShiftTimes
      }
    }));
  };

  // Fetch notification settings
  const fetchSettings = async () => {
    console.log('🔍 FRONTEND fetchSettings called, making request to /api/settings/notifications');
    try {
      setLoading(true);
      const response = await axios.get('/api/settings/notifications');
      const newSettings = response.data;

      // Debug: Log what we received from backend
      console.log('🔍 FRONTEND RECEIVED FROM BACKEND:', newSettings);
      console.log('🔍 FRONTEND RECEIVED EMAIL SETTINGS:', newSettings.emailSettings);

      setSettings(prevSettings => {
        // Debug: Log previous settings
        console.log('🔍 FRONTEND PREVIOUS EMAIL SETTINGS:', prevSettings.emailSettings);

        const mergedEventNotifications = { ...prevSettings.eventNotifications };
        if (newSettings.eventNotifications) {
          for (const key in mergedEventNotifications) {
            if (newSettings.eventNotifications[key]) {
              mergedEventNotifications[key] = {
                ...mergedEventNotifications[key],
                ...newSettings.eventNotifications[key],
                channels: newSettings.eventNotifications[key].channels || [],
                recipients: newSettings.eventNotifications[key].recipients || [],
              };
            }
          }
        }

        const mergedSettings = {
          ...prevSettings,
          ...newSettings,
          channels: {
            ...prevSettings.channels,
            ...(newSettings.channels || {}),
          },
          emailSettings: {
            ...prevSettings.emailSettings,
            ...(newSettings.emailSettings || {}),
          },
          smsSettings: {
            ...prevSettings.smsSettings,
            ...(newSettings.smsSettings || {}),
          },
          shiftSettings: {
            ...prevSettings.shiftSettings,
            ...(newSettings.shiftSettings || {}),
          },
          eventNotifications: mergedEventNotifications,
        };

        // Debug: Log merged email settings
        console.log('🔍 FRONTEND MERGED EMAIL SETTINGS:', mergedSettings.emailSettings);

        return mergedSettings;
      });
    } catch (err) {
      console.error('🔍 FRONTEND ERROR fetching notification settings:', err);
      error('Failed to fetch notification settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for recipient selection
  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users', { params: { limit: 100 } });
      setUsers(response.data.users || []);
    } catch (err) {
      error('Failed to fetch users: ' + (err.response?.data?.message || err.message));
    }
  };

  // Save notification settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      console.log('🔍 FRONTEND - Saving notification settings:', JSON.stringify(settings, null, 2));
      console.log('🔍 FRONTEND - Shift settings enabled:', settings.shiftSettings?.enabled);
      console.log('🔍 FRONTEND - Shift times:', settings.shiftSettings?.shiftTimes);
      await axios.put('/api/settings/notifications', settings);
      success('Notification settings saved successfully');
    } catch (err) {
      console.error('🔍 FRONTEND - Save error:', err);
      error('Failed to save notification settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Test email configuration
  const testEmailConfig = async () => {
    try {
      await axios.post('/api/settings/notifications/test-email', settings.emailSettings);
      success('Test email sent successfully. Please check your inbox.');
    } catch (err) {
      error('Failed to send test email: ' + (err.response?.data?.message || err.message));
    }
  };

  // Test SMS configuration
  const testSmsConfig = async () => {
    try {
      await axios.post('/api/settings/notifications/test-sms', settings.smsSettings);
      success('Test SMS sent successfully. Please check your phone.');
    } catch (err) {
      error('Failed to send test SMS: ' + (err.response?.data?.message || err.message));
    }
  };

  // Test shift report function
  const testShiftReport = async () => {
    try {
      // Get the most recent completed shift for testing
      const shiftsResponse = await axios.get('/api/shifts?limit=5&sort_by=start_time&sort_order=desc');
      let shiftId = null;
      
      if (shiftsResponse.data.success && shiftsResponse.data.data.length > 0) {
        // Find the first completed shift
        const completedShift = shiftsResponse.data.data.find(shift => shift.status === 'completed');
        if (completedShift) {
          shiftId = completedShift.id || completedShift._id;
        } else {
          // If no completed shifts, try to use the most recent one (regardless of status)
          shiftId = shiftsResponse.data.data[0].id || shiftsResponse.data.data[0]._id;
        }
      } else {
        error('No shifts found to generate a report. Please ensure there are shifts in the system.');
        return;
      }

      // Send test shift report
      const response = await axios.post(`/api/shifts/${shiftId}/report`, {
        format: 'all'
      });

      if (response.data.success) {
        success(`Test shift report sent successfully! Report generated for shift ID: ${shiftId} and sent to ${response.data.data.recipients.length} recipients.`);
      } else {
        error('Failed to send test shift report: ' + response.data.message);
      }
    } catch (err) {
      console.error('Test shift report error:', err);
      error('Failed to send test shift report: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle form changes
  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    const keys = name.split('.');
    
    setSettings(prev => {
      const newSettings = { ...prev };
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = type === 'checkbox' ? checked : value;
      return newSettings;
    });
  };

  // Handle channel changes for event notifications
  const handleChannelChange = (eventType, channel, enabled) => {
    setSettings(prev => ({
      ...prev,
      eventNotifications: {
        ...prev.eventNotifications,
        [eventType]: {
          ...prev.eventNotifications[eventType],
          channels: enabled 
            ? [...prev.eventNotifications[eventType].channels, channel]
            : prev.eventNotifications[eventType].channels.filter(c => c !== channel)
        }
      }
    }));
  };

  // Handle recipient changes
  const handleRecipientChange = (eventType, recipients) => {
    setSettings(prev => ({
      ...prev,
      eventNotifications: {
        ...prev.eventNotifications,
        [eventType]: {
          ...prev.eventNotifications[eventType],
          recipients
        }
      }
    }));
  };

  useEffect(() => {
    console.log('🔍 FRONTEND NotificationSettings component mounted, calling fetchSettings...');
    fetchSettings();
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Notification Settings
      </Typography>

      <StyledPaper>
        {/* General Settings */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">General Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enabled}
                      onChange={handleChange}
                      name="enabled"
                      color="primary"
                    />
                  }
                  label="Enable Notifications"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Notification Channels
                </Typography>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.channels.inApp}
                        onChange={handleChange}
                        name="channels.inApp"
                        disabled={!settings.enabled}
                      />
                    }
                    label="In-App Notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.channels.email}
                        onChange={handleChange}
                        name="channels.email"
                        disabled={!settings.enabled}
                      />
                    }
                    label="Email Notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.channels.sms}
                        onChange={handleChange}
                        name="channels.sms"
                        disabled={!settings.enabled}
                      />
                    }
                    label="SMS Notifications"
                  />
                </FormGroup>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Email Configuration */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <EmailIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Email Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Server"
                  value={settings.emailSettings.smtpServer}
                  onChange={handleChange}
                  name="emailSettings.smtpServer"
                  disabled={!settings.channels.email}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Port"
                  type="number"
                  value={settings.emailSettings.port}
                  onChange={handleChange}
                  name="emailSettings.port"
                  disabled={!settings.channels.email}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={settings.emailSettings.username}
                  onChange={handleChange}
                  name="emailSettings.username"
                  disabled={!settings.channels.email}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={settings.emailSettings.password}
                  onChange={handleChange}
                  name="emailSettings.password"
                  disabled={!settings.channels.email}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="From Email"
                  value={settings.emailSettings.fromEmail}
                  onChange={handleChange}
                  name="emailSettings.fromEmail"
                  disabled={!settings.channels.email}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailSettings.useTLS}
                      onChange={handleChange}
                      name="emailSettings.useTLS"
                      disabled={!settings.channels.email}
                    />
                  }
                  label="Use TLS"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={testEmailConfig}
                  disabled={!settings.channels.email}
                  startIcon={<EmailIcon />}
                >
                  Test Email Configuration
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Shift Report Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <ScheduleIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Shift Report Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.shiftSettings.enabled}
                      onChange={handleChange}
                      name="shiftSettings.enabled"
                      color="primary"
                    />
                  }
                  label="Enable Automatic Shift Reports"
                />
                <FormHelperText>
                  When enabled, PDF reports will be automatically sent to selected users at the end of each shift
                </FormHelperText>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Shift Start Times
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Define when shifts start. Reports will be sent when each shift ends.
                </Typography>
                
                {settings.shiftSettings.shiftTimes.map((time, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TextField
                      label={`Shift ${index + 1} Start Time`}
                      value={time}
                      onChange={(e) => handleShiftTimeChange(index, e.target.value)}
                      placeholder="18:30"
                      helperText="Format: HH:MM (24-hour)"
                      disabled={!settings.shiftSettings.enabled}
                      sx={{ mr: 2, minWidth: 200 }}
                      inputProps={{
                        pattern: "[0-9]{2}:[0-9]{2}",
                        maxLength: 5
                      }}
                    />
                    {settings.shiftSettings.shiftTimes.length > 1 && (
                      <IconButton 
                        onClick={() => removeShiftTime(index)}
                        disabled={!settings.shiftSettings.enabled}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                ))}
                
                <Button
                  startIcon={<AddIcon />}
                  onClick={addShiftTime}
                  disabled={!settings.shiftSettings.enabled}
                  variant="outlined"
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Add Shift Time
                </Button>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!settings.shiftSettings.enabled}>
                  <InputLabel>Report Format</InputLabel>
                  <Select
                    value={settings.shiftSettings.emailFormat}
                    onChange={handleChange}
                    name="shiftSettings.emailFormat"
                    label="Report Format"
                  >
                    <MenuItem value="pdf">PDF Attachment</MenuItem>
                    <MenuItem value="html">HTML Email</MenuItem>
                  </Select>
                  <FormHelperText>
                    PDF format is recommended for archival purposes
                  </FormHelperText>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.shiftSettings.autoSend}
                      onChange={handleChange}
                      name="shiftSettings.autoSend"
                      color="primary"
                      disabled={!settings.shiftSettings.enabled}
                    />
                  }
                  label="Auto-send at shift end"
                />
                <FormHelperText>
                  Automatically send reports when shifts end based on the configured times
                </FormHelperText>
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>How it works:</strong>
                    <br />• Reports are automatically generated and sent when each shift ends
                    <br />• Users can configure which shifts they want to receive in User Management
                    <br />• Reports include shift metrics, asset performance, and event logs
                    <br />• PDF reports are attached to emails for easy archival
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={testShiftReport}
                    disabled={!settings.shiftSettings.enabled}
                    startIcon={<ScheduleIcon />}
                  >
                    Test Shift Report
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* SMS Configuration */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SmsIcon sx={{ mr: 1 }} />
            <Typography variant="h6">SMS Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!settings.channels.sms}>
                  <InputLabel>SMS Provider</InputLabel>
                  <Select
                    value={settings.smsSettings.provider}
                    onChange={handleChange}
                    name="smsSettings.provider"
                    label="SMS Provider"
                  >
                    {smsProviders.map((provider) => (
                      <MenuItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Account SID"
                  value={settings.smsSettings.accountSid}
                  onChange={handleChange}
                  name="smsSettings.accountSid"
                  disabled={!settings.channels.sms}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Auth Token"
                  type="password"
                  value={settings.smsSettings.authToken}
                  onChange={handleChange}
                  name="smsSettings.authToken"
                  disabled={!settings.channels.sms}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="From Number"
                  value={settings.smsSettings.fromNumber}
                  onChange={handleChange}
                  name="smsSettings.fromNumber"
                  disabled={!settings.channels.sms}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={testSmsConfig}
                  disabled={!settings.channels.sms}
                  startIcon={<SmsIcon />}
                >
                  Test SMS Configuration
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Event Notifications */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <WarningIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Event Notifications</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {Object.entries(settings.eventNotifications).map(([eventType, config]) => (
                <Grid item xs={12} key={eventType}>
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {eventType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.enabled}
                          onChange={handleChange}
                          name={`eventNotifications.${eventType}.enabled`}
                        />
                      }
                      label="Enabled"
                    />
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>Channels:</Typography>
                      <FormGroup row>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.channels.includes('inApp')}
                              onChange={(e) => handleChannelChange(eventType, 'inApp', e.target.checked)}
                              disabled={!config.enabled}
                            />
                          }
                          label="In-App"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.channels.includes('email')}
                              onChange={(e) => handleChannelChange(eventType, 'email', e.target.checked)}
                              disabled={!config.enabled || !settings.channels.email}
                            />
                          }
                          label="Email"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.channels.includes('sms')}
                              onChange={(e) => handleChannelChange(eventType, 'sms', e.target.checked)}
                              disabled={!config.enabled || !settings.channels.sms}
                            />
                          }
                          label="SMS"
                        />
                      </FormGroup>
                    </Box>

                    {eventType === 'assetStopped' && (
                      <TextField
                        label="Minimum Duration (minutes)"
                        type="number"
                        value={config.minDuration}
                        onChange={handleChange}
                        name={`eventNotifications.${eventType}.minDuration`}
                        disabled={!config.enabled}
                        sx={{ mt: 2, width: 200 }}
                      />
                    )}

                    <Box sx={{ mt: 2 }}>
                      <FormControl fullWidth disabled={!config.enabled}>
                        <InputLabel>Recipients</InputLabel>
                        <Select
                          multiple
                          value={config.recipients}
                          onChange={(e) => handleRecipientChange(eventType, e.target.value)}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => {
                                const user = users.find(u => u.id === value);
                                return (
                                  <Chip key={value} label={user ? user.name : value} size="small" />
                                );
                              })}
                            </Box>
                          )}
                        >
                          {users.map((user) => (
                            <MenuItem key={user.id} value={user.id}>
                              {user.name} ({user.role})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </StyledPaper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={saveSettings}
          disabled={saving}
          size="large"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default NotificationSettings;