import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Notifications as NotificationsIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as TestIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/api';
import AlertContext from '../../context/AlertContext';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`alert-tabpanel-${index}`}
      aria-labelledby={`alert-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AlertManagementPage = () => {
  const { success, error } = useContext(AlertContext);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [alertStatistics, setAlertStatistics] = useState(null);
  const [thresholds, setThresholds] = useState({});
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [acknowledgeDialogOpen, setAcknowledgeDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('');
  const [testAlert, setTestAlert] = useState({ type: 'test', severity: 'warning', assetId: '' });

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadActiveAlerts(),
        loadAlertHistory(),
        loadAlertStatistics(),
        loadThresholds()
      ]);
    } catch (err) {
      error('Failed to load alert data');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveAlerts = async () => {
    try {
      const response = await api.get('/alerts/active');
      setActiveAlerts(response.data.data || []);
    } catch (err) {
      console.error('Failed to load active alerts:', err);
    }
  };

  const loadAlertHistory = async () => {
    try {
      const response = await api.get('/alerts/history?limit=50');
      setAlertHistory(response.data.data || []);
    } catch (err) {
      console.error('Failed to load alert history:', err);
    }
  };

  const loadAlertStatistics = async () => {
    try {
      const response = await api.get('/alerts/statistics?timeframe=7');
      setAlertStatistics(response.data.data);
    } catch (err) {
      console.error('Failed to load alert statistics:', err);
    }
  };

  const loadThresholds = async () => {
    try {
      const response = await api.get('/alerts/thresholds');
      setThresholds(response.data.data || {});
    } catch (err) {
      console.error('Failed to load thresholds:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAcknowledgeAlert = async () => {
    if (!selectedAlert) return;
    
    try {
      await api.post(`/alerts/${selectedAlert.id}/acknowledge`, {
        notes: acknowledgeNotes
      });
      success('Alert acknowledged successfully');
      setAcknowledgeDialogOpen(false);
      setSelectedAlert(null);
      setAcknowledgeNotes('');
      loadActiveAlerts();
    } catch (err) {
      error('Failed to acknowledge alert');
    }
  };

  const handleClearAlert = async (alertKey) => {
    try {
      await api.delete(`/alerts/${alertKey}`);
      success('Alert cleared successfully');
      loadActiveAlerts();
    } catch (err) {
      error('Failed to clear alert');
    }
  };

  const handleUpdateThresholds = async () => {
    try {
      await api.put('/alerts/thresholds', { thresholds });
      success('Alert thresholds updated successfully');
      setThresholdDialogOpen(false);
    } catch (err) {
      error('Failed to update thresholds');
    }
  };

  const handleTestAlert = async () => {
    try {
      await api.post('/alerts/test', testAlert);
      success('Test alert triggered successfully');
      setTestDialogOpen(false);
      setTimeout(loadActiveAlerts, 1000); // Refresh after a second
    } catch (err) {
      error('Failed to trigger test alert');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'warning': return <WarningIcon />;
      default: return <CheckCircleIcon />;
    }
  };

  const renderActiveAlerts = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Active Alerts
          <Badge badgeContent={activeAlerts.length} color="error" sx={{ ml: 2 }} />
        </Typography>
        <Box>
          <Button
            startIcon={<TestIcon />}
            onClick={() => setTestDialogOpen(true)}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Test Alert
          </Button>
          <IconButton onClick={loadActiveAlerts} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {activeAlerts.length === 0 ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          No active alerts. All systems are operating normally.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Severity</TableCell>
                <TableCell>Asset</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Chip
                      icon={getSeverityIcon(alert.severity)}
                      label={alert.severity.toUpperCase()}
                      color={getSeverityColor(alert.severity)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{alert.assetName}</TableCell>
                  <TableCell>{alert.type}</TableCell>
                  <TableCell>{alert.message}</TableCell>
                  <TableCell>
                    {format(new Date(alert.timestamp), 'MMM dd, HH:mm')}
                  </TableCell>
                  <TableCell>
                    {alert.acknowledged ? (
                      <Chip label="Acknowledged" color="success" size="small" />
                    ) : (
                      <Chip label="Active" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {!alert.acknowledged && (
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedAlert(alert);
                          setAcknowledgeDialogOpen(true);
                        }}
                      >
                        Acknowledge
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleClearAlert(alert.key)}
                      color="error"
                    >
                      <ClearIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderAlertHistory = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Alert History (Last 50)</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Severity</TableCell>
              <TableCell>Asset</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alertHistory.map((alert, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Chip
                    icon={getSeverityIcon(alert.severity)}
                    label={alert.severity.toUpperCase()}
                    color={getSeverityColor(alert.severity)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{alert.assetName}</TableCell>
                <TableCell>{alert.type}</TableCell>
                <TableCell>{alert.message}</TableCell>
                <TableCell>
                  {format(new Date(alert.timestamp), 'MMM dd, HH:mm')}
                </TableCell>
                <TableCell>
                  {alert.acknowledged ? (
                    <Chip label="Acknowledged" color="success" size="small" />
                  ) : (
                    <Chip label="Unacknowledged" color="warning" size="small" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderStatistics = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Alert Statistics (Last 7 Days)</Typography>
      {alertStatistics && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Overview</Typography>
                <Typography>Total Alerts: {alertStatistics.total}</Typography>
                <Typography>Acknowledged: {alertStatistics.acknowledged}</Typography>
                <Typography>Unacknowledged: {alertStatistics.unacknowledged}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>By Severity</Typography>
                <Typography>Critical: {alertStatistics.bySeverity.critical}</Typography>
                <Typography>Warning: {alertStatistics.bySeverity.warning}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>By Type</Typography>
                {Object.entries(alertStatistics.byType).map(([type, count]) => (
                  <Typography key={type}>{type}: {count}</Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>By Asset</Typography>
                {Object.entries(alertStatistics.byAsset).map(([asset, count]) => (
                  <Typography key={asset}>{asset}: {count}</Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  const renderThresholds = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Alert Thresholds</Typography>
        <Button
          startIcon={<SettingsIcon />}
          onClick={() => setThresholdDialogOpen(true)}
          variant="contained"
        >
          Configure Thresholds
        </Button>
      </Box>

      {Object.entries(thresholds).map(([metric, levels]) => (
        <Accordion key={metric}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
              {metric} Thresholds
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="error">
                  Critical: {levels.critical}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="warning.main">
                  Warning: {levels.warning}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="success.main">
                  Good: {levels.good}
                </Typography>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Alert Management
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            label={`Active Alerts (${activeAlerts.length})`} 
            icon={<NotificationsIcon />}
          />
          <Tab 
            label="History" 
            icon={<HistoryIcon />}
          />
          <Tab 
            label="Statistics" 
            icon={<WarningIcon />}
          />
          <Tab 
            label="Thresholds" 
            icon={<SettingsIcon />}
          />
        </Tabs>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <TabPanel value={tabValue} index={0}>
        {renderActiveAlerts()}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {renderAlertHistory()}
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        {renderStatistics()}
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        {renderThresholds()}
      </TabPanel>

      {/* Acknowledge Alert Dialog */}
      <Dialog open={acknowledgeDialogOpen} onClose={() => setAcknowledgeDialogOpen(false)}>
        <DialogTitle>Acknowledge Alert</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            value={acknowledgeNotes}
            onChange={(e) => setAcknowledgeNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcknowledgeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAcknowledgeAlert} variant="contained">
            Acknowledge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Alert Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Test Alert System</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={testAlert.severity}
              onChange={(e) => setTestAlert({ ...testAlert, severity: e.target.value })}
            >
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Alert Type"
            value={testAlert.type}
            onChange={(e) => setTestAlert({ ...testAlert, type: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTestAlert} variant="contained">
            Trigger Test Alert
          </Button>
        </DialogActions>
      </Dialog>

      {/* Threshold Configuration Dialog */}
      <Dialog 
        open={thresholdDialogOpen} 
        onClose={() => setThresholdDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Configure Alert Thresholds</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {Object.entries(thresholds).map(([metric, levels]) => (
              <Grid item xs={12} key={metric}>
                <Typography variant="h6" sx={{ mb: 2, textTransform: 'capitalize' }}>
                  {metric} Thresholds
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Critical"
                      type="number"
                      value={levels.critical}
                      onChange={(e) => setThresholds({
                        ...thresholds,
                        [metric]: {
                          ...levels,
                          critical: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Warning"
                      type="number"
                      value={levels.warning}
                      onChange={(e) => setThresholds({
                        ...thresholds,
                        [metric]: {
                          ...levels,
                          warning: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Good"
                      type="number"
                      value={levels.good}
                      onChange={(e) => setThresholds({
                        ...thresholds,
                        [metric]: {
                          ...levels,
                          good: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </Grid>
                </Grid>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThresholdDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateThresholds} variant="contained">
            Save Thresholds
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertManagementPage;