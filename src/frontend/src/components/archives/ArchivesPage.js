import React, { useState, useEffect, useContext, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import StorageIcon from '@mui/icons-material/Storage';
import ArchiveIcon from '@mui/icons-material/Archive';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DescriptionIcon from '@mui/icons-material/Description';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';
import axios from 'axios';

// Context imports
import SocketContext from '../../context/SocketContext';
import AlertContext from '../../context/AlertContext';
import AuthContext from '../../context/AuthContext';

// Components
import ShiftReportTable from './ShiftReportTable';
import DailyReportTable from './DailyReportTable';
import MonthlyReportTable from './MonthlyReportTable';
import CsvManagement from './CsvManagement';
import EventArchiveTable from './EventArchiveTable';
import NaturalLanguageReports from './NaturalLanguageReports';

// Styled components
const TabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

const ArchivesPage = () => {
  const { assets, registerArchiveRefreshCallback } = useContext(SocketContext);
  const { error, success } = useContext(AlertContext);
  const { isAuthenticated, token, user } = useContext(AuthContext);
  
  // State for tab selection - Updated to include Event Archives
  const [tabValue, setTabValue] = useState(0);
  
  // State for filters
  const [filters, setFilters] = useState({
    asset: '',
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
    endDate: new Date(),
  });
  
  // State for data
  const [shiftReports, setShiftReports] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [eventArchives, setEventArchives] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Tab labels and icons - Updated to include Event Archives
  const tabs = [
    { label: 'Shift Reports', icon: <AssignmentIcon /> },
    { label: 'Daily Reports', icon: <TodayIcon /> },
    { label: 'Monthly Reports', icon: <CalendarMonthIcon /> },
    { label: 'Natural Language Reports', icon: <DescriptionIcon /> },
    { label: 'Event Archives', icon: <ArchiveIcon /> },
    { label: 'CSV Management', icon: <StorageIcon /> },
  ];

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Handle date filter change
  const handleDateChange = (name, date) => {
    setFilters(prev => ({ ...prev, [name]: date }));
  };

  // Fetch shift reports
  const fetchShiftReports = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        ...(filters.asset && { asset: filters.asset }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
      };
      
      const response = await axios.get('/api/reports/shifts', { params });
      // Ensure response.data is always an array
      setShiftReports(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      error('Failed to fetch shift reports: ' + (err.response?.data?.message || err.message));
      setShiftReports([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [filters.asset, filters.startDate, filters.endDate, error]);

  // Fetch daily reports
  const fetchDailyReports = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        ...(filters.asset && { asset: filters.asset }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
      };
      
      const response = await axios.get('/api/reports/daily', { params });
      // Ensure response.data is always an array
      setDailyReports(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      error('Failed to fetch daily reports: ' + (err.response?.data?.message || err.message));
      setDailyReports([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [filters.asset, filters.startDate, filters.endDate, error]);

  // Fetch monthly reports
  const fetchMonthlyReports = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        ...(filters.asset && { asset: filters.asset }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
      };
      
      const response = await axios.get('/api/reports/monthly', { params });
      // Ensure response.data is always an array
      setMonthlyReports(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      error('Failed to fetch monthly reports: ' + (err.response?.data?.message || err.message));
      setMonthlyReports([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [filters.asset, filters.startDate, filters.endDate, error]);

  // Fetch event archives
  const fetchEventArchives = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching event archives...');
      console.log('Authentication status:', { isAuthenticated, token: token ? 'present' : 'missing', user });
      console.log('Axios default headers:', axios.defaults.headers.common);
      
      const response = await axios.get('/api/events/archives');
      console.log('Event archives response:', response.data);
      setEventArchives(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error('Error fetching event archives:', err);
      console.error('Error response:', err.response);
      error('Failed to fetch event archives: ' + (err.response?.data?.message || err.message));
      setEventArchives([]);
    } finally {
      setLoading(false);
    }
  }, [error]);

  // Apply filters and fetch data based on current tab
  const applyFilters = useCallback(() => {
    switch (tabValue) {
      case 0:
        fetchShiftReports();
        break;
      case 1:
        fetchDailyReports();
        break;
      case 2:
        fetchMonthlyReports();
        break;
      case 3:
        // Natural Language Reports tab - no data fetching needed
        break;
      case 4:
        fetchEventArchives();
        break;
      case 5:
        // CSV Management tab - no data fetching needed
        break;
      default:
        break;
    }
  }, [tabValue, fetchShiftReports, fetchDailyReports, fetchMonthlyReports, fetchEventArchives]);

  // Export data as CSV
  const exportData = async () => {
    try {
      setLoading(true);
      
      let endpoint = '';
      let filename = '';
      
      switch (tabValue) {
        case 0:
          endpoint = '/api/reports/shifts/export';
          filename = 'shift_reports';
          break;
        case 1:
          endpoint = '/api/reports/daily/export';
          filename = 'daily_reports';
          break;
        case 2:
          endpoint = '/api/reports/monthly/export';
          filename = 'monthly_reports';
          break;
        default:
          return; // No export for Natural Language Reports, Event Archives and CSV Management tabs
      }
      
      const params = {
        ...(filters.asset && { asset: filters.asset }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
      };
      
      const response = await axios.get(endpoint, { 
        params,
        responseType: 'blob',
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      success('Data exported successfully');
    } catch (err) {
      error('Failed to export data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Register archive refresh callback when component mounts
  useEffect(() => {
    if (registerArchiveRefreshCallback) {
      registerArchiveRefreshCallback(fetchEventArchives);
    }
  }, [registerArchiveRefreshCallback, fetchEventArchives]);

  // Fetch data when component mounts or tab changes
  useEffect(() => {
    console.log('ArchivesPage useEffect triggered, tabValue:', tabValue);
    console.log('Current authentication state:', { isAuthenticated, token: token ? 'present' : 'missing', user });
    if (tabValue === 4) {
      console.log('Event Archives tab selected, calling fetchEventArchives directly');
      fetchEventArchives();
    } else {
      applyFilters();
    }
  }, [tabValue, isAuthenticated, token, fetchEventArchives, applyFilters]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Archives & Data Management
        </Typography>
        {/* Debug info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color={isAuthenticated ? 'success.main' : 'error.main'}>
            Auth: {isAuthenticated ? 'Yes' : 'No'} | Token: {token ? 'Present' : 'Missing'}
          </Typography>
          {/* Only show export button for report tabs */}
          {tabValue < 3 && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportData}
              disabled={loading}
            >
              Export
            </Button>
          )}
        </Box>
      </Box>
      
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          {tabs.map((tab, index) => (
            <Tab 
              key={index} 
              label={tab.label} 
              icon={tab.icon} 
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>
      
      {/* Only show filters for report tabs */}
      {tabValue < 4 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Asset"
                name="asset"
                value={filters.asset}
                onChange={handleFilterChange}
                variant="outlined"
                size="small"
              >
                <MenuItem value="">All Assets</MenuItem>
                {assets.map((asset) => (
                  <MenuItem key={asset.id} value={asset.id}>
                    {asset.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  startDate: e.target.value ? new Date(e.target.value) : null 
                }))}
                size="small"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  endDate: e.target.value ? new Date(e.target.value) : null 
                }))}
                size="small"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={applyFilters}
                fullWidth
                disabled={loading}
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {loading && tabValue < 4 && tabValue !== 3 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Shift Reports Tab */}
          {tabValue === 0 && (
            <TabPanel>
              <ShiftReportTable reports={shiftReports} />
            </TabPanel>
          )}
          
          {/* Daily Reports Tab */}
          {tabValue === 1 && (
            <TabPanel>
              <DailyReportTable reports={dailyReports} />
            </TabPanel>
          )}
          
          {/* Monthly Reports Tab */}
          {tabValue === 2 && (
            <TabPanel>
              <MonthlyReportTable reports={monthlyReports} />
            </TabPanel>
          )}
          
          {/* Natural Language Reports Tab */}
          {tabValue === 3 && (
            <TabPanel>
              <NaturalLanguageReports />
            </TabPanel>
          )}
          
          {/* Event Archives Tab */}
          {tabValue === 4 && (
            <TabPanel>
              <EventArchiveTable 
                archives={eventArchives} 
                onRefresh={fetchEventArchives}
              />
            </TabPanel>
          )}
          
          {/* CSV Management Tab */}
          {tabValue === 5 && (
            <TabPanel>
              <CsvManagement />
            </TabPanel>
          )}
        </>
      )}
    </Box>
  );
};

export default ArchivesPage;