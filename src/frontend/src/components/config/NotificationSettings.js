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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
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
    eventNotifications: {
      assetStopped: {
        enabled: true,
        channels: ['inApp', 'email'],
        minDuration: 5, // minutes
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

  // Fetch notification settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings/notifications');
      const newSettings = response.data;

      setSettings(prevSettings => {
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

        return {
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
          eventNotifications: mergedEventNotifications,
        };
      });
    } catch (err) {
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
      await axios.put('/api/settings/notifications', settings);
      success('Notification settings saved successfully');
    } catch (err) {
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

  // Handle form input change
  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const parts = name.split('.');
      
      if (parts.length === 2) {
        // Handle two-level nesting (e.g., channels.inApp)
        setSettings(prev => ({
          ...prev,
          [parts[0]]: {
            ...prev[parts[0]],
            [parts[1]]: event.target.type === 'checkbox' ? checked : 
                      event.target.type === 'number' ? Number(value) : value,
          }
        }));
      } else if (parts.length === 3) {
        // Handle three-level nesting (e.g., eventNotifications.assetStopped.enabled)
        setSettings(prev => ({
          ...prev,
          [parts[0]]: {
            ...prev[parts[0]],
            [parts[1]]: {
              ...prev[parts[0]][parts[1]],
              [parts[2]]: event.target.type === 'checkbox' ? checked : 
                        event.target.type === 'number' ? Number(value) : value,
            }
          }
        }));
      }
    } else {
      // Handle top-level properties
      setSettings(prev => ({
        ...prev,
        [name]: event.target.type === 'checkbox' ? checked : value,
      }));
    }
  };

  // Handle channel selection for event notifications
  const handleChannelChange = (event, eventType) => {
    const { value } = event.target;
    setSettings(prev => ({
      ...prev,
      eventNotifications: {
        ...prev.eventNotifications,
        [eventType]: {
          ...prev.eventNotifications[eventType],
          channels: value
        }
      }
    }));
  };

  // Handle recipient selection for event notifications
  const handleRecipientChange = (event, eventType) => {
    const { value } = event.target;
    setSettings(prev => ({
      ...prev,
      eventNotifications: {
        ...prev.eventNotifications,
        [eventType]: {
          ...prev.eventNotifications[eventType],
          recipients: value
        }
      }
    }));
  };

  // Fetch settings and users when component mounts
  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  // Subscribe to settings updates via socket
  useEffect(() => {
    if (socket) {
      socket.on('settings_updated', () => {
        fetchSettings();
      });
      
      return () => {
        socket.off('settings_updated');
      };
    }
  }, [socket]);

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="div">
          Notification Settings
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
      
      {/* General Notification Settings */}
      <StyledPaper>
        <Typography variant="subtitle1" gutterBottom>
          General Settings
        </Typography>
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
            <FormHelperText>Master switch for all notifications</FormHelperText>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Notification Channels
            </Typography>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.channels.inApp}
                    onChange={handleChange}
                    name="channels.inApp"
                    color="primary"
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
                    color="primary"
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
                    color="primary"
                  />
                }
                label="SMS Notifications"
              />
            </FormGroup>
          </Grid>
        </Grid>
      </StyledPaper>
      
      {/* Email Configuration */}
      <Accordion defaultExpanded={settings.channels.email}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="email-config-content"
          id="email-config-header"
        >
          <EmailIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">Email Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SMTP Server"
                name="emailSettings.smtpServer"
                value={settings.emailSettings.smtpServer}
                onChange={handleChange}
                disabled={!settings.channels.email}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Port"
                name="emailSettings.port"
                type="number"
                value={settings.emailSettings.port}
                onChange={handleChange}
                disabled={!settings.channels.email}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                name="emailSettings.username"
                value={settings.emailSettings.username}
                onChange={handleChange}
                disabled={!settings.channels.email}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                name="emailSettings.password"
                type="password"
                value={settings.emailSettings.password}
                onChange={handleChange}
                disabled={!settings.channels.email}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="From Email"
                name="emailSettings.fromEmail"
                value={settings.emailSettings.fromEmail}
                onChange={handleChange}
                disabled={!settings.channels.email}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailSettings.useTLS}
                    onChange={handleChange}
                    name="emailSettings.useTLS"
                    color="primary"
                    disabled={!settings.channels.email}
                  />
                }
                label="Use TLS"
                sx={{ mt: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                color="primary"
                onClick={testEmailConfig}
                disabled={!settings.channels.email}
                sx={{ mt: 1 }}
              >
                Test Email Configuration
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      {/* SMS Configuration */}
      <Accordion defaultExpanded={settings.channels.sms}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="sms-config-content"
          id="sms-config-header"
        >
          <SmsIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">SMS Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal" disabled={!settings.channels.sms}>
                <InputLabel id="sms-provider-label">SMS Provider</InputLabel>
                <Select
                  labelId="sms-provider-label"
                  name="smsSettings.provider"
                  value={settings.smsSettings.provider}
                  onChange={handleChange}
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
            
            {settings.smsSettings.provider === 'twilio' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Account SID"
                    name="smsSettings.accountSid"
                    value={settings.smsSettings.accountSid}
                    onChange={handleChange}
                    disabled={!settings.channels.sms}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Auth Token"
                    name="smsSettings.authToken"
                    type="password"
                    value={settings.smsSettings.authToken}
                    onChange={handleChange}
                    disabled={!settings.channels.sms}
                    margin="normal"
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="From Number"
                name="smsSettings.fromNumber"
                value={settings.smsSettings.fromNumber}
                onChange={handleChange}
                disabled={!settings.channels.sms}
                margin="normal"
                helperText="Include country code (e.g., +1234567890)"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="outlined"
                color="primary"
                onClick={testSmsConfig}
                disabled={!settings.channels.sms}
                sx={{ mt: 1 }}
              >
                Test SMS Configuration
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      {/* Event Notification Settings */}
      <StyledPaper>
        <Typography variant="subtitle1" gutterBottom>
          Event Notification Settings
        </Typography>
        
        {/* Asset Stopped */}
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="asset-stopped-content"
            id="asset-stopped-header"
          >
            <ErrorIcon color="error" sx={{ mr: 1 }} />
            <Typography>Asset Stopped Notifications</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.eventNotifications.assetStopped.enabled}
                      onChange={handleChange}
                      name="eventNotifications.assetStopped.enabled"
                      color="primary"
                    />
                  }
                  label="Enable Asset Stopped Notifications"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" disabled={!settings.eventNotifications.assetStopped.enabled}>
                  <InputLabel id="asset-stopped-channels-label">Notification Channels</InputLabel>
                  <Select
                    labelId="asset-stopped-channels-label"
                    multiple
                    value={settings.eventNotifications.assetStopped.channels}
                    onChange={(e) => handleChannelChange(e, 'assetStopped')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value === 'inApp' ? 'In-App' : value === 'email' ? 'Email' : 'SMS'} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="inApp" disabled={!settings.channels.inApp}>In-App</MenuItem>
                    <MenuItem value="email" disabled={!settings.channels.email}>Email</MenuItem>
                    <MenuItem value="sms" disabled={!settings.channels.sms}>SMS</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum Duration (minutes)"
                  name="eventNotifications.assetStopped.minDuration"
                  type="number"
                  value={settings.eventNotifications.assetStopped.minDuration}
                  onChange={handleChange}
                  disabled={!settings.eventNotifications.assetStopped.enabled}
                  margin="normal"
                  helperText="Minimum stop duration before notification is sent"
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal" disabled={!settings.eventNotifications.assetStopped.enabled}>
                  <InputLabel id="asset-stopped-recipients-label">Recipients</InputLabel>
                  <Select
                    labelId="asset-stopped-recipients-label"
                    multiple
                    value={settings.eventNotifications.assetStopped.recipients}
                    onChange={(e) => handleRecipientChange(e, 'assetStopped')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const user = users.find(u => u._id === value);
                          return <Chip key={value} label={user ? user.name : value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    <Divider />
                    {users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.name} ({user.role})
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Leave empty to notify all users with appropriate roles</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
        
        {/* Asset Warning */}
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="asset-warning-content"
            id="asset-warning-header"
          >
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            <Typography>Asset Warning Notifications</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.eventNotifications.assetWarning.enabled}
                      onChange={handleChange}
                      name="eventNotifications.assetWarning.enabled"
                      color="primary"
                    />
                  }
                  label="Enable Asset Warning Notifications"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" disabled={!settings.eventNotifications.assetWarning.enabled}>
                  <InputLabel id="asset-warning-channels-label">Notification Channels</InputLabel>
                  <Select
                    labelId="asset-warning-channels-label"
                    multiple
                    value={settings.eventNotifications.assetWarning.channels}
                    onChange={(e) => handleChannelChange(e, 'assetWarning')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value === 'inApp' ? 'In-App' : value === 'email' ? 'Email' : 'SMS'} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="inApp" disabled={!settings.channels.inApp}>In-App</MenuItem>
                    <MenuItem value="email" disabled={!settings.channels.email}>Email</MenuItem>
                    <MenuItem value="sms" disabled={!settings.channels.sms}>SMS</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal" disabled={!settings.eventNotifications.assetWarning.enabled}>
                  <InputLabel id="asset-warning-recipients-label">Recipients</InputLabel>
                  <Select
                    labelId="asset-warning-recipients-label"
                    multiple
                    value={settings.eventNotifications.assetWarning.recipients}
                    onChange={(e) => handleRecipientChange(e, 'assetWarning')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const user = users.find(u => u._id === value);
                          return <Chip key={value} label={user ? user.name : value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    <Divider />
                    {users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.name} ({user.role})
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Leave empty to notify all users with appropriate roles</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
        
        {/* OEE Threshold Alert */}
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="oee-alert-content"
            id="oee-alert-header"
          >
            <InfoIcon color="info" sx={{ mr: 1 }} />
            <Typography>OEE Threshold Alert Notifications</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.eventNotifications.oeeThresholdAlert.enabled}
                      onChange={handleChange}
                      name="eventNotifications.oeeThresholdAlert.enabled"
                      color="primary"
                    />
                  }
                  label="Enable OEE Threshold Alert Notifications"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" disabled={!settings.eventNotifications.oeeThresholdAlert.enabled}>
                  <InputLabel id="oee-alert-channels-label">Notification Channels</InputLabel>
                  <Select
                    labelId="oee-alert-channels-label"
                    multiple
                    value={settings.eventNotifications.oeeThresholdAlert.channels}
                    onChange={(e) => handleChannelChange(e, 'oeeThresholdAlert')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value === 'inApp' ? 'In-App' : value === 'email' ? 'Email' : 'SMS'} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="inApp" disabled={!settings.channels.inApp}>In-App</MenuItem>
                    <MenuItem value="email" disabled={!settings.channels.email}>Email</MenuItem>
                    <MenuItem value="sms" disabled={!settings.channels.sms}>SMS</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal" disabled={!settings.eventNotifications.oeeThresholdAlert.enabled}>
                  <InputLabel id="oee-alert-recipients-label">Recipients</InputLabel>
                  <Select
                    labelId="oee-alert-recipients-label"
                    multiple
                    value={settings.eventNotifications.oeeThresholdAlert.recipients}
                    onChange={(e) => handleRecipientChange(e, 'oeeThresholdAlert')}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const user = users.find(u => u._id === value);
                          return <Chip key={value} label={user ? user.name : value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    <Divider />
                    {users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.name} ({user.role})
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Leave empty to notify all users with appropriate roles</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
        
        {/* Shift Start/End */}
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="shift-notifications-content"
            id="shift-notifications-header"
          >
            <NotificationsIcon sx={{ mr: 1 }} />
            <Typography>Shift Notifications</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Shift Start Notifications
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.eventNotifications.shiftStart.enabled}
                          onChange={handleChange}
                          name="eventNotifications.shiftStart.enabled"
                          color="primary"
                        />
                      }
                      label="Enable Shift Start Notifications"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth margin="normal" disabled={!settings.eventNotifications.shiftStart.enabled}>
                      <InputLabel id="shift-start-channels-label">Notification Channels</InputLabel>
                      <Select
                        labelId="shift-start-channels-label"
                        multiple
                        value={settings.eventNotifications.shiftStart.channels}
                        onChange={(e) => handleChannelChange(e, 'shiftStart')}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value === 'inApp' ? 'In-App' : value === 'email' ? 'Email' : 'SMS'} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        <MenuItem value="inApp" disabled={!settings.channels.inApp}>In-App</MenuItem>
                        <MenuItem value="email" disabled={!settings.channels.email}>Email</MenuItem>
                        <MenuItem value="sms" disabled={!settings.channels.sms}>SMS</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Shift End Notifications
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.eventNotifications.shiftEnd.enabled}
                          onChange={handleChange}
                          name="eventNotifications.shiftEnd.enabled"
                          color="primary"
                        />
                      }
                      label="Enable Shift End Notifications"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth margin="normal" disabled={!settings.eventNotifications.shiftEnd.enabled}>
                      <InputLabel id="shift-end-channels-label">Notification Channels</InputLabel>
                      <Select
                        labelId="shift-end-channels-label"
                        multiple
                        value={settings.eventNotifications.shiftEnd.channels}
                        onChange={(e) => handleChannelChange(e, 'shiftEnd')}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value === 'inApp' ? 'In-App' : value === 'email' ? 'Email' : 'SMS'} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        <MenuItem value="inApp" disabled={!settings.channels.inApp}>In-App</MenuItem>
                        <MenuItem value="email" disabled={!settings.channels.email}>Email</MenuItem>
                        <MenuItem value="sms" disabled={!settings.channels.sms}>SMS</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal" disabled={!settings.eventNotifications.shiftStart.enabled && !settings.eventNotifications.shiftEnd.enabled}>
                  <InputLabel id="shift-recipients-label">Shift Notification Recipients</InputLabel>
                  <Select
                    labelId="shift-recipients-label"
                    multiple
                    value={settings.eventNotifications.shiftStart.recipients}
                    onChange={(e) => {
                      handleRecipientChange(e, 'shiftStart');
                      handleRecipientChange(e, 'shiftEnd');
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const user = users.find(u => u._id === value);
                          return <Chip key={value} label={user ? user.name : value} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    <Divider />
                    {users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.name} ({user.role})
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Recipients for both shift start and end notifications</FormHelperText>
                </FormControl>
              </Grid>
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