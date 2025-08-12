import React, { useContext } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';
import AlertContext from '../../context/AlertContext';

const EventArchiveTable = ({ archives, onRefresh }) => {
  const { error, success } = useContext(AlertContext);

  const handleRestore = async (archiveId) => {
    try {
      const response = await axios.post(`/api/events/archives/${archiveId}/restore`);
      
      if (response.data.success) {
        success(response.data.message);
        onRefresh(); // Refresh the archives list
      }
    } catch (err) {
      error('Failed to restore archive: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (archiveId) => {
    if (window.confirm('Are you sure you want to permanently delete this archive?')) {
      try {
        const response = await axios.delete(`/api/events/archives/${archiveId}`);
        
        if (response.data.success) {
          success(response.data.message);
          onRefresh(); // Refresh the archives list
        }
      } catch (err) {
        error('Failed to delete archive: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const formatFilters = (filters) => {
    if (!filters || Object.keys(filters).length === 0) {
      return 'No filters applied';
    }

    const filterStrings = [];
    
    if (filters.asset) filterStrings.push(`Asset: ${filters.asset}`);
    if (filters.eventType) filterStrings.push(`Type: ${filters.eventType}`);
    if (filters.state) filterStrings.push(`State: ${filters.state}`);
    if (filters.search) filterStrings.push(`Search: "${filters.search}"`);
    if (filters.startDate) filterStrings.push(`From: ${format(new Date(filters.startDate), 'MMM dd, yyyy')}`);
    if (filters.endDate) filterStrings.push(`To: ${format(new Date(filters.endDate), 'MMM dd, yyyy')}`);

    return filterStrings.join(', ');
  };

  if (!archives || archives.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="textSecondary">
          No event archives found
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Create archives from the Events page to see them here
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Archive Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="center">Event Count</TableCell>
            <TableCell>Created Date</TableCell>
            <TableCell>Filters Applied</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {archives.map((archive) => (
            <TableRow key={archive.id}>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  {archive.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="textSecondary">
                  {archive.description || 'No description'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={archive.eventCount} 
                  color="primary" 
                  variant="outlined" 
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(archive.createdAt), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title={formatFilters(archive.filters)} arrow>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" color="textSecondary">
                      {archive.filters && Object.keys(archive.filters).length > 0 
                        ? `${Object.keys(archive.filters).length} filter(s)` 
                        : 'No filters'
                      }
                    </Typography>
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Tooltip title="Restore events to main table">
                    <IconButton
                      color="primary"
                      onClick={() => handleRestore(archive.id)}
                      size="small"
                    >
                      <RestoreIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete archive permanently">
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(archive.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EventArchiveTable;