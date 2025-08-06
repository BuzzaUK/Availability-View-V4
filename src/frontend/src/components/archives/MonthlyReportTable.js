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
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BarChartIcon from '@mui/icons-material/BarChart';
import { format, parse } from 'date-fns';

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

const MonthlyReportTable = ({ reports }) => {
  const { assets } = useContext(SocketContext);

  // Ensure reports is always an array
  const safeReports = Array.isArray(reports) ? reports : [];

  // Helper function to get asset name by ID
  const getAssetName = (assetId) => {
    const asset = assets.find(a => a._id === assetId);
    return asset ? asset.name : 'All Assets';
  };

  // Helper function to format duration
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else {
      return `${hours}h ${minutes % 60}m`;
    }
  };

  // Helper function to format percentage
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  // Helper function to format month
  const formatMonth = (yearMonth) => {
    // yearMonth is in format 'YYYY-MM'
    const date = parse(yearMonth, 'yyyy-MM', new Date());
    return format(date, 'MMMM yyyy');
  };

  // Render empty state
  if (safeReports.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">No monthly reports found</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="monthly reports table">
        <TableHead>
          <TableRow>
            <TableCell>Month</TableCell>
            <TableCell>Asset</TableCell>
            <TableCell>Runtime</TableCell>
            <TableCell>Downtime</TableCell>
            <TableCell>Stops</TableCell>
            <TableCell>Availability</TableCell>
            <TableCell>Performance</TableCell>
            <TableCell>Quality</TableCell>
            <TableCell>OEE</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {safeReports.map((report) => (
            <StyledTableRow key={report._id}>
              <TableCell component="th" scope="row">
                {formatMonth(report.yearMonth)}
              </TableCell>
              <TableCell>{getAssetName(report.assetId)}</TableCell>
              <TableCell>{formatDuration(report.runtime)}</TableCell>
              <TableCell>{formatDuration(report.downtime)}</TableCell>
              <TableCell>{report.stops}</TableCell>
              <TableCell>{formatPercentage(report.availability)}</TableCell>
              <TableCell>{formatPercentage(report.performance)}</TableCell>
              <TableCell>{formatPercentage(report.quality)}</TableCell>
              <TableCell>{formatPercentage(report.oee)}</TableCell>
              <TableCell align="center">
                <Tooltip title="View Details">
                  <IconButton size="small" sx={{ mr: 1 }}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="View Charts">
                  <IconButton size="small" sx={{ mr: 1 }}>
                    <BarChartIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export PDF">
                  <IconButton size="small">
                    <PictureAsPdfIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MonthlyReportTable;