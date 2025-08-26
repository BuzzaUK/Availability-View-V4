import React, { useContext } from 'react';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import api from '../../services/api';

// Context
import SettingsContext from '../../context/SettingsContext';


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

const ShiftReportTable = ({ reports, onRefresh }) => {
  const { settings } = useContext(SettingsContext);
  const { dateFormat } = settings;
  const correctedDateFormat = dateFormat.replace('DD', 'dd').replace('YYYY', 'yyyy');
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [reportToDelete, setReportToDelete] = React.useState(null);

  // Ensure reports is always an array
  const safeReports = Array.isArray(reports) ? reports : [];

  // Handler for viewing report details
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setViewModalOpen(true);
  };

  // Handler for closing view modal
  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setSelectedReport(null);
  };

  // Handler for exporting report as PDF
  const handleExportPDF = (report) => {
    // Create a simple text-based PDF content
    const pdfContent = `
Shift Report: ${report.title}

Report Details:
- Start Time: ${format(new Date(report.start_time), `${correctedDateFormat} p`)}
- End Time: ${format(new Date(report.end_time), `${correctedDateFormat} p`)}
- Duration: ${Math.round(report.duration / 60000)} minutes
- Status: ${report.status}

Metrics:
- Availability: ${(report.availability * 100).toFixed(1)}%
- Performance: ${(report.performance * 100).toFixed(1)}%
- Runtime: ${report.runtime} minutes
- Downtime: ${report.downtime} minutes
- Total Stops: ${report.stops}

Data Summary:
- Events Processed: ${report.events_processed}
- Assets Analyzed: ${report.assets_analyzed}

Generated on: ${format(new Date(), `${correctedDateFormat} p`)}
    `;

    // Create and download the file
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shift-report-${report.id}-${format(new Date(report.start_time), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Handler for delete confirmation
  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setDeleteConfirmOpen(true);
  };

  // Handler for confirming delete
  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;

    try {
      const response = await api.delete(`/archives/${reportToDelete.id}`);
      
      if (response.data.success) {
        // Close confirmation dialog
        setDeleteConfirmOpen(false);
        setReportToDelete(null);
        
        // Refresh the reports list if onRefresh callback is provided
        if (onRefresh) {
          onRefresh();
        }
        
        // You could add a success notification here if you have a notification system
        console.log('Report deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      // You could add an error notification here if you have a notification system
      alert('Failed to delete report: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handler for canceling delete
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setReportToDelete(null);
  };

  // Format duration helper
  const formatDuration = (milliseconds) => {
    if (milliseconds === undefined || milliseconds === null) return 'N/A';
    const totalMinutes = Math.round(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatMinutes = (minutes) => {
    if (minutes === undefined || minutes === null) return 'N/A';
    const totalMinutes = Math.round(minutes);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Helper function to format percentage
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatShiftTitle = (report) => {
    const startTimeFormatted = report.start_time
      ? `${format(new Date(report.start_time), correctedDateFormat)}, ${format(new Date(report.start_time), 'p')}`
      : 'N/A';
    const endTimeFormatted = report.end_time ? format(new Date(report.end_time), 'p') : 'Ongoing';
    return `Shift Report - Shift ${report.id} - ${startTimeFormatted} - ${endTimeFormatted}`;
  };

  // Render empty state
  if (safeReports.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">No shift reports found</Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="shift reports table">
          <TableHead>
            <TableRow>
              <TableCell>Shift</TableCell>
              <TableCell>Asset</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>End Time</TableCell>
              <TableCell>Run Time</TableCell>
              <TableCell>Downtime</TableCell>
              <TableCell>Availability</TableCell>
              <TableCell>Performance</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {safeReports.map((report) => (
              <StyledTableRow key={report.id || report._id}>
                <TableCell component="th" scope="row">
                  {formatShiftTitle(report)}
                </TableCell>
                <TableCell>All Assets</TableCell>
                <TableCell>
                  {report.start_time ? format(new Date(report.start_time), correctedDateFormat) : 'N/A'}
                </TableCell>
                <TableCell>
                  {report.end_time 
                    ? format(new Date(report.end_time), correctedDateFormat)
                    : 'Ongoing'}
                </TableCell>
                <TableCell>{formatMinutes(report.run_time)}</TableCell>
                <TableCell>{formatMinutes(report.downtime)}</TableCell>
                <TableCell>{formatPercentage(report.availability)}</TableCell>
                <TableCell>{formatPercentage(report.performance)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small" 
                      sx={{ mr: 1 }}
                      onClick={() => handleViewReport(report)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Report">
                    <IconButton 
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(report)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Report Details Modal */}
      <Dialog open={viewModalOpen} onClose={handleCloseViewModal} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="div">
            {selectedReport?.title}
          </Typography>
        </DialogTitle>
        <DialogContent>
        {selectedReport && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                Report Information
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Start Time
                </Typography>
                <Typography variant="body1">
                  {format(new Date(selectedReport.start_time), `${correctedDateFormat} p`)}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  End Time
                </Typography>
                <Typography variant="body1">
                  {format(new Date(selectedReport.end_time), `${correctedDateFormat} p`)}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1">
                  {formatDuration(selectedReport.duration)}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={selectedReport.status} 
                  color={selectedReport.status === 'COMPLETED' ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                Performance Metrics
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Availability
                </Typography>
                <Typography variant="body1">
                  {(selectedReport.availability * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Performance
                </Typography>
                <Typography variant="body1">
                  {(selectedReport.performance * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Runtime
                </Typography>
                <Typography variant="body1">
                  {formatMinutes(selectedReport.run_time)}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Downtime
                </Typography>
                <Typography variant="body1">
                  {formatMinutes(selectedReport.downtime)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Operational Data
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="success.contrastText">
                      {formatMinutes(selectedReport.run_time)}
                    </Typography>
                    <Typography variant="body2" color="success.contrastText">
                      Runtime
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="error.contrastText">
                      {formatMinutes(selectedReport.downtime)}
                    </Typography>
                    <Typography variant="body2" color="error.contrastText">
                      Downtime
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="warning.contrastText">
                      {selectedReport.stops}
                    </Typography>
                    <Typography variant="body2" color="warning.contrastText">
                      Total Stops
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="info.contrastText">
                      {selectedReport.events_processed}
                    </Typography>
                    <Typography variant="body2" color="info.contrastText">
                      Events Processed
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleExportPDF(selectedReport)} startIcon={<PictureAsPdfIcon />}>
            Export Report
          </Button>
          <Button onClick={handleCloseViewModal} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Shift Report
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this shift report? This action cannot be undone.
            {reportToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Report:</strong> {reportToDelete.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Date:</strong> {format(new Date(reportToDelete.start_time), `${correctedDateFormat} p`)}
                </Typography>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShiftReportTable;