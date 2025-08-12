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
import TablePagination from '@mui/material/TablePagination';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import InputAdornment from '@mui/material/InputAdornment';
import { format } from 'date-fns';
import axios from 'axios';

// Context
import AlertContext from '../../context/AlertContext';
import SocketContext from '../../context/SocketContext';
import AuthContext from '../../context/AuthContext';

// Styled components
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`asset-tabpanel-${index}`}
      aria-labelledby={`asset-tab-${index}`}
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

const AssetManagement = () => {
  const { error, success } = useContext(AlertContext);
  const { socket } = useContext(SocketContext);
  const { token } = useContext(AuthContext);
  
  // State for assets data
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  
  // State for loggers data
  const [loggers, setLoggers] = useState([]);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for asset dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetForm, setAssetForm] = useState({
    name: '',
    description: '',
    type: 'machine',
    pin_number: '',
    logger_id: '',
    short_stop_threshold: 5,
    long_stop_threshold: 30,
    downtime_reasons: 'Maintenance,Breakdown,Setup,Material shortage,Quality issue',
    thresholds: {
      availability: 85,
      performance: 85,
      quality: 95,
      oee: 75
    },
    settings: {
      idleTimeThreshold: 5, // minutes
      warningTimeThreshold: 10, // minutes
      collectQualityData: true,
      collectPerformanceData: true
    }
  });
  
  // State for delete confirmation dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // State for asset details tabs
  const [tabValue, setTabValue] = useState(0);
  
  // Asset type options
  const assetTypes = [
    { value: 'machine', label: 'Machine' },
    { value: 'line', label: 'Production Line' },
    { value: 'cell', label: 'Work Cell' },
    { value: 'station', label: 'Work Station' },
    { value: 'other', label: 'Other' },
  ];

  // Fetch assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: page + 1, // API uses 1-based indexing
        limit: rowsPerPage,
        ...(searchQuery && { search: searchQuery }),
      };
      
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get('/api/assets', { params, headers });
      
      setAssets(response.data.assets);
      setTotalAssets(response.data.total);
    } catch (err) {
      error('Failed to fetch assets: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch loggers
  const fetchLoggers = async () => {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await axios.get('/api/loggers', { headers });
      setLoggers(response.data);
    } catch (err) {
      error('Failed to fetch loggers: ' + (err.response?.data?.message || err.message));
    }
  };

  // Add asset
  const addAsset = async () => {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      await axios.post('/api/assets', assetForm, { headers });
      
      success('Asset added successfully');
      handleCloseDialog();
      fetchAssets();
    } catch (err) {
      error('Failed to add asset: ' + (err.response?.data?.message || err.message));
    }
  };

  // Update asset
  const updateAsset = async () => {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      await axios.put(`/api/assets/${selectedAsset.id}`, assetForm, { headers });
      
      success('Asset updated successfully');
      handleCloseDialog();
      fetchAssets();
    } catch (err) {
      error('Failed to update asset: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete asset
  const deleteAsset = async () => {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      // Use selectedAsset.id instead of selectedAsset._id for database mode
      const assetId = selectedAsset.id || selectedAsset._id;
      await axios.delete(`/api/assets/${assetId}`, { headers });
      
      success('Asset deleted successfully');
      setOpenDeleteDialog(false);
      fetchAssets();
    } catch (err) {
      error('Failed to delete asset: ' + (err.response?.data?.message || err.message));
    }
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

  // Handle search
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  // Apply search
  const applySearch = () => {
    setPage(0); // Reset to first page when searching
    fetchAssets();
  };

  // Handle key press in search field
  const handleSearchKeyPress = (event) => {
    if (event.key === 'Enter') {
      applySearch();
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Open add asset dialog
  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setAssetForm({
      name: '',
      description: '',
      type: 'machine',
      pin_number: '',
      logger_id: '',
      short_stop_threshold: 5,
      long_stop_threshold: 30,
      downtime_reasons: 'Maintenance,Breakdown,Setup,Material shortage,Quality issue',
      thresholds: {
        availability: 85,
        performance: 85,
        quality: 95,
        oee: 75
      },
      settings: {
        idleTimeThreshold: 5, // minutes
        warningTimeThreshold: 10, // minutes
        collectQualityData: true,
        collectPerformanceData: true
      }
    });
    setOpenDialog(true);
  };

  // Open edit asset dialog
  const handleOpenEditDialog = (asset) => {
    setDialogMode('edit');
    setSelectedAsset(asset);
    setAssetForm({
      name: asset.name,
      description: asset.description || '',
      type: asset.type,
      pin_number: asset.pin_number || '',
      logger_id: asset.logger_id || '',
      short_stop_threshold: asset.short_stop_threshold || 5,
      long_stop_threshold: asset.long_stop_threshold || 30,
      downtime_reasons: asset.downtime_reasons || 'Maintenance,Breakdown,Setup,Material shortage,Quality issue',
      thresholds: {
        availability: asset.thresholds?.availability || 85,
        performance: asset.thresholds?.performance || 85,
        quality: asset.thresholds?.quality || 95,
        oee: asset.thresholds?.oee || 75
      },
      settings: {
        idleTimeThreshold: asset.settings?.idleTimeThreshold || 5,
        warningTimeThreshold: asset.settings?.warningTimeThreshold || 10,
        collectQualityData: asset.settings?.collectQualityData !== false,
        collectPerformanceData: asset.settings?.collectPerformanceData !== false
      }
    });
    setOpenDialog(true);
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (asset) => {
    setSelectedAsset(asset);
    setOpenDeleteDialog(true);
  };

  // Close asset dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle form input change
  const handleFormChange = (event) => {
    const { name, value, checked } = event.target;
    
    if (name.includes('.')) {
      // Handle nested properties (thresholds and settings)
      const [parent, child] = name.split('.');
      setAssetForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: event.target.type === 'checkbox' ? checked : 
                  event.target.type === 'number' ? Number(value) : value,
        }
      }));
    } else {
      // Handle top-level properties
      setAssetForm(prev => ({
        ...prev,
        [name]: event.target.type === 'checkbox' ? checked : value,
      }));
    }
  };

  // Handle form submission
  const handleSubmitForm = () => {
    if (dialogMode === 'add') {
      addAsset();
    } else {
      updateAsset();
    }
  };

  // Fetch assets when component mounts or when page, rowsPerPage changes
  useEffect(() => {
    fetchAssets();
    fetchLoggers();
  }, [page, rowsPerPage]);

  // Subscribe to asset updates via socket
  useEffect(() => {
    if (socket) {
      socket.on('asset_updated', () => {
        fetchAssets();
      });
      
      socket.on('asset_created', () => {
        fetchAssets();
      });
      
      socket.on('asset_deleted', () => {
        fetchAssets();
      });
      
      return () => {
        socket.off('asset_updated');
        socket.off('asset_created');
        socket.off('asset_deleted');
      };
    }
  }, [socket]);

  // Render loading state
  if (loading && assets.length === 0) {
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
          Asset Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Add Asset
        </Button>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search assets..."
          value={searchQuery}
          onChange={handleSearch}
          onKeyPress={handleSearchKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button onClick={applySearch} size="small">
                  Search
                </Button>
              </InputAdornment>
            ),
          }}
          variant="outlined"
          size="small"
        />
      </Box>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="assets table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Logger</TableCell>
              <TableCell>Pin Number</TableCell>
              <TableCell>Current State</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <StyledTableRow key={asset.id}>
                  <TableCell component="th" scope="row">
                    {asset.name}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={asset.type ? asset.type.charAt(0).toUpperCase() + asset.type.slice(1) : 'Unknown'} 
                      color={
                        asset.type === 'machine' ? 'primary' :
                        asset.type === 'line' ? 'secondary' :
                        asset.type === 'cell' ? 'info' :
                        asset.type === 'station' ? 'success' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {asset.logger ? (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {asset.logger.name}
                        </Typography>
                        <Chip 
                          label={asset.logger.status || 'unknown'}
                          color={
                            asset.logger.status === 'online' ? 'success' :
                            asset.logger.status === 'offline' ? 'error' : 'warning'
                          }
                          size="small"
                        />
                      </Box>
                    ) : (
                      <Chip 
                        label="No Logger"
                        color="default"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>{asset.pin_number || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={asset.current_state || 'UNKNOWN'} 
                      color={
                        asset.current_state === 'RUNNING' ? 'success' :
                        asset.current_state === 'STOPPED' ? 'error' :
                        asset.current_state === 'IDLE' ? 'warning' :
                        asset.current_state === 'WARNING' ? 'warning' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(asset.created_at), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => handleOpenEditDialog(asset)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleOpenDeleteDialog(asset)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </StyledTableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalAssets}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      
      {/* Add/Edit Asset Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Asset' : 'Edit Asset'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="asset configuration tabs">
            <Tab label="Basic Information" id="asset-tab-0" aria-controls="asset-tabpanel-0" />
            <Tab label="Thresholds" id="asset-tab-1" aria-controls="asset-tabpanel-1" />
            <Tab label="Settings" id="asset-tab-2" aria-controls="asset-tabpanel-2" />
          </Tabs>
          
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  name="name"
                  label="Asset Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={assetForm.name}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Description"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={assetForm.description}
                  onChange={handleFormChange}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  name="type"
                  label="Asset Type"
                  fullWidth
                  variant="outlined"
                  value={assetForm.type}
                  onChange={handleFormChange}
                  required
                >
                  {assetTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  name="pin_number"
                  label="Pin Number"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={assetForm.pin_number}
                  onChange={handleFormChange}
                  helperText="Optional: Hardware pin number or identifier"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  name="logger_id"
                  label="Associated Logger"
                  fullWidth
                  variant="outlined"
                  value={assetForm.logger_id}
                  onChange={handleFormChange}
                  helperText="Select the ESP32 logger that monitors this asset"
                >
                  <MenuItem value="">
                    <em>No Logger</em>
                  </MenuItem>
                  {loggers.map((logger) => (
                    <MenuItem key={logger._id} value={logger.logger_id}>
                      {logger.name} ({logger.logger_id}) - {logger.status}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  name="short_stop_threshold"
                  label="Short Stop Threshold (minutes)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={assetForm.short_stop_threshold}
                  onChange={handleFormChange}
                  InputProps={{ inputProps: { min: 1 } }}
                  helperText="Duration to classify as short stop"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  name="long_stop_threshold"
                  label="Long Stop Threshold (minutes)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={assetForm.long_stop_threshold}
                  onChange={handleFormChange}
                  InputProps={{ inputProps: { min: 1 } }}
                  helperText="Duration to classify as long stop"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="downtime_reasons"
                  label="Downtime Reasons"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={assetForm.downtime_reasons}
                  onChange={handleFormChange}
                  multiline
                  rows={2}
                  helperText="Comma-separated list of possible downtime reasons"
                />
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Typography variant="subtitle2" gutterBottom>
              Set threshold values for OEE calculations (in percentage)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  name="thresholds.availability"
                  label="Availability Threshold"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={assetForm.thresholds.availability}
                  onChange={handleFormChange}
                  InputProps={{ inputProps: { min: 0, max: 100 } }}
                  helperText="Target availability percentage"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  name="thresholds.performance"
                  label="Performance Threshold"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={assetForm.thresholds.performance}
                  onChange={handleFormChange}
                  InputProps={{ inputProps: { min: 0, max: 100 } }}
                  helperText="Target performance percentage"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  name="thresholds.quality"
                  label="Quality Threshold"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={assetForm.thresholds.quality}
                  onChange={handleFormChange}
                  InputProps={{ inputProps: { min: 0, max: 100 } }}
                  helperText="Target quality percentage"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  name="thresholds.oee"
                  label="OEE Threshold"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={assetForm.thresholds.oee}
                  onChange={handleFormChange}
                  InputProps={{ inputProps: { min: 0, max: 100 } }}
                  helperText="Target overall OEE percentage"
                />
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Typography variant="subtitle2" gutterBottom>
              Configure asset monitoring settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  name="settings.idleTimeThreshold"
                  label="Idle Time Threshold"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={assetForm.settings.idleTimeThreshold}
                  onChange={handleFormChange}
                  InputProps={{ inputProps: { min: 1 } }}
                  helperText="Minutes before asset is considered idle"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  name="settings.warningTimeThreshold"
                  label="Warning Time Threshold"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={assetForm.settings.warningTimeThreshold}
                  onChange={handleFormChange}
                  InputProps={{ inputProps: { min: 1 } }}
                  helperText="Minutes before asset triggers warning"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={assetForm.settings.collectQualityData}
                      onChange={handleFormChange}
                      name="settings.collectQualityData"
                      color="primary"
                    />
                  }
                  label="Collect Quality Data"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={assetForm.settings.collectPerformanceData}
                      onChange={handleFormChange}
                      name="settings.collectPerformanceData"
                      color="primary"
                    />
                  }
                  label="Collect Performance Data"
                />
              </Grid>
            </Grid>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmitForm} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add Asset' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the asset "{selectedAsset?.name}"? This action cannot be undone and will remove all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={deleteAsset} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetManagement;