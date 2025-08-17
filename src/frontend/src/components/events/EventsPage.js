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
import DownloadIcon from '@mui/icons-material/Download';
import ArchiveIcon from '@mui/icons-material/Archive';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EventsTable from './EventsTable';
import ShiftCountdownTimer from '../common/ShiftCountdownTimer';

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
  const { assets, currentShift, fetchAllData } = useContext(SocketContext);
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
  const [archiveAsEndOfShift, setArchiveAsEndOfShift] = useState(false);
  
  // Current shift state
  const [endingShift, setEndingShift] = useState(false);
  const [endShiftDialogOpen, setEndShiftDialogOpen] = useState(false);
  const [endShiftNotes, setEndShiftNotes] = useState('');
  
  // Shift controls state
  const [shiftLoading, setShiftLoading] = useState(false);
  

  

  
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

  // Delete event function
  const handleDeleteEvent = async (eventId) => {
    try {
      await axios.delete(`/api/events/${eventId}`);
      success('Event deleted successfully');
      // Refresh the events list
      await fetchEvents();
    } catch (err) {
      error('Failed to delete event: ' + (err.response?.data?.message || err.message));
    }
  };

  // Fetch events when page, rowsPerPage, or filters change
  useEffect(() => {
    fetchEvents();
    fetchCurrentShift();
  }, [page, rowsPerPage, currentShiftOnly]);

  // Fetch current shift periodically
  useEffect(() => {
    const interval = setInterval(fetchCurrentShift, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);



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

  // Fetch current shift
  const fetchCurrentShift = async () => {
    try {
      const response = await axios.get('/api/shifts/current');
      // currentShift is managed by SocketContext, no need to set it here
      // The socket will update the context when shift changes
    } catch (err) {
      // No active shift is normal, don't show error
      console.log('No active shift found');
    }
  };

  // End current shift
  const handleEndShift = async () => {
    if (!currentShift) {
      error('No active shift found');
      return;
    }

    setEndingShift(true);
    try {
      const response = await axios.post('/api/shifts/end', {
        notes: endShiftNotes.trim()
      });

      if (response.data.success) {
        success('Shift ended successfully');
        setEndShiftDialogOpen(false);
        setEndShiftNotes('');
        // currentShift will update via socket 'shift_update'
        // Refresh events to show the updated list
        await fetchEvents();
      }
    } catch (err) {
      console.error('Error ending shift:', err);
      error('Failed to end shift: ' + (err.response?.data?.message || err.message));
    } finally {
      setEndingShift(false);
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
        isEndOfShift: archiveAsEndOfShift
      });

      if (response.data.success) {
        success(response.data.message);
        setArchiveDialogOpen(false);
        setArchiveName('');
        setArchiveDescription('');
        setArchiveAsEndOfShift(false);
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



  // Start or End shift action
  const handleShiftAction = async () => {
    if (shiftLoading) return;
    setShiftLoading(true);
    try {
      if (currentShift) {
        await axios.post('/api/shifts/end', { notes: '' });
        success('Shift ended successfully');
      } else {
        await axios.post('/api/shifts/start', {});
        success('Shift started successfully');
      }
      // currentShift will update via socket 'shift_update'
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Operation failed';
      if (currentShift) {
        error('Failed to end shift: ' + msg);
      } else {
        error('Failed to start shift: ' + msg);
      }
    } finally {
      setShiftLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Events
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Current shift */}
          {currentShift && (
            <Chip
              label={`Shift: ${currentShift.name}`}
              size="small"
              sx={{ 
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontWeight: 500
              }}
            />
          )}

          {/* Shift countdown timer */}
          <ShiftCountdownTimer />

          {/* Auto-refresh controls */}
          {/* Removed: relocated to TopNavLayout */}
          
          {/* Start/End Shift button */}
          <Button
            size="small"
            variant="contained"
            color={currentShift ? 'warning' : 'success'}
            onClick={handleShiftAction}
            disabled={shiftLoading}
            startIcon={currentShift ? <StopIcon /> : <PlayArrowIcon />}
            sx={{
              color: '#ffffff',
              '&:hover': { opacity: 0.95 }
            }}
          >
            {currentShift ? (shiftLoading ? 'Ending…' : 'End Shift') : (shiftLoading ? 'Starting…' : 'Start Shift')}
          </Button>
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
          onDeleteEvent={handleDeleteEvent}
        />
      </Paper>

      {/* Archive Confirmation Dialog */}
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

      {/* End Shift Dialog */}
      <Dialog
        open={endShiftDialogOpen}
        onClose={() => setEndShiftDialogOpen(false)}
        aria-labelledby="end-shift-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="end-shift-dialog-title">
          End Current Shift
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to end the current shift?
          </DialogContentText>
          {currentShift && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Shift Details:
              </Typography>
              <Typography variant="body2">
                Name: {currentShift.shift_name || currentShift.name}
              </Typography>
              <Typography variant="body2">
                Started: {format(new Date(currentShift.start_time), 'PPpp')}
              </Typography>
              <Typography variant="body2">
                Duration: {Math.round((new Date() - new Date(currentShift.start_time)) / (1000 * 60))} minutes
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="End of Shift Notes (Optional)"
            value={endShiftNotes}
            onChange={(e) => setEndShiftNotes(e.target.value)}
            placeholder="Add any notes about this shift..."
            multiline
            rows={4}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndShiftDialogOpen(false)} disabled={endingShift}>
            Cancel
          </Button>
          <Button 
            onClick={handleEndShift} 
            variant="contained" 
            color="warning"
            disabled={endingShift}
            startIcon={endingShift ? <CircularProgress size={20} /> : <StopIcon />}
          >
            {endingShift ? 'Ending Shift...' : 'End Shift'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventsPage;