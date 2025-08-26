import React, { useState, useEffect, useContext, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { useLocation, useSearchParams } from 'react-router-dom';
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
import Chip from '@mui/material/Chip';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimelineIcon from '@mui/icons-material/Timeline';
import PieChartIcon from '@mui/icons-material/PieChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import AvailabilityIcon from '@mui/icons-material/Assessment';
import DescriptionIcon from '@mui/icons-material/Description';
import ClearIcon from '@mui/icons-material/Clear';
// Date utilities
import { format } from 'date-fns';
import api from '../../services/api';

// Components
import DowntimePareto from './DowntimePareto';

import PerformanceMetrics from './PerformanceMetrics';
import AvailabilityKPIs from './AvailabilityKPIs';
import MicroStopsChart from './MicroStopsChart';
import NaturalLanguageReports from '../archives/NaturalLanguageReports';

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
  const [searchParams, setSearchParams] = useSearchParams();
  
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
    downtimeData: [],
    stateDistribution: [],
    performanceMetrics: null,
    availabilityData: null,
  });
  const [loading, setLoading] = useState(false);

  // Initialize asset filter from query parameter
  useEffect(() => {
    const assetParam = searchParams.get('asset');
    if (assetParam && assetParam !== filters.asset) {
      setFilters(prev => ({ ...prev, asset: assetParam }));
    }
  }, [searchParams]);

  // Get selected asset name for display
  const getSelectedAssetName = () => {
    if (!filters.asset) return null;
    const asset = assets.find(a => a.id === filters.asset);
    return asset ? asset.name : 'Unknown Asset';
  };

  // Clear asset filter
  const clearAssetFilter = () => {
    setFilters(prev => ({ ...prev, asset: '' }));
    setSearchParams(params => {
      params.delete('asset');
      return params;
    });
  };
  
  // Tab labels and icons
  const tabs = [
    { label: 'Availability KPIs', icon: <AvailabilityIcon /> },
    { label: 'Downtime Analysis', icon: <BarChartIcon /> },
    { label: 'CHARTS', icon: <PieChartIcon /> },
    { label: 'Natural Language Reports', icon: <DescriptionIcon /> },
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
    
    // Update URL when asset filter changes
    if (name === 'asset') {
      if (value) {
        setSearchParams({ asset: value });
      } else {
        setSearchParams({});
      }
    }
  };

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        ...(filters.asset && { asset_id: filters.asset }),
        ...(filters.startDate && { start_date: filters.startDate.toISOString() }),
        ...(filters.endDate && { end_date: filters.endDate.toISOString() }),
        groupBy: filters.groupBy,
      };
      
      // Fetch all analytics data in parallel
      const [
        availabilityResponse,
        downtimeResponse,
        stateResponse,
        metricsResponse
      ] = await Promise.all([
        api.get('/analytics/availability', { params }),
        api.get('/analytics/downtime', { params }),
        api.get('/analytics/state-distribution', { params }),
        api.get('/analytics/performance-metrics', { params })
      ]);
      
      setAnalyticsData({
        availabilityData: availabilityResponse.data.data || null,
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

  // Fetch data when component mounts or filters change
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Render tab content
  const renderTabContent = () => {
    const selectedAssetObj = filters.asset ? assets.find(a => a.id === filters.asset) : null;
    console.log('AnalyticsPage - filters.asset:', filters.asset);
    console.log('AnalyticsPage - assets:', assets);
    console.log('AnalyticsPage - selectedAssetObj:', selectedAssetObj);
    
    switch (tabValue) {
      case 0:
        return (
          <Box>
            <AvailabilityKPIs 
              data={analyticsData.availabilityData} 
              loading={loading} 
              selectedAsset={selectedAssetObj}
            />
          </Box>
        );
      case 1:
        return <DowntimePareto data={analyticsData.downtimeData} loading={loading} />;
      case 2:
        return (
          <Box>
            <MicroStopsChart 
              data={analyticsData.availabilityData} 
              loading={loading} 
              selectedAsset={selectedAssetObj}
            />
          </Box>
        );
      case 3:
        return <NaturalLanguageReports />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics
          </Typography>
          {getSelectedAssetName() && (
            <Chip
              label={`Asset: ${getSelectedAssetName()}`}
              onDelete={clearAssetFilter}
              deleteIcon={<ClearIcon />}
              color="primary"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </Box>
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
              type="date"
              fullWidth
              label="Start Date"
              name="startDate"
              value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              type="date"
              fullWidth
              label="End Date"
              name="endDate"
              value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
              size="small"
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
              size="small"
            >
              {groupByOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={applyFilters}
              fullWidth
              disabled={loading}
              size="small"
            >
              Apply
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab, index) => (
            <Tab 
              key={index}
              icon={tab.icon} 
              label={tab.label} 
              iconPosition="start"
            />
          ))}
        </Tabs>
        
        <TabPanel>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
          {!loading && renderTabContent()}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AnalyticsPage;