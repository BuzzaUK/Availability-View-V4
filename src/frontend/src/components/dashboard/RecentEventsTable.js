import React from 'react';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { format } from 'date-fns';

// Styled table row
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

// Helper function to format duration in hours:minutes:seconds
const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '00:00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
};

// Get event type chip style
const getEventTypeChip = (eventType) => {
  switch (eventType) {
    case 'STATE_CHANGE':
      return { label: 'State Change', color: 'primary' };
    case 'SHIFT':
      return { label: 'Shift', color: 'secondary' };
    case 'SHIFT_START':
      return { label: 'Shift Start', color: 'success' };
    case 'SHIFT_END':
      return { label: 'Shift End', color: 'error' };
    case 'MICRO_STOP':
      return { label: 'Micro Stop', color: 'warning' };
    case 'MAINTENANCE':
      return { label: 'Maintenance', color: 'info' };
    default:
      return { label: eventType, color: 'default' };
  }
};

// Get state chip style
const getStateChip = (state) => {
  switch (state) {
    case 'RUNNING':
      return { label: 'Running', color: 'success' };
    case 'STOPPED':
      return { label: 'Stopped', color: 'error' };
    case 'WARNING':
      return { label: 'Warning', color: 'warning' };
    case 'IDLE':
      return { label: 'Idle', color: 'default' };
    default:
      return { label: state || 'N/A', color: 'default' };
  }
};

const RecentEventsTable = ({ events, loading }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">No events found.</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="recent events table">
        <TableHead>
          <TableRow>
            <TableCell>Timestamp</TableCell>
            <TableCell>Asset</TableCell>
            <TableCell>Event Type</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.map((event) => {
            const eventTypeChip = getEventTypeChip(event.eventType);
            const stateChip = getStateChip(event.state);
            
            return (
              <StyledTableRow key={event._id}>
                <TableCell component="th" scope="row">
                  {format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                </TableCell>
                <TableCell>{event.asset?.name || 'N/A'}</TableCell>
                <TableCell>
                  <Chip 
                    label={eventTypeChip.label} 
                    color={eventTypeChip.color} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  {event.state && (
                    <Chip 
                      label={stateChip.label} 
                      color={stateChip.color} 
                      size="small" 
                    />
                  )}
                </TableCell>
                <TableCell>{formatDuration(event.duration)}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {event.notes || '-'}
                  </Typography>
                </TableCell>
              </StyledTableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RecentEventsTable;