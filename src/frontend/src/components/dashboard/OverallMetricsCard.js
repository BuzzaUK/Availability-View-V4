import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Grid';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorIcon from '@mui/icons-material/Error';
import SpeedIcon from '@mui/icons-material/Speed';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

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

// Custom circular progress with label
const CircularProgressWithLabel = (props) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress 
        variant="determinate" 
        {...props} 
        size={80} 
        thickness={4} 
        sx={{ 
          color: props.value >= 80 ? '#4caf50' : props.value >= 60 ? '#ff9800' : '#f44336',
        }} 
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h6"
          component="div"
          color="text.secondary"
          sx={{ fontWeight: 'bold' }}
        >
          {`${Math.round(props.value)}%`}
        </Typography>
      </Box>
    </Box>
  );
};

const OverallMetricsCard = ({ metrics, loading }) => {
  // Default values if metrics are not available
  const availability = metrics?.availability || 0;
  const runtime = metrics?.runtime || 0;
  const downtime = metrics?.downtime || 0;
  const stops = metrics?.stops || 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          Overall Performance
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Availability
              </Typography>
              <CircularProgressWithLabel value={availability} />
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <AccessTimeIcon sx={{ fontSize: 32, mb: 1, color: '#1976d2' }} />
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Runtime
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatDuration(runtime)}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <ErrorIcon sx={{ fontSize: 32, mb: 1, color: '#f44336' }} />
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Downtime
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatDuration(downtime)}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <ReportProblemIcon sx={{ fontSize: 32, mb: 1, color: '#ff9800' }} />
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Stops
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {stops}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OverallMetricsCard;