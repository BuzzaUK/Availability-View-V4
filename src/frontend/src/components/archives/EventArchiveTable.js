import React, { useContext, useState, useEffect } from 'react';
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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';
import AlertContext from '../../context/AlertContext';

const EventArchiveTable = ({ archives, onRefresh }) => {
  const { error, success } = useContext(AlertContext);
  
  // State for Send Email functionality
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await axios.get('/api/users');
      setUsers(response.data.data || []);
    } catch (err) {
      error('Failed to fetch users: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenEmailDialog = (archive) => {
    // Calculate actual event count from archived_data
    let actualEventCount = 0;
    if (archive.archived_data) {
      if (typeof archive.archived_data === 'string') {
        const parsedData = JSON.parse(archive.archived_data);
        actualEventCount = parsedData.events ? parsedData.events.length : (parsedData.eventCount || parsedData.event_count || 0);
      } else {
        actualEventCount = archive.archived_data.events ? archive.archived_data.events.length : (archive.archived_data.eventCount || archive.archived_data.event_count || 0);
      }
    }
    
    setSelectedArchive(archive);
    setEmailSubject(`Event Archive: ${archive.title}`);
    setEmailMessage(`Please find the event archive "${archive.title}" with ${actualEventCount} events.\n\nDescription: ${archive.description || 'No description'}\n\nCreated: ${format(new Date(archive.created_at), 'MMM dd, yyyy HH:mm')}`);
    setEmailDialogOpen(true);
  };

  const handleCloseEmailDialog = () => {
    setEmailDialogOpen(false);
    setSelectedArchive(null);
    setSelectedUser('');
    setEmailSubject('');
    setEmailMessage('');
  };

  const handleSendEmail = async () => {
    if (!selectedUser || !emailSubject || !emailMessage) {
      error('Please fill in all required fields');
      return;
    }

    try {
      setSendingEmail(true);
      const selectedUserData = users.find(user => user.id === selectedUser);
      
      await axios.post('/api/archives/send-email', {
        archiveId: selectedArchive.id,
        recipientEmail: selectedUserData.email,
        recipientName: selectedUserData.name,
        subject: emailSubject,
        message: emailMessage
      });
      
      success(`Email sent successfully to ${selectedUserData.name} (${selectedUserData.email})`);
      handleCloseEmailDialog();
    } catch (err) {
      error('Failed to send email: ' + (err.response?.data?.message || err.message));
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportCsv = async (archive) => {
    try {
      // Parse archived_data to get events
      let events = [];
      if (archive.archived_data) {
        if (typeof archive.archived_data === 'string') {
          const parsedData = JSON.parse(archive.archived_data);
          events = parsedData.events || [];
        } else {
          events = archive.archived_data.events || [];
        }
      }

      if (events.length === 0) {
        error('No event data found in this archive');
        return;
      }

      // Create CSV content
      const csvHeaders = [
        'Timestamp',
        'Asset Name',
        'Event Type',
        'Previous State',
        'New State',
        'Duration (minutes)',
        'Stop Reason'
      ];

      const csvRows = events.map(event => [
        new Date(event.timestamp).toLocaleString(),
        event.asset_name || 'Unknown',
        event.event_type || '',
        event.previous_state || '',
        event.new_state || '',
        event.duration ? (event.duration / 60000).toFixed(2) : '',
        event.stop_reason || ''
      ]);

      // Convert to CSV format
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${archive.title.replace(/[^a-z0-9]/gi, '_')}_events_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      success(`CSV exported successfully with ${events.length} events`);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      error('Failed to export CSV: ' + (err.message || 'Unknown error'));
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
    <>
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
                  {archive.title}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="textSecondary">
                  {archive.description || 'No description'}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={(() => {
                    // Calculate actual event count from archived_data
                    if (archive.archived_data) {
                      if (typeof archive.archived_data === 'string') {
                        const parsedData = JSON.parse(archive.archived_data);
                        return parsedData.events ? parsedData.events.length : (parsedData.eventCount || parsedData.event_count || 0);
                      } else {
                        return archive.archived_data.events ? archive.archived_data.events.length : (archive.archived_data.eventCount || archive.archived_data.event_count || 0);
                      }
                    }
                    return 0;
                  })()} 
                  color="primary" 
                  variant="outlined" 
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(archive.created_at), 'MMM dd, yyyy HH:mm')}
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
                  <Tooltip title="Send email with archive details">
                    <IconButton
                      color="info"
                      onClick={() => handleOpenEmailDialog(archive)}
                      size="small"
                    >
                      <EmailIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Export events as CSV">
                    <IconButton
                      color="primary"
                      onClick={() => handleExportCsv(archive)}
                      size="small"
                    >
                      <DownloadIcon />
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
    
    {/* Send Email Dialog */}
    <Dialog open={emailDialogOpen} onClose={handleCloseEmailDialog} maxWidth="md" fullWidth>
      <DialogTitle>Send Email - {selectedArchive?.title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Select User</InputLabel>
            <Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              label="Select User"
              disabled={loadingUsers}
            >
              {loadingUsers ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading users...
                </MenuItem>
              ) : (
                users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            variant="outlined"
          />
          
          <TextField
            fullWidth
            label="Message"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            variant="outlined"
            multiline
            rows={6}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseEmailDialog} disabled={sendingEmail}>
          Cancel
        </Button>
        <Button 
          onClick={handleSendEmail} 
          variant="contained" 
          disabled={sendingEmail || !selectedUser || !emailSubject || !emailMessage}
          startIcon={sendingEmail ? <CircularProgress size={20} /> : <EmailIcon />}
        >
          {sendingEmail ? 'Sending...' : 'Send Email'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default EventArchiveTable;