import React, { useState, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import AlertContext from '../../context/AlertContext.js';

const CsvManagement = () => {
  const { error, success } = useContext(AlertContext);
  
  // State for CSV Export
  const [exportConfig, setExportConfig] = useState({
    type: 'assets',
    format: 'standard',
    fields: [],
    filters: {},
    dateRange: {
      startDate: '',
      endDate: ''
    },
    customFields: [],
    exportFormat: 'csv',
    includeHeaders: true,
    delimiter: ','
  });
  
  // State for CSV Import
  const [importFile, setImportFile] = useState(null);
  const [importType, setImportType] = useState('assets');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  
  // State for Scheduled Exports - Initialize as empty array
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    type: 'assets',
    frequency: 'daily',
    time: '',
    email: '',
    enabled: true,
  });
  const [scheduleDialog, setScheduleDialog] = useState(false);
  
  // State for Analytics
  const [analytics, setAnalytics] = useState({
    totalExports: 0,
    totalImports: 0,
    recentActivity: [],
    popularTemplates: [],
  });
  
  // State for Templates - Initialize as empty array
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch templates on component mount
  React.useEffect(() => {
    fetchTemplates();
    fetchSchedules();
    fetchAnalytics();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/csv/templates');
      // Ensure response.data is an array
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch CSV templates:', err);
      setTemplates([]); // Set to empty array on error
      error('Failed to fetch CSV templates: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/csv/schedules');
      // Ensure response.data is an array
      setSchedules(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch scheduled exports:', err);
      setSchedules([]); // Set to empty array on error
      error('Failed to fetch scheduled exports: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/csv/analytics');
      // Ensure response.data has the expected structure
      setAnalytics({
        totalExports: response.data?.totalExports || 0,
        totalImports: response.data?.totalImports || 0,
        recentActivity: Array.isArray(response.data?.recentActivity) ? response.data.recentActivity : [],
        popularTemplates: Array.isArray(response.data?.popularTemplates) ? response.data.popularTemplates : [],
      });
    } catch (err) {
      console.error('Failed to fetch CSV analytics:', err);
      // Set default values on error
      setAnalytics({
        totalExports: 0,
        totalImports: 0,
        recentActivity: [],
        popularTemplates: [],
      });
      error('Failed to fetch CSV analytics: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle CSV Export
  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await api.post('/csv/export', exportConfig, {
        responseType: 'blob',
      });
      
      // Determine file extension based on export format
      const fileExtension = exportConfig.exportFormat === 'json' ? 'json' : 
                           exportConfig.exportFormat === 'xml' ? 'xml' :
                           exportConfig.exportFormat === 'excel' ? 'xlsx' : 'csv';
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportConfig.type}_export_${new Date().toISOString().slice(0, 10)}.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      success('CSV exported successfully');
    } catch (err) {
      error('Failed to export CSV: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV Import
  const handleImport = async () => {
    if (!importFile) {
      error('Please select a file to import');
      return;
    }

    try {
      setLoading(true);
      setImportProgress(0);
      
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('type', importType);
      
      const response = await api.post('/csv/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setImportProgress(progress);
        },
      });
      
      setImportResults(response.data);
      success(`CSV imported successfully: ${response.data.processed} records processed`);
    } catch (err) {
      error('Failed to import CSV: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
      setImportProgress(0);
    }
  };

  // Handle Schedule Creation
  const handleCreateSchedule = async () => {
    try {
      setLoading(true);
      await api.post('/csv/schedules', newSchedule);
      success('Scheduled export created successfully');
      setScheduleDialog(false);
      setNewSchedule({
        name: '',
        type: 'assets',
        frequency: 'daily',
        time: '',
        email: '',
        enabled: true,
      });
      fetchSchedules();
    } catch (err) {
      error('Failed to create scheduled export: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle Schedule Deletion
  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await api.delete(`/csv/schedules/${scheduleId}`);
      success('Scheduled export deleted successfully');
      fetchSchedules();
    } catch (err) {
      error('Failed to delete scheduled export: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CSV Management
      </Typography>
      
      <Grid container spacing={3}>
        {/* CSV Export Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DownloadIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">CSV Export</Typography>
              </Box>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={exportConfig.type}
                  onChange={(e) => setExportConfig({ ...exportConfig, type: e.target.value })}
                >
                  <MenuItem value="assets">Assets</MenuItem>
                  <MenuItem value="events">Events</MenuItem>
                  <MenuItem value="shifts">Shifts</MenuItem>
                  <MenuItem value="performance">Performance</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Template</InputLabel>
                <Select
                  value={exportConfig.format}
                  onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
                >
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="detailed">Detailed</MenuItem>
                  <MenuItem value="summary">Summary</MenuItem>
                  <MenuItem value="advanced_analytics">Advanced Analytics</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={exportConfig.exportFormat}
                  onChange={(e) => setExportConfig({ ...exportConfig, exportFormat: e.target.value })}
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="xml">XML</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                </Select>
              </FormControl>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={exportConfig.dateRange.startDate}
                    onChange={(e) => setExportConfig({
                      ...exportConfig,
                      dateRange: { ...exportConfig.dateRange, startDate: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={exportConfig.dateRange.endDate}
                    onChange={(e) => setExportConfig({
                      ...exportConfig,
                      dateRange: { ...exportConfig.dateRange, endDate: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                disabled={loading}
                fullWidth
              >
                Export Data
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* CSV Import Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <UploadIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">CSV Import</Typography>
              </Box>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Import Type</InputLabel>
                <Select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value)}
                >
                  <MenuItem value="assets">Assets</MenuItem>
                  <MenuItem value="events">Events</MenuItem>
                  <MenuItem value="shifts">Shifts</MenuItem>
                </Select>
              </FormControl>
              
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                style={{ marginBottom: '16px', width: '100%' }}
              />
              
              {importProgress > 0 && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress variant="determinate" value={importProgress} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Upload Progress: {importProgress}%
                  </Typography>
                </Box>
              )}
              
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={handleImport}
                disabled={loading || !importFile}
                fullWidth
              >
                Import CSV
              </Button>
              
              {importResults && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Import completed: {importResults.processed} records processed, 
                  {importResults.errors} errors
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Scheduled Exports Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Scheduled Exports</Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={() => setScheduleDialog(true)}
                >
                  Add Schedule
                </Button>
              </Box>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Frequency</TableCell>
                      <TableCell>Next Run</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No scheduled exports found. Click "Add Schedule" to create one.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      schedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell>{schedule.name}</TableCell>
                          <TableCell>{schedule.type}</TableCell>
                          <TableCell>{schedule.frequency}</TableCell>
                          <TableCell>{schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : 'Not scheduled'}</TableCell>
                          <TableCell>
                            <Chip
                              label={schedule.enabled ? 'Active' : 'Inactive'}
                              color={schedule.enabled ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteSchedule(schedule.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Analytics Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AnalyticsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">CSV Analytics</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {analytics.totalExports}
                    </Typography>
                    <Typography variant="body2">Total Exports</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="secondary">
                      {analytics.totalImports}
                    </Typography>
                    <Typography variant="body2">Total Imports</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {analytics.recentActivity?.length || 0}
                    </Typography>
                    <Typography variant="body2">Recent Activities</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {analytics.popularTemplates?.length || 0}
                    </Typography>
                    <Typography variant="body2">Templates</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Schedule Creation Dialog */}
      <Dialog open={scheduleDialog} onClose={() => setScheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Scheduled Export</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Schedule Name"
            value={newSchedule.name}
            onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Data Type</InputLabel>
            <Select
              value={newSchedule.type}
              onChange={(e) => setNewSchedule({ ...newSchedule, type: e.target.value })}
            >
              <MenuItem value="assets">Assets</MenuItem>
              <MenuItem value="events">Events</MenuItem>
              <MenuItem value="shifts">Shifts</MenuItem>
              <MenuItem value="performance">Performance</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Frequency</InputLabel>
            <Select
              value={newSchedule.frequency}
              onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Schedule Time (HH:MM)"
            value={newSchedule.time}
            onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
            placeholder="14:30"
            helperText="24-hour format (e.g., 14:30 for 2:30 PM)"
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Email Recipients"
            value={newSchedule.email}
            onChange={(e) => setNewSchedule({ ...newSchedule, email: e.target.value })}
            placeholder="email1@example.com, email2@example.com"
            helperText="Comma-separated email addresses"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateSchedule} variant="contained" disabled={loading}>
            Create Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CsvManagement;