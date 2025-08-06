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
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import LinearProgress from '@mui/material/LinearProgress';

// Icons
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import SaveIcon from '@mui/icons-material/Save';

import { format } from 'date-fns';
import axios from 'axios';

// Context
import AlertContext from '../../context/AlertContext';

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const VisuallyHiddenInput = styled('input')`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`;

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const BackupRestore = () => {
  const { error, success } = useContext(AlertContext);
  
  // State for backup settings
  const [settings, setSettings] = useState({
    autoBackup: {
      enabled: true,
      frequency: 'daily', // daily, weekly, monthly
      time: '00:00',
      retentionCount: 7,
      includeAssetData: true,
      includeEventData: true,
      includeUserData: true,
      includeSettings: true,
    },
    storage: {
      local: true,
      cloud: false,
      cloudProvider: 'aws-s3',
      cloudSettings: {
        accessKey: '',
        secretKey: '',
        region: '',
        bucket: '',
        path: 'backups/',
      },
    },
  });
  
  // State for backups list
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalBackups, setTotalBackups] = useState(0);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // State for backup progress
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  
  // State for restore progress
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  
  // State for restore confirmation dialog
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  
  // State for delete confirmation dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // State for upload dialog
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  
  // Cloud storage providers
  const cloudProviders = [
    { value: 'aws-s3', label: 'Amazon S3' },
    { value: 'google-cloud', label: 'Google Cloud Storage' },
    { value: 'azure-blob', label: 'Azure Blob Storage' },
    { value: 'custom', label: 'Custom (FTP/SFTP)' },
  ];

  // Backup frequency options
  const frequencyOptions = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  // Fetch backup settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings/backup');
      const newSettings = response.data;

      setSettings(prevSettings => ({
        ...prevSettings,
        ...newSettings,
        autoBackup: {
          ...prevSettings.autoBackup,
          ...(newSettings.autoBackup || {}),
        },
        storage: {
          ...prevSettings.storage,
          ...(newSettings.storage || {}),
          cloudSettings: {
            ...prevSettings.storage.cloudSettings,
            ...(newSettings.storage?.cloudSettings || {}),
          },
        },
      }));
    } catch (err) {
      error('Failed to fetch backup settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch backups list
  const fetchBackups = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: page + 1, // API uses 1-based indexing
        limit: rowsPerPage,
      };
      
      const response = await axios.get('/api/backups', { params });
      
      setBackups(response.data.backups || []);
      setTotalBackups(response.data.total || 0);
    } catch (err) {
      error('Failed to fetch backups: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Save backup settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      await axios.put('/api/settings/backup', settings);
      success('Backup settings saved successfully');
    } catch (err) {
      error('Failed to save backup settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Create manual backup
  const createBackup = async () => {
    try {
      setBackupInProgress(true);
      setBackupProgress(0);
      
      // Set up progress tracking
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);
      
      const response = await axios.post('/api/backups', {
        manual: true,
        includeAssetData: settings.autoBackup.includeAssetData,
        includeEventData: settings.autoBackup.includeEventData,
        includeUserData: settings.autoBackup.includeUserData,
        includeSettings: settings.autoBackup.includeSettings,
      });
      
      clearInterval(progressInterval);
      setBackupProgress(100);
      
      setTimeout(() => {
        setBackupInProgress(false);
        setBackupProgress(0);
        fetchBackups();
      }, 1000);
      
      success('Backup created successfully');
    } catch (err) {
      setBackupInProgress(false);
      setBackupProgress(0);
      error('Failed to create backup: ' + (err.response?.data?.message || err.message));
    }
  };

  // Restore from backup
  const restoreBackup = async () => {
    try {
      setOpenRestoreDialog(false);
      setRestoreInProgress(true);
      setRestoreProgress(0);
      
      // Set up progress tracking
      const progressInterval = setInterval(() => {
        setRestoreProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);
      
      await axios.post(`/api/backups/${selectedBackup._id}/restore`);
      
      clearInterval(progressInterval);
      setRestoreProgress(100);
      
      setTimeout(() => {
        setRestoreInProgress(false);
        setRestoreProgress(0);
      }, 1000);
      
      success('System restored successfully. You may need to refresh the page to see the changes.');
    } catch (err) {
      setRestoreInProgress(false);
      setRestoreProgress(0);
      error('Failed to restore from backup: ' + (err.response?.data?.message || err.message));
    }
  };

  // Download backup
  const downloadBackup = async (backup) => {
    try {
      const response = await axios.get(`/api/backups/${backup._id}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${format(new Date(backup.createdAt), 'yyyy-MM-dd_HH-mm')}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      error('Failed to download backup: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete backup
  const deleteBackup = async () => {
    try {
      await axios.delete(`/api/backups/${selectedBackup._id}`);
      
      success('Backup deleted successfully');
      setOpenDeleteDialog(false);
      fetchBackups();
    } catch (err) {
      error('Failed to delete backup: ' + (err.response?.data?.message || err.message));
    }
  };

  // Upload backup
  const uploadBackup = async () => {
    if (!uploadFile) {
      error('Please select a backup file to upload');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('backup', uploadFile);
      
      await axios.post('/api/backups/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      success('Backup uploaded successfully');
      setOpenUploadDialog(false);
      setUploadFile(null);
      fetchBackups();
    } catch (err) {
      error('Failed to upload backup: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle file selection for upload
  const handleFileChange = (event) => {
    setUploadFile(event.target.files[0]);
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle form input change
  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const parts = name.split('.');
      
      if (parts.length === 2) {
        // Handle two-level nesting (e.g., autoBackup.enabled)
        setSettings(prev => ({
          ...prev,
          [parts[0]]: {
            ...prev[parts[0]],
            [parts[1]]: event.target.type === 'checkbox' ? checked : 
                      event.target.type === 'number' ? Number(value) : value,
          }
        }));
      } else if (parts.length === 3) {
        // Handle three-level nesting (e.g., storage.cloudSettings.accessKey)
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

  // Open restore confirmation dialog
  const handleOpenRestoreDialog = (backup) => {
    setSelectedBackup(backup);
    setOpenRestoreDialog(true);
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (backup) => {
    setSelectedBackup(backup);
    setOpenDeleteDialog(true);
  };

  // Fetch settings and backups when component mounts
  useEffect(() => {
    fetchSettings();
    fetchBackups();
  }, []);

  // Fetch backups when page or rowsPerPage changes
  useEffect(() => {
    fetchBackups();
  }, [page, rowsPerPage]);

  // Render loading state
  if (loading && backups.length === 0) {
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
          Backup & Restore
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
      
      {/* Manual Backup & Restore Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BackupIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6">Manual Backup</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create a manual backup of your system data. This will include all selected data types and store the backup according to your storage settings.
              </Typography>
              
              {backupInProgress && (
                <Box sx={{ width: '100%', mt: 2, mb: 1 }}>
                  <LinearProgress variant="determinate" value={backupProgress} />
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    {backupProgress < 100 ? 'Creating backup...' : 'Backup complete!'}
                  </Typography>
                </Box>
              )}
            </CardContent>
            <CardActions>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<BackupIcon />}
                onClick={createBackup}
                disabled={backupInProgress}
                fullWidth
              >
                Create Backup Now
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudUploadIcon color="secondary" sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h6">Upload Backup</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload a previously downloaded backup file to restore your system or transfer data between environments.
              </Typography>
              
              {restoreInProgress && (
                <Box sx={{ width: '100%', mt: 2, mb: 1 }}>
                  <LinearProgress variant="determinate" value={restoreProgress} />
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    {restoreProgress < 100 ? 'Restoring system...' : 'Restore complete!'}
                  </Typography>
                </Box>
              )}
            </CardContent>
            <CardActions>
              <Button 
                variant="outlined" 
                color="secondary" 
                startIcon={<CloudUploadIcon />}
                onClick={() => setOpenUploadDialog(true)}
                disabled={restoreInProgress}
                fullWidth
              >
                Upload Backup File
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
      
      {/* Backup Settings */}
      <StyledPaper>
        <Typography variant="subtitle1" gutterBottom>
          Automatic Backup Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoBackup.enabled}
                  onChange={handleChange}
                  name="autoBackup.enabled"
                  color="primary"
                />
              }
              label="Enable Automatic Backups"
            />
            <FormHelperText>Schedule regular backups of your system data</FormHelperText>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" disabled={!settings.autoBackup.enabled}>
              <InputLabel id="backup-frequency-label">Backup Frequency</InputLabel>
              <Select
                labelId="backup-frequency-label"
                name="autoBackup.frequency"
                value={settings.autoBackup.frequency}
                onChange={handleChange}
                label="Backup Frequency"
              >
                {frequencyOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>How often backups should be created</FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Backup Time"
              name="autoBackup.time"
              type="time"
              value={settings.autoBackup.time}
              onChange={handleChange}
              disabled={!settings.autoBackup.enabled}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              helperText="Time of day to run the backup (24-hour format)"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Retention Count"
              name="autoBackup.retentionCount"
              type="number"
              value={settings.autoBackup.retentionCount}
              onChange={handleChange}
              disabled={!settings.autoBackup.enabled}
              margin="normal"
              InputProps={{ inputProps: { min: 1 } }}
              helperText="Number of backups to keep before deleting old ones"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Data to Include in Backups
            </Typography>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoBackup.includeAssetData}
                    onChange={handleChange}
                    name="autoBackup.includeAssetData"
                    color="primary"
                    disabled={!settings.autoBackup.enabled}
                  />
                }
                label="Asset Data"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoBackup.includeEventData}
                    onChange={handleChange}
                    name="autoBackup.includeEventData"
                    color="primary"
                    disabled={!settings.autoBackup.enabled}
                  />
                }
                label="Event Data"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoBackup.includeUserData}
                    onChange={handleChange}
                    name="autoBackup.includeUserData"
                    color="primary"
                    disabled={!settings.autoBackup.enabled}
                  />
                }
                label="User Data"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoBackup.includeSettings}
                    onChange={handleChange}
                    name="autoBackup.includeSettings"
                    color="primary"
                    disabled={!settings.autoBackup.enabled}
                  />
                }
                label="System Settings"
              />
            </FormGroup>
          </Grid>
        </Grid>
      </StyledPaper>
      
      {/* Storage Settings */}
      <StyledPaper>
        <Typography variant="subtitle1" gutterBottom>
          Storage Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.storage.local}
                    onChange={handleChange}
                    name="storage.local"
                    color="primary"
                  />
                }
                label="Store Backups Locally"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.storage.cloud}
                    onChange={handleChange}
                    name="storage.cloud"
                    color="primary"
                  />
                }
                label="Store Backups in Cloud"
              />
            </FormGroup>
          </Grid>
          
          {settings.storage.cloud && (
            <>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="cloud-provider-label">Cloud Storage Provider</InputLabel>
                  <Select
                    labelId="cloud-provider-label"
                    name="storage.cloudProvider"
                    value={settings.storage.cloudProvider}
                    onChange={handleChange}
                    label="Cloud Storage Provider"
                  >
                    {cloudProviders.map((provider) => (
                      <MenuItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {settings.storage.cloudProvider === 'aws-s3' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Access Key"
                      name="storage.cloudSettings.accessKey"
                      value={settings.storage.cloudSettings.accessKey}
                      onChange={handleChange}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Secret Key"
                      name="storage.cloudSettings.secretKey"
                      type="password"
                      value={settings.storage.cloudSettings.secretKey}
                      onChange={handleChange}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Region"
                      name="storage.cloudSettings.region"
                      value={settings.storage.cloudSettings.region}
                      onChange={handleChange}
                      margin="normal"
                      placeholder="e.g., us-east-1"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Bucket Name"
                      name="storage.cloudSettings.bucket"
                      value={settings.storage.cloudSettings.bucket}
                      onChange={handleChange}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Path Prefix"
                      name="storage.cloudSettings.path"
                      value={settings.storage.cloudSettings.path}
                      onChange={handleChange}
                      margin="normal"
                      placeholder="e.g., backups/"
                      helperText="Optional: Path prefix within the bucket"
                    />
                  </Grid>
                </>
              )}
              
              {/* Add similar blocks for other cloud providers */}
            </>
          )}
        </Grid>
      </StyledPaper>
      
      {/* Backups List */}
      <StyledPaper>
        <Typography variant="subtitle1" gutterBottom>
          Available Backups
        </Typography>
        
        {backups.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            <AlertTitle>No Backups Available</AlertTitle>
            No backups have been created yet. Use the "Create Backup Now" button to create your first backup.
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table aria-label="backups table">
                <TableHead>
                  <TableRow>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Storage</TableCell>
                    <TableCell>Contents</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backups.map((backup) => (
                    <StyledTableRow key={backup._id}>
                      <TableCell>
                        {format(new Date(backup.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={backup.type === 'manual' ? 'Manual' : 'Automatic'} 
                          color={backup.type === 'manual' ? 'primary' : 'default'}
                          size="small"
                          icon={backup.type === 'manual' ? <BackupIcon /> : <ScheduleIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        {(backup.size / (1024 * 1024)).toFixed(2)} MB
                      </TableCell>
                      <TableCell>
                        {backup.storage.includes('local') && (
                          <Chip label="Local" size="small" sx={{ mr: 0.5 }} />
                        )}
                        {backup.storage.includes('cloud') && (
                          <Chip label="Cloud" size="small" color="info" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title={`Includes: ${backup.contents.join(', ')}`}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {backup.contents.includes('assets') && (
                              <Chip label="Assets" size="small" variant="outlined" />
                            )}
                            {backup.contents.includes('events') && (
                              <Chip label="Events" size="small" variant="outlined" />
                            )}
                            {backup.contents.includes('users') && (
                              <Chip label="Users" size="small" variant="outlined" />
                            )}
                            {backup.contents.includes('settings') && (
                              <Chip label="Settings" size="small" variant="outlined" />
                            )}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Download Backup">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => downloadBackup(backup)}
                            sx={{ mr: 1 }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Restore from Backup">
                          <IconButton 
                            size="small" 
                            color="secondary" 
                            onClick={() => handleOpenRestoreDialog(backup)}
                            sx={{ mr: 1 }}
                          >
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Backup">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleOpenDeleteDialog(backup)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalBackups}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </StyledPaper>
      
      {/* Restore Confirmation Dialog */}
      <Dialog open={openRestoreDialog} onClose={() => setOpenRestoreDialog(false)}>
        <DialogTitle>Confirm Restore</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <WarningIcon color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
            Are you sure you want to restore the system from this backup? This will replace your current data with the data from the backup created on {selectedBackup && format(new Date(selectedBackup.createdAt), 'yyyy-MM-dd HH:mm:ss')}.
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle>Warning</AlertTitle>
            This action cannot be undone. All current data will be replaced with the data from the selected backup.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRestoreDialog(false)}>Cancel</Button>
          <Button onClick={restoreBackup} variant="contained" color="warning" startIcon={<RestoreIcon />}>
            Restore System
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this backup? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={deleteBackup} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Upload Dialog */}
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)}>
        <DialogTitle>Upload Backup</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Select a backup file to upload. The file should be a ZIP archive created by this system.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              sx={{ mt: 1 }}
            >
              Select Backup File
              <VisuallyHiddenInput type="file" onChange={handleFileChange} accept=".zip" />
            </Button>
            {uploadFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadDialog(false)}>Cancel</Button>
          <Button 
            onClick={uploadBackup} 
            variant="contained" 
            color="primary"
            disabled={!uploadFile}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
      
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

export default BackupRestore;