import React, { useState, useEffect, useContext, useCallback } from 'react';
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
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';

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

import api from '../../services/api';

// Styled components
const FiltersContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const EventsPage = () => {
  const { assets, currentShift } = useContext(SocketContext);
  const { error, success } = useContext(AlertContext);
  const { settings } = useContext(SettingsContext);
  
  // Safe format helpers
  const safeFormat = (value, fmt) => {
    if (!value) return 'N/A';
    try {
      const date = typeof value === 'string' ? new Date(value) : value;
      if (!(date instanceof Date) || isNaN(date.getTime())) return 'N/A';
      return format(date, fmt);
    } catch {
      return 'N/A';
    }
  };

  const toDateOrNull = (value) => {
    if (!value) return null;
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };
  
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
  
  // Removed: State for current shift filtering
  
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
  const fetchEvents = useCallback(async () => {
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
      
      const response = await api.get('/events', { params });
      
      setEvents(response.data.events);
      setTotalEvents(response.data.total);
    } catch (err) {
      error('Failed to fetch events: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters, error]);

  // Delete event function
  const handleDeleteEvent = async (eventId) => {
    try {
      await api.delete(`/events/${eventId}`);
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
  }, [page, rowsPerPage, fetchEvents]);

  // Fetch current shift periodically
  useEffect(() => {
    const interval = setInterval(fetchCurrentShift, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh events based on settings
  useEffect(() => {
    if (settings?.autoRefresh && settings?.refreshInterval) {
      console.log('🔄 EventsPage: Setting up auto-refresh with interval:', settings.refreshInterval, 'seconds');
      const interval = setInterval(() => {
        console.log('🔄 EventsPage: Auto-refreshing events at:', new Date().toISOString());
        fetchEvents();
      }, settings.refreshInterval * 1000); // Convert seconds to milliseconds
      
      return () => {
        console.log('🔄 EventsPage: Clearing auto-refresh interval');
        clearInterval(interval);
      };
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
      
      const response = await api.get('/events/export', { 
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
      const response = await api.get('/shifts/current');
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
      const response = await api.post('/shifts/end', {
        notes: endShiftNotes.trim()
      });

      if (response.data.success) {
        success('Shift ended successfully');
        setEndShiftNotes('');
        setArchiveDialogOpen(false);
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
      const response = await api.post('/events/archive', {
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
        setEndShiftNotes('');
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
        await api.post('/shifts/end', { notes: '' });
        success('Shift ended successfully');
      } else {
        await api.post('/shifts/start', {});
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
          
          {/* Start Shift button - only show when no active shift */}
          {!currentShift && (
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={handleShiftAction}
              disabled={shiftLoading}
              startIcon={<PlayArrowIcon />}
              sx={{
                color: '#ffffff',
                '&:hover': { opacity: 0.95 }
              }}
            >
              {shiftLoading ? 'Starting…' : 'Start Shift'}
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={toggleFilters}
            sx={{ mr: 1 }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Tooltip title="Archive events and manage shift operations" arrow>
            <span>
              <Button
                variant="outlined"
                startIcon={<ArchiveIcon />}
                onClick={() => setArchiveDialogOpen(true)}
                disabled={loading || events.length === 0}
                sx={{ mr: 1 }}
              >
                Archive & Shift
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Export current events as CSV file" arrow>
            <span>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportEvents}
                disabled={loading}
              >
                SNAPSHOT
              </Button>
            </span>
          </Tooltip>
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
                    startDate: toDateOrNull(e.target.value) 
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
                    endDate: toDateOrNull(e.target.value) 
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
          onDeleteEvent={handleDeleteEvent}
        />
      </Paper>

      {/* Archive & Shift Management Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        aria-labelledby="archive-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="archive-dialog-title">
          Archive Events & Shift Management
        </DialogTitle>
        <DialogContent>
          {/* Archive Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArchiveIcon color="primary" />
              Archive Events ({events.length} events)
            </Typography>
            <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
              Save current events to the archive for long-term storage and historical reference. 
              Archived events can be accessed from the Archive Management page.
            </DialogContentText>
            <TextField
              fullWidth
              label="Archive Name"
              value={archiveName}
              onChange={(e) => setArchiveName(e.target.value)}
              placeholder={`Events Archive - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`}
              sx={{ mb: 2 }}
              helperText="Provide a descriptive name for this archive"
            />
            <TextField
              fullWidth
              label="Description (Optional)"
              value={archiveDescription}
              onChange={(e) => setArchiveDescription(e.target.value)}
              placeholder={`Archived ${events.length} events from ${currentShift ? currentShift.name : 'current session'}`}
              multiline
              rows={2}
              sx={{ mb: 2 }}
              helperText="Add details about what this archive contains"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Shift Management Section */}
          {currentShift && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <StopIcon color="warning" />
                End Current Shift
              </Typography>
              <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
                End the current shift and finalize all shift-related operations. This will conclude the shift workflow and update shift records.
              </DialogContentText>
              
              {/* Current Shift Info */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Current Shift Details:
                </Typography>
                <Typography variant="body2">
                  Name: {currentShift.shift_name || currentShift.name}
                </Typography>
                <Typography variant="body2">
                  Started: {safeFormat(currentShift.start_time, 'PPpp')}
                </Typography>
                <Typography variant="body2">
                  {(() => {
                    const d = toDateOrNull(currentShift.start_time);
                    if (!d) return 'Duration: N/A';
                    const mins = Math.round((Date.now() - d.getTime()) / (1000 * 60));
                    return `Duration: ${mins} minutes`;
                  })()}
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="End of Shift Notes (Optional)"
                value={endShiftNotes}
                onChange={(e) => setEndShiftNotes(e.target.value)}
                placeholder="Add any notes about this shift..."
                multiline
                rows={2}
                variant="outlined"
                sx={{ mb: 2 }}
                helperText="Document any important information about this shift"
              />
            </Box>
          )}

          {/* Combined Options */}
          <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'info.main' }}>
              💡 Quick Actions:
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={archiveAsEndOfShift}
                  onChange={(e) => setArchiveAsEndOfShift(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    End of Shift Archive
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Clear events from active list after archiving (recommended for shift transitions)
                  </Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => {
              setArchiveDialogOpen(false);
              setArchiveName('');
              setArchiveDescription('');
              setArchiveAsEndOfShift(false);
              setEndShiftNotes('');
            }} 
            disabled={archiving || endingShift}
          >
            Cancel
          </Button>
          
          {/* Archive Only Button */}
          <Button 
            onClick={handleArchiveEvents} 
            variant="outlined" 
            color="primary"
            disabled={archiving || endingShift || !archiveName.trim()}
            startIcon={archiving ? <CircularProgress size={20} /> : <ArchiveIcon />}
          >
            {archiving ? 'Archiving...' : 'Archive Only'}
          </Button>
          
          {/* End Shift Only Button */}
          {currentShift && (
            <Button 
              onClick={handleEndShift} 
              variant="outlined" 
              color="warning"
              disabled={archiving || endingShift}
              startIcon={endingShift ? <CircularProgress size={20} /> : <StopIcon />}
            >
              {endingShift ? 'Ending Shift...' : 'End Shift Only'}
            </Button>
          )}
          
          {/* Combined Action Button */}
          {currentShift && (
            <Button 
              onClick={async () => {
                if (archiveName.trim()) {
                  await handleArchiveEvents();
                }
                if (!archiving) {
                  await handleEndShift();
                }
              }} 
              variant="contained" 
              color="primary"
              disabled={archiving || endingShift || !archiveName.trim()}
              startIcon={(archiving || endingShift) ? <CircularProgress size={20} /> : <ArchiveIcon />}
            >
              {(archiving || endingShift) ? 'Processing...' : 'Archive & End Shift'}
            </Button>
          )}
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default EventsPage;