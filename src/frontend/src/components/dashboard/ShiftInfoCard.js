import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import { format, formatDistanceToNow } from 'date-fns';

const ShiftInfoCard = ({ currentShift }) => {
  // If no shift is active
  if (!currentShift) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Active Shift
            </Typography>
            <Typography variant="body2">
              Start a new shift to begin monitoring production.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Calculate shift duration
  const startTime = new Date(currentShift.startTime);
  const duration = formatDistanceToNow(startTime, { addSuffix: false });

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            Current Shift Information
          </Typography>
          <Chip 
            label="Active" 
            color="success" 
            size="small" 
            sx={{ fontWeight: 'bold' }} 
          />
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarTodayIcon sx={{ mr: 1, color: '#1976d2' }} />
              <Typography variant="body2" color="text.secondary">
                Shift Name:
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight="bold">
              {currentShift.name}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon sx={{ mr: 1, color: '#1976d2' }} />
              <Typography variant="body2" color="text.secondary">
                Started At:
              </Typography>
            </Box>
            <Typography variant="body1">
              {format(startTime, 'yyyy-MM-dd HH:mm:ss')}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon sx={{ mr: 1, color: '#1976d2' }} />
              <Typography variant="body2" color="text.secondary">
                Duration:
              </Typography>
            </Box>
            <Typography variant="body1">
              {duration}
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Notes:
          </Typography>
          <Typography variant="body2">
            {currentShift.notes || 'No notes for this shift.'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ShiftInfoCard;