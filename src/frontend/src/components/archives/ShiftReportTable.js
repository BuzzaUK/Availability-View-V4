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
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
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

const ShiftReportTable = ({ reports }) => {
  const { assets } = useContext(SocketContext);
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);

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
- Start Time: ${format(new Date(report.start_time), 'PPpp')}
- End Time: ${format(new Date(report.end_time), 'PPpp')}
- Duration: ${Math.round(report.duration / 60000)} minutes
- Status: ${report.status}

Metrics:
- Availability: ${(report.availability * 100).toFixed(1)}%
- Performance: ${(report.performance * 100).toFixed(1)}%
- Quality: ${(report.quality * 100).toFixed(1)}%
- OEE: ${(report.oee * 100).toFixed(1)}%
- Runtime: ${report.runtime} minutes
- Downtime: ${report.downtime} minutes
- Total Stops: ${report.stops}

Data Summary:
- Events Processed: ${report.events_processed}
- Assets Analyzed: ${report.assets_analyzed}

Generated on: ${format(new Date(), 'PPpp')}
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

  // Format duration helper
  const formatDuration = (milliseconds) => {
    const minutes = Math.round(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
  };

  // Helper function to get asset name by ID
  const getAssetName = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'All Assets';
  };

  // Helper function to format percentage
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
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
              <TableCell>Duration</TableCell>
              <TableCell>Availability</TableCell>
              <TableCell>Performance</TableCell>
              <TableCell>Quality</TableCell>
              <TableCell>OEE</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {safeReports.map((report) => (
              <StyledTableRow key={report.id || report._id}>
                <TableCell component="th" scope="row">
                  {report.name || report.title || 'Unnamed Shift'}
                </TableCell>
                <TableCell>All Assets</TableCell>
                <TableCell>
                  {report.start_time ? format(new Date(report.start_time), 'yyyy-MM-dd HH:mm') : 'N/A'}
                </TableCell>
                <TableCell>
                  {report.end_time 
                    ? format(new Date(report.end_time), 'yyyy-MM-dd HH:mm')
                    : 'Ongoing'}
                </TableCell>
                <TableCell>{formatDuration(report.duration)}</TableCell>
                <TableCell>{formatPercentage(report.availability)}</TableCell>
                <TableCell>{formatPercentage(report.performance)}</TableCell>
                <TableCell>{formatPercentage(report.quality)}</TableCell>
                <TableCell>{formatPercentage(report.oee)}</TableCell>
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
                  <Tooltip title="Export PDF">
                    <IconButton 
                      size="small"
                      onClick={() => handleExportPDF(report)}
                    >
                      <PictureAsPdfIcon fontSize="small" />
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
                  {format(new Date(selectedReport.start_time), 'PPpp')}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  End Time
                </Typography>
                <Typography variant="body1">
                  {format(new Date(selectedReport.end_time), 'PPpp')}
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
                  Quality
                </Typography>
                <Typography variant="body1">
                  {(selectedReport.quality * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Overall Equipment Effectiveness (OEE)
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {(selectedReport.oee * 100).toFixed(1)}%
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
                      {selectedReport.runtime}m
                    </Typography>
                    <Typography variant="body2" color="success.contrastText">
                      Runtime
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="error.contrastText">
                      {selectedReport.downtime}m
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
    </>
  );
};

export default ShiftReportTable;