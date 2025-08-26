import React, { useState, useEffect, useContext } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RouterIcon from '@mui/icons-material/Router';
import SignalWifiStatusbar4BarIcon from '@mui/icons-material/SignalWifiStatusbar4Bar';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import DevicesIcon from '@mui/icons-material/Devices';
import { format } from 'date-fns';
import api from '../../services/api';

// Context
import AlertContext from '../../context/AlertContext';
import SocketContext from '../../context/SocketContext';
import AuthContext from '../../context/AuthContext';

// Styled components
const StatusChip = styled(Chip)(({ theme, status }) => ({
  backgroundColor: status === 'online' ? theme.palette.success.main : 
                   status === 'offline' ? theme.palette.error.main : 
                   theme.palette.warning.main,
  color: theme.palette.common.white,
  fontWeight: 'bold',
}));

const LoggerCard = styled(Card)(({ theme, status }) => ({
  border: `2px solid ${status === 'online' ? theme.palette.success.main : 
                       status === 'offline' ? theme.palette.error.main : 
                       theme.palette.warning.main}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const LoggerManagement = () => {
  const { error, success } = useContext(AlertContext);
  const { socket } = useContext(SocketContext);
  const { token } = useContext(AuthContext);
  
  // State for loggers data
  const [loggers, setLoggers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State for logger dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [selectedLogger, setSelectedLogger] = useState(null);
  const [loggerForm, setLoggerForm] = useState({
    logger_id: '',
    name: '',
    description: '',
    location: '',
    wifi_ssid: '',
    wifi_password: '',
    server_url: process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5001',
    heartbeat_interval: 30
  });
  
  // State for delete confirmation dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Fetch loggers
  const fetchLoggers = async () => {
    try {
      setLoading(true);
      
      // Try authenticated endpoint first (for logged-in users)
      if (token) {
        try {
          const response = await api.get('/loggers');
          setLoggers(response.data);
          return;
        } catch (authErr) {
          console.warn('Authenticated fetch failed, trying public endpoint:', authErr.message);
        }
      }
      
      // Fallback to public endpoint for device management
      const response = await api.get('/device/list');
      setLoggers(response.data);
      
    } catch (err) {
      error('Failed to fetch loggers: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Add logger
  const addLogger = async () => {
    try {
      // Use the unauthenticated device registration endpoint
      await api.post('/device/register', {
        logger_id: loggerForm.logger_id,
        logger_name: loggerForm.name,
        description: loggerForm.description,
        location: loggerForm.location,
        wifi_ssid: loggerForm.wifi_ssid,
        wifi_password: loggerForm.wifi_password,
        server_url: loggerForm.server_url,
        heartbeat_interval: loggerForm.heartbeat_interval,
        firmware_version: '1.0.0', // Default version for manual registration
        ip_address: 'Manual Registration' // Placeholder for manual registration
      });
      success('Logger registered successfully');
      handleCloseDialog();
      fetchLoggers();
    } catch (err) {
      error('Failed to register logger: ' + (err.response?.data?.message || err.message));
    }
  };

  // Update logger
  const updateLogger = async () => {
    try {
      // Try authenticated endpoint first (for logged-in users)
      if (token) {
        try {
          await api.put(`/loggers/${selectedLogger._id}`, loggerForm);
          success('Logger updated successfully');
          handleCloseDialog();
          fetchLoggers();
          return;
        } catch (authErr) {
          console.warn('Authenticated update failed, trying public endpoint:', authErr.message);
        }
      }
      
      // Fallback to public endpoint for device management
      await api.put(`/device/update/${selectedLogger._id}`, loggerForm);
      success('Logger updated successfully');
      handleCloseDialog();
      fetchLoggers();
    } catch (err) {
      error('Failed to update logger: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete logger
  const deleteLogger = async () => {
    try {
      // Try authenticated endpoint first (for logged-in users)
      if (token) {
        try {
          await api.delete(`/loggers/${selectedLogger._id}`);
          success('Logger deleted successfully');
          setOpenDeleteDialog(false);
          fetchLoggers();
          return;
        } catch (authErr) {
          console.warn('Authenticated delete failed, trying public endpoint:', authErr.message);
        }
      }
      
      // Fallback to public endpoint for device management
      await api.delete(`/device/delete/${selectedLogger._id}`);
      success('Logger deleted successfully');
      setOpenDeleteDialog(false);
      fetchLoggers();
    } catch (err) {
      error('Failed to delete logger: ' + (err.response?.data?.message || err.message));
    }
  };

  // Open add logger dialog
  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setLoggerForm({
      logger_id: '',
      name: '',
      description: '',
      location: '',
      wifi_ssid: '',
      wifi_password: '',
      server_url: process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5001',
      heartbeat_interval: 30
    });
    setOpenDialog(true);
  };

  // Open edit logger dialog
  const handleOpenEditDialog = (logger) => {
    setDialogMode('edit');
    setSelectedLogger(logger);
    setLoggerForm({
      logger_id: logger.logger_id,
      name: logger.name,
      description: logger.description || '',
      location: logger.location || '',
      wifi_ssid: logger.wifi_ssid || '',
      wifi_password: logger.wifi_password || '',
      server_url: logger.server_url || (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5001'),
      heartbeat_interval: logger.heartbeat_interval || 30
    });
    setOpenDialog(true);
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (logger) => {
    setSelectedLogger(logger);
    setOpenDeleteDialog(true);
  };

  // Close logger dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle form input change
  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setLoggerForm(prev => ({
      ...prev,
      [name]: event.target.type === 'number' ? Number(value) : value,
    }));
  };

  // Handle form submission
  const handleSubmitForm = () => {
    if (dialogMode === 'add') {
      addLogger();
    } else {
      updateLogger();
    }
  };

  // Get status color and icon
  const getStatusInfo = (status, lastSeen) => {
    if (status === 'online') {
      return { 
        color: 'success', 
        icon: <SignalWifiStatusbar4BarIcon />,
        text: 'Online'
      };
    } else if (status === 'offline') {
      return { 
        color: 'error', 
        icon: <SignalWifiOffIcon />,
        text: 'Offline'
      };
    } else {
      return { 
        color: 'warning', 
        icon: <SignalWifiOffIcon />,
        text: 'Never Connected'
      };
    }
  };

  // Format last seen time
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    return format(new Date(lastSeen), 'MMM dd, yyyy HH:mm:ss');
  };

  // Fetch loggers when component mounts
  useEffect(() => {
    fetchLoggers();
  }, []);

  // Subscribe to logger updates via socket
  useEffect(() => {
    if (socket) {
      socket.on('logger_status_updated', () => {
        fetchLoggers();
      });
      
      return () => {
        socket.off('logger_status_updated');
      };
    }
  }, [socket]);

  // Render loading state
  if (loading && loggers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" component="div">
            Logger Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage ESP32 data loggers and their configurations
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Register Logger
        </Button>
      </Box>

      {/* Logger Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {loggers.map((logger) => {
          const statusInfo = getStatusInfo(logger.status, logger.last_seen);
          return (
            <Grid item xs={12} sm={6} md={4} key={logger._id}>
              <LoggerCard status={logger.status}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <RouterIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="div">
                      {logger.name}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <StatusChip 
                      status={logger.status}
                      icon={statusInfo.icon}
                      label={statusInfo.text}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    ID: {logger.logger_id}
                  </Typography>
                  
                  {logger.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {logger.description}
                    </Typography>
                  )}
                  
                  {logger.location && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Location: {logger.location}
                    </Typography>
                  )}
                  
                  <Typography variant="caption" color="text.secondary">
                    Last seen: {formatLastSeen(logger.last_seen)}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenEditDialog(logger)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenDeleteDialog(logger)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </LoggerCard>
            </Grid>
          );
        })}
      </Grid>

      {/* Empty state */}
      {loggers.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <DevicesIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Loggers Registered
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Register your first ESP32 logger to start collecting data
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Register Logger
          </Button>
        </Paper>
      )}

      {/* Logger Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Register New Logger' : 'Edit Logger'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Logger ID"
                name="logger_id"
                value={loggerForm.logger_id}
                onChange={handleFormChange}
                disabled={dialogMode === 'edit'}
                helperText="Unique identifier for the ESP32 device"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Logger Name"
                name="name"
                value={loggerForm.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={loggerForm.description}
                onChange={handleFormChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={loggerForm.location}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="WiFi SSID"
                name="wifi_ssid"
                value={loggerForm.wifi_ssid}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="WiFi Password"
                name="wifi_password"
                type="password"
                value={loggerForm.wifi_password}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Server URL"
                name="server_url"
                value={loggerForm.server_url}
                onChange={handleFormChange}
                helperText="URL where the logger will send data"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Heartbeat Interval (seconds)"
                name="heartbeat_interval"
                type="number"
                value={loggerForm.heartbeat_interval}
                onChange={handleFormChange}
                helperText="How often the logger sends status updates"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmitForm} variant="contained">
            {dialogMode === 'add' ? 'Register' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Logger</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete logger "{selectedLogger?.name}"? 
            This action cannot be undone and will also remove all associated assets.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={deleteLogger} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoggerManagement;