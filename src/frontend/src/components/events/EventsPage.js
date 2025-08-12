import React, { useState, useEffect, useContext } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArchiveIcon from '@mui/icons-material/Archive';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

import EventsTable from './EventsTable';

import SocketContext from '../../context/SocketContext';
import AlertContext from '../../context/AlertContext';
import SettingsContext from '../../context/SettingsContext';

import { format } from 'date-fns';

import axios from 'axios';

// Styled components
const FiltersContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const EventsPage = () => {
  const { assets } = useContext(SocketContext);
  const { error, success } = useContext(AlertContext);
  const { settings } = useContext(SettingsContext);
  
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
  
  // State for current shift filtering
  const [currentShiftOnly, setCurrentShiftOnly] = useState(true);
  
  // State for filter visibility
  const [showFilters, setShowFilters] = useState(false);
  
  // Archive dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [archiveDescription, setArchiveDescription] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [archiveAsEndOfShift, setArchiveAsEndOfShift] = useState(false); // Add this line
  
  // Auto-refresh state
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [showRefreshNotice, setShowRefreshNotice] = useState(false);
  
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
        currentShiftOnly: currentShiftOnly.toString(),
        ...(filters.asset && { asset: filters.asset }),
        ...(filters.eventType && { eventType: filters.eventType }),
        ...(filters.state && { state: filters.state }),
        ...(!currentShiftOnly && filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(!currentShiftOnly && filters.endDate && { endDate: filters.endDate.toISOString() }),
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
  }, [page, rowsPerPage, currentShiftOnly]);

  // Update countdown when settings change
  useEffect(() => {
    console.log('🔍 EVENTS PAGE SETTINGS CHANGED:', {
      autoRefresh: settings?.autoRefresh,
      refreshInterval: settings?.refreshInterval,
      fullSettings: settings
    });
    if (settings?.refreshInterval) {
      setRefreshCountdown(settings.refreshInterval);
    }
  }, [settings?.refreshInterval, settings?.autoRefresh]);

  // Auto-refresh countdown
  useEffect(() => {
    console.log('🔍 EVENTS PAGE AUTO-REFRESH EFFECT:', {
      autoRefresh: settings?.autoRefresh,
      refreshInterval: settings?.refreshInterval
    });
    if (settings?.autoRefresh) {
      const interval = setInterval(() => {
        setRefreshCountdown(prev => {
          const newValue = prev - 1;
          
          if (newValue <= 0) {
            // Trigger refresh
            fetchEvents().then(() => {
              console.log('✅ Events auto-refresh completed successfully', new Date().toISOString());
            }).catch(error => {
              console.error('❌ Events auto-refresh failed:', error, new Date().toISOString());
            });
            setShowRefreshNotice(true);
            setTimeout(() => setShowRefreshNotice(false), 2000);
            const nextInterval = settings?.refreshInterval || 30;
            return nextInterval;
          }
          
          return newValue;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    } else {
      // Reset countdown when auto-refresh is disabled
      setRefreshCountdown(settings?.refreshInterval || 30);
    }
  }, [settings?.autoRefresh, settings?.refreshInterval, fetchEvents]);

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

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchEvents();
    setShowRefreshNotice(true);
    setTimeout(() => setShowRefreshNotice(false), 2000);
    setRefreshCountdown(settings?.refreshInterval || 30);
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

  // Archive current events
  const handleArchiveEvents = async () => {
    if (!archiveName.trim()) {
      error('Please provide an archive name');
      return;
    }

    setArchiving(true);
    try {
      const response = await axios.post('/api/events/archive', {
        name: archiveName.trim(),
        description: archiveDescription.trim(),
        events: events,
        isEndOfShift: archiveAsEndOfShift // Add this new state variable
      });

      if (response.data.success) {
        success(response.data.message);
        setArchiveDialogOpen(false);
        setArchiveName('');
        setArchiveDescription('');
        setArchiveAsEndOfShift(false); // Reset the checkbox
        // Refresh events to show the updated list
        await fetchEvents();
      }
    } catch (err) {
      console.error('Error archiving events:', err);
      error('Failed to archive events: ' + (err.response?.data?.message || err.message));
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Events
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={currentShiftOnly}
                onChange={(e) => setCurrentShiftOnly(e.target.checked)}
                color="primary"
              />
            }
            label="Current Shift Only"
            sx={{ mr: 2 }}
          />
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
            startIcon={<ArchiveIcon />}
            onClick={() => setArchiveDialogOpen(true)}
            disabled={loading || events.length === 0}
            sx={{ mr: 1 }}
          >
            Archive
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

      {/* Filters */}
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
                    <MenuItem key={asset.id} value={asset.id}>
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
                  disabled={currentShiftOnly}
                  helperText={currentShiftOnly ? "Disabled in Current Shift mode" : ""}
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
                  disabled={currentShiftOnly}
                  helperText={currentShiftOnly ? "Disabled in Current Shift mode" : ""}
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

      {/* Archive Confirmation Dialog (keep only this one, inside the component) */}
      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        aria-labelledby="archive-dialog-title"
        aria-describedby="archive-dialog-description"
      >
        <DialogTitle id="archive-dialog-title">
          Archive Current Events
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="archive-dialog-description" sx={{ mb: 2 }}>
            Are you sure you want to archive the current {events.length} events? 
            {archiveAsEndOfShift 
              ? "This will move them to the archive and clear them from the active events list." 
              : "During an active shift, events will be archived but remain in the active list until shift end."
            }
            You can access archived events from the Archive Management page.
          </DialogContentText>
          <TextField
            fullWidth
            label="Archive Name"
            value={archiveName}
            onChange={(e) => setArchiveName(e.target.value)}
            placeholder={`Events Archive - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            value={archiveDescription}
            onChange={(e) => setArchiveDescription(e.target.value)}
            placeholder={`Archived ${events.length} events`}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={archiveAsEndOfShift}
                onChange={(e) => setArchiveAsEndOfShift(e.target.checked)}
                color="primary"
              />
            }
            label="End of Shift Archive (clear events from active list)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)} disabled={archiving}>
            Cancel
          </Button>
          <Button 
            onClick={handleArchiveEvents} 
            variant="contained" 
            color="primary"
            disabled={archiving}
            startIcon={archiving ? <CircularProgress size={20} /> : <ArchiveIcon />}
          >
            {archiving ? 'Archiving...' : 'Archive Events'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventsPage;