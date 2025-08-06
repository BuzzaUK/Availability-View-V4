import React, { useState, useEffect, useContext } from 'react';
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
// Date utilities
import { format } from 'date-fns';
import axios from 'axios';

// Context
import SocketContext from '../../context/SocketContext';
import AlertContext from '../../context/AlertContext';

// Components
import ShiftReportTable from './ShiftReportTable';
import DailyReportTable from './DailyReportTable';
import MonthlyReportTable from './MonthlyReportTable';

// Styled components
const TabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

const ArchivesPage = () => {
  const { assets } = useContext(SocketContext);
  const { error, success } = useContext(AlertContext);
  
  // State for tab selection
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
  const [loading, setLoading] = useState(false);
  
  // Tab labels and icons
  const tabs = [
    { label: 'Shift Reports', icon: <CalendarViewMonthIcon /> },
    { label: 'Daily Reports', icon: <BarChartIcon /> },
    { label: 'Monthly Reports', icon: <TableChartIcon /> },
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
  const fetchShiftReports = async () => {
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
  };

  // Fetch daily reports
  const fetchDailyReports = async () => {
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
  };

  // Fetch monthly reports
  const fetchMonthlyReports = async () => {
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
  };

  // Apply filters and fetch data based on current tab
  const applyFilters = () => {
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
      default:
        break;
    }
  };

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
          break;
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

  // Fetch data when component mounts or tab changes
  useEffect(() => {
    applyFilters();
  }, [tabValue]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Archives
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportData}
          disabled={loading}
        >
          Export
        </Button>
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
                <MenuItem key={asset._id} value={asset._id}>
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
      
      {loading ? (
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
        </>
      )}
    </Box>
  );
};

export default ArchivesPage;