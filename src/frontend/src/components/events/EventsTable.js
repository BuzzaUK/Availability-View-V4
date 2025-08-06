import React, { useContext } from 'react';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TableFooter from '@mui/material/TableFooter';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format } from 'date-fns';

// Context
import SocketContext from '../../context/SocketContext';

// Styled components
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const EventsTable = ({ 
  events, 
  loading, 
  page, 
  rowsPerPage, 
  totalEvents, 
  handleChangePage, 
  handleChangeRowsPerPage 
}) => {
  const { assets } = useContext(SocketContext);

  // Helper function to get asset name by ID
  const getAssetName = (assetId) => {
    const asset = assets.find(a => a._id === assetId);
    return asset ? asset.name : 'Unknown Asset';
  };

  // Helper function to format duration
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Helper function to get color for event type
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

  // Helper function to get color for state
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

  // Helper function to format event type for display
  const formatEventType = (eventType) => {
    if (!eventType) return 'N/A';
    
    return eventType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Render loading state
  if (loading && events.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render empty state
  if (events.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">No events found</Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="events table">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Asset</TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <StyledTableRow key={event._id}>
                <TableCell component="th" scope="row">
                  {format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                </TableCell>
                <TableCell>{getAssetName(event.assetId)}</TableCell>
                <TableCell>
                  <Chip 
                    label={formatEventType(event.eventType)} 
                    color={getEventTypeColor(event.eventType)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {event.state ? (
                    <Chip 
                      label={event.state} 
                      color={getStateColor(event.state)}
                      size="small"
                    />
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>{formatDuration(event.duration)}</TableCell>
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
                    {event.notes || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton size="small">
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
        count={totalEvents}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </>
  );
};

export default EventsTable;