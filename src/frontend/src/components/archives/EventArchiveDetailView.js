import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

// Styled components
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const EventArchiveDetailView = ({ archive, open, onClose }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);

  useEffect(() => {
    if (archive && open) {
      parseArchiveData();
    }
  }, [archive, open]);

  const parseArchiveData = () => {
    setLoading(true);
    try {
      let parsedData;
      if (typeof archive.archived_data === 'string') {
        parsedData = JSON.parse(archive.archived_data);
      } else {
        parsedData = archive.archived_data;
      }
      
      const archiveEvents = parsedData.events || [];
      // Sort events by timestamp (newest first)
      const sortedEvents = archiveEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setEvents(sortedEvents);
    } catch (error) {
      console.error('Error parsing archive data:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewEventDetails = (event) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };

  const handleExportCsv = () => {
    if (!events || events.length === 0) {
      alert('No events to export');
      return;
    }

    const headers = [
      'Timestamp',
      'Asset Name',
      'Event Type',
      'Previous State',
      'New State',
      'Duration (minutes)',
      'Description'
    ];

    const csvRows = [headers.join(',')];

    events.forEach(event => {
      const row = [
        formatTimestamp(event.timestamp),
        `"${event.asset_name || 'Unknown'}"`,
        event.event_type || '',
        event.previous_state || '',
        event.new_state || '',
        event.duration_minutes || '',
        `"${event.description || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${archive.title}_events.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper functions
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getEventTypeColor = (eventType) => {
    switch (eventType) {
      case 'STATE_CHANGE':
        return 'primary';
      case 'SHIFT':
      case 'SHIFT_START':
      case 'SHIFT_END':
        return 'secondary';
      case 'MICRO_STOP':
        return 'warning';
      case 'MAINTENANCE':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'RUNNING':
        return 'success';
      case 'STOPPED':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'IDLE':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatEventType = (eventType) => {
    if (!eventType) return 'N/A';
    return eventType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const totalMinutes = Math.floor(minutes);
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  // Get paginated events
  const paginatedEvents = events.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Archive Details: {archive?.title}
            </Typography>
            <Box>
              <Tooltip title="Export CSV">
                <IconButton onClick={handleExportCsv} sx={{ mr: 1 }}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {archive?.description} • {events.length} events
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : events.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">No events found in this archive</Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Asset</TableCell>
                      <TableCell>Event Type</TableCell>
                      <TableCell>Previous State</TableCell>
                      <TableCell>New State</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedEvents.map((event, index) => (
                      <StyledTableRow key={`${event.id || index}-${event.timestamp}`}>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTimestamp(event.timestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {event.asset_name || 'Unknown Asset'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={formatEventType(event.event_type)} 
                            color={getEventTypeColor(event.event_type)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {event.previous_state ? (
                            <Chip 
                              label={event.previous_state} 
                              color={getStateColor(event.previous_state)}
                              size="small"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">N/A</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {event.new_state ? (
                            <Chip 
                              label={event.new_state} 
                              color={getStateColor(event.new_state)}
                              size="small"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">N/A</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDuration(event.duration_minutes)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{
                              maxWidth: 200,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {event.description || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewEventDetails(event)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={events.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog
        open={eventDetailOpen}
        onClose={() => setEventDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Event Details
          <IconButton
            onClick={() => setEventDetailOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedEvent.asset_name || 'Unknown Asset'}
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body1">{formatTimestamp(selectedEvent.timestamp)}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Event Type</Typography>
                  <Chip 
                    label={formatEventType(selectedEvent.event_type)} 
                    color={getEventTypeColor(selectedEvent.event_type)}
                    size="small"
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Previous State</Typography>
                  {selectedEvent.previous_state ? (
                    <Chip 
                      label={selectedEvent.previous_state} 
                      color={getStateColor(selectedEvent.previous_state)}
                      size="small"
                      variant="outlined"
                    />
                  ) : (
                    <Typography variant="body1">N/A</Typography>
                  )}
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">New State</Typography>
                  {selectedEvent.new_state ? (
                    <Chip 
                      label={selectedEvent.new_state} 
                      color={getStateColor(selectedEvent.new_state)}
                      size="small"
                    />
                  ) : (
                    <Typography variant="body1">N/A</Typography>
                  )}
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                  <Typography variant="body1">{formatDuration(selectedEvent.duration_minutes)}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Asset ID</Typography>
                  <Typography variant="body1">{selectedEvent.asset_id || 'N/A'}</Typography>
                </Box>
              </Box>
              
              {selectedEvent.description && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {selectedEvent.description}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EventArchiveDetailView;