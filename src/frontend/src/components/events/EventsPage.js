import React, { useState, useEffect, useContext } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import Collapse from '@mui/material/Collapse';
// Date utilities
import { format } from 'date-fns';
import axios from 'axios';

// Components
import EventsTable from './EventsTable';

// Context
import SocketContext from '../../context/SocketContext';
import AlertContext from '../../context/AlertContext';

// Styled components
const FiltersContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const EventsPage = () => {
  const { assets } = useContext(SocketContext);
  const { error, success } = useContext(AlertContext);
  
  // State for events data
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for filters
  const [filters, setFilters] = useState({
    asset: '',
    eventType: '',
    state: '',
    startDate: null,
    endDate: null,
    search: '',
  });
  
  // State for filter visibility
  const [showFilters, setShowFilters] = useState(false);
  
  // Event type options
  const eventTypes = [
    { value: '', label: 'All Types' },
    { value: 'STATE_CHANGE', label: 'State Change' },
    { value: 'SHIFT', label: 'Shift' },
    { value: 'SHIFT_START', label: 'Shift Start' },
    { value: 'SHIFT_END', label: 'Shift End' },
    { value: 'MICRO_STOP', label: 'Micro Stop' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
  ];
  
  // State options
  const stateOptions = [
    { value: '', label: 'All States' },
    { value: 'RUNNING', label: 'Running' },
    { value: 'STOPPED', label: 'Stopped' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'IDLE', label: 'Idle' },
  ];

  // Fetch events with filters and pagination
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = {
        page: page + 1, // API uses 1-based indexing
        limit: rowsPerPage,
        ...(filters.asset && { asset: filters.asset }),
        ...(filters.eventType && { eventType: filters.eventType }),
        ...(filters.state && { state: filters.state }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
        ...(filters.search && { search: filters.search }),
      };
      
      const response = await axios.get('/api/events', { params });
      
      setEvents(response.data.events);
      setTotalEvents(response.data.total);
    } catch (err) {
      error('Failed to fetch events: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch events when page, rowsPerPage, or filters change
  useEffect(() => {
    fetchEvents();
  }, [page, rowsPerPage]);

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

  // Apply filters
  const applyFilters = () => {
    setPage(0); // Reset to first page when applying filters
    fetchEvents();
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      asset: '',
      eventType: '',
      state: '',
      startDate: null,
      endDate: null,
      search: '',
    });
    setPage(0);
    // Fetch events with cleared filters
    setTimeout(fetchEvents, 0);
  };

  // Toggle filters visibility
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Export events as CSV
  const exportEvents = async () => {
    try {
      setLoading(true);
      
      // Build query parameters for export (without pagination)
      const params = {
        ...(filters.asset && { asset: filters.asset }),
        ...(filters.eventType && { eventType: filters.eventType }),
        ...(filters.state && { state: filters.state }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
        ...(filters.search && { search: filters.search }),
        export: true,
      };
      
      const response = await axios.get('/api/events/export', { 
        params,
        responseType: 'blob',
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `events_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      success('Events exported successfully');
    } catch (err) {
      error('Failed to export events: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Events
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={toggleFilters}
            sx={{ mr: 1 }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchEvents}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportEvents}
            disabled={loading}
          >
            Export
          </Button>
        </Box>
      </Box>
      
      <Collapse in={showFilters}>
        <FiltersContainer>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
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
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Event Type"
                  name="eventType"
                  value={filters.eventType}
                  onChange={handleFilterChange}
                  variant="outlined"
                  size="small"
                >
                  {eventTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="State"
                  name="state"
                  value={filters.state}
                  onChange={handleFilterChange}
                  variant="outlined"
                  size="small"
                >
                  {stateOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Start Date & Time"
                  type="datetime-local"
                  value={filters.startDate ? format(filters.startDate, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    startDate: e.target.value ? new Date(e.target.value) : null 
                  }))}
                  size="small"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="End Date & Time"
                  type="datetime-local"
                  value={filters.endDate ? format(filters.endDate, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    endDate: e.target.value ? new Date(e.target.value) : null 
                  }))}
                  size="small"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={applyFilters}
                  fullWidth
                  disabled={loading}
                >
                  Apply Filters
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={clearFilters}
                  fullWidth
                  startIcon={<ClearIcon />}
                  disabled={loading}
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </FiltersContainer>
      </Collapse>
      
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <EventsTable 
          events={events}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          totalEvents={totalEvents}
          handleChangePage={handleChangePage}
          handleChangeRowsPerPage={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default EventsPage;