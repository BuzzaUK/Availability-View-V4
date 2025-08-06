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
import RefreshIcon from '@mui/icons-material/Refresh';
import TimelineIcon from '@mui/icons-material/Timeline';
import PieChartIcon from '@mui/icons-material/PieChart';
import BarChartIcon from '@mui/icons-material/BarChart';
// Date utilities
import { format } from 'date-fns';
import axios from 'axios';

// Components
import OeeChart from './OeeChart';
import DowntimePareto from './DowntimePareto';
import StateDistribution from './StateDistribution';
import PerformanceMetrics from './PerformanceMetrics';

// Context
import SocketContext from '../../context/SocketContext';
import AlertContext from '../../context/AlertContext';

// Styled components - removed theme dependency
const TabPanel = styled(Box)(() => ({
  padding: '24px',
}));

const AnalyticsPage = () => {
  const { assets } = useContext(SocketContext);
  const { error } = useContext(AlertContext);
  
  // State for tab selection
  const [tabValue, setTabValue] = useState(0);
  
  // State for filters
  const [filters, setFilters] = useState({
    asset: '',
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
    endDate: new Date(),
    groupBy: 'day', // day, week, month
  });
  
  // State for data
  const [analyticsData, setAnalyticsData] = useState({
    oeeData: [],
    downtimeData: [],
    stateDistribution: [],
    performanceMetrics: null,
  });
  const [loading, setLoading] = useState(false);
  
  // Tab labels and icons
  const tabs = [
    { label: 'OEE Trends', icon: <TimelineIcon /> },
    { label: 'Downtime Analysis', icon: <BarChartIcon /> },
    { label: 'State Distribution', icon: <PieChartIcon /> },
  ];

  // Group by options
  const groupByOptions = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
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



  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        ...(filters.asset && { asset: filters.asset }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
        groupBy: filters.groupBy,
      };
      
      // Fetch OEE data
      const oeeResponse = await axios.get('/api/analytics/oee', { params });
      
      // Fetch downtime data
      const downtimeResponse = await axios.get('/api/analytics/downtime', { params });
      
      // Fetch state distribution data
      const stateResponse = await axios.get('/api/analytics/state-distribution', { params });
      
      // Fetch performance metrics
      const metricsResponse = await axios.get('/api/analytics/performance-metrics', { params });
      
      setAnalyticsData({
        oeeData: oeeResponse.data.data || [],
        downtimeData: downtimeResponse.data.data?.downtime_by_reason || [],
        stateDistribution: stateResponse.data.data?.distribution || [],
        performanceMetrics: metricsResponse.data.data?.[0] || null,
      });
    } catch (err) {
      error('Failed to fetch analytics data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [filters, error]);

  // Apply filters and fetch data
  const applyFilters = () => {
    fetchAnalyticsData();
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Analytics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchAnalyticsData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
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
          
          <Grid item xs={12} md={2.5}>
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
          
          <Grid item xs={12} md={2.5}>
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
            <TextField
              select
              fullWidth
              label="Group By"
              name="groupBy"
              value={filters.groupBy}
              onChange={handleFilterChange}
              variant="outlined"
              size="small"
            >
              {groupByOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
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
      
      {/* Performance Metrics Cards */}
      <PerformanceMetrics metrics={analyticsData.performanceMetrics} loading={loading} />
      
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
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* OEE Trends Tab */}
          {tabValue === 0 && (
            <TabPanel>
              <OeeChart data={analyticsData.oeeData} groupBy={filters.groupBy} />
            </TabPanel>
          )}
          
          {/* Downtime Analysis Tab */}
          {tabValue === 1 && (
            <TabPanel>
              <DowntimePareto data={analyticsData.downtimeData} />
            </TabPanel>
          )}
          
          {/* State Distribution Tab */}
          {tabValue === 2 && (
            <TabPanel>
              <StateDistribution data={analyticsData.stateDistribution} />
            </TabPanel>
          )}
        </>
      )}
    </Box>
  );
};

export default AnalyticsPage;