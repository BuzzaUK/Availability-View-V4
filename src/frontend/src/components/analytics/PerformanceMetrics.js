import React from 'react';
import { styled } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Styled components - removed theme dependency
const MetricCard = styled(Paper)(() => ({
  padding: '24px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const CircularProgressWithLabel = (props) => {
  const { color, ...rest } = props;
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        size={80}
        thickness={5}
        {...rest}
        sx={{
          color: color || '#1976d2',
          ...props.sx,
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
        <Typography variant="caption" component="div" color="text.secondary" sx={{ fontSize: '1rem' }}>
          {`${Math.round(props.value)}%`}
        </Typography>
      </Box>
    </Box>
  );
};

const LinearProgressWithLabel = (props) => {
  const { color, ...rest } = props;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress
          variant="determinate"
          {...rest}
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              backgroundColor: color || '#1976d2',
            },
            ...props.sx,
          }}
        />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
};

const TrendIndicator = ({ current, previous, inverse = false }) => {
  if (!previous) return null;
  
  const diff = current - previous;
  const percentage = previous !== 0 ? (diff / previous) * 100 : 0;
  
  // If inverse is true, a negative trend is good (e.g., for downtime)
  const isPositive = inverse ? diff < 0 : diff > 0;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
      {isPositive ? (
        <TrendingUpIcon fontSize="small" sx={{ mr: 0.5, color: '#4caf50' }} />
      ) : (
        <TrendingDownIcon fontSize="small" sx={{ mr: 0.5, color: '#f44336' }} />
      )}
      <Typography 
        variant="body2" 
        sx={{ color: isPositive ? '#4caf50' : '#f44336' }}
      >
        {Math.abs(percentage).toFixed(1)}% {isPositive ? 'increase' : 'decrease'} from previous period
      </Typography>
    </Box>
  );
};

const PerformanceMetrics = ({ metrics, loading }) => {
  // Helper function to format duration
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return '0h 0m';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item}>
            <MetricCard>
              <Skeleton variant="text" width="60%" height={30} />
              <Skeleton variant="text" width="40%" height={24} />
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <Skeleton variant="circular" width={80} height={80} />
              </Box>
              <Skeleton variant="text" width="100%" height={24} />
            </MetricCard>
          </Grid>
        ))}
      </Grid>
    );
  }

  // Render empty state
  if (!metrics) {
    return null;
  }

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {/* OEE Metric */}
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SpeedIcon sx={{ mr: 1, color: '#1976d2' }} />
            <Typography variant="h6" component="div">
              OEE
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CircularProgressWithLabel 
              value={metrics.oee * 100} 
              color="#1976d2" 
            />
          </Box>
          <Box sx={{ mt: 'auto' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Components: A × P × Q
            </Typography>
            <LinearProgressWithLabel value={metrics.availability * 100} color="#2196f3" sx={{ mb: 1 }} />
            <LinearProgressWithLabel value={metrics.performance * 100} color="#4caf50" sx={{ mb: 1 }} />
            <LinearProgressWithLabel value={metrics.quality * 100} color="#ff9800" />
            <TrendIndicator current={metrics.oee} previous={metrics.previousOee} />
          </Box>
        </MetricCard>
      </Grid>

      {/* Runtime Metric */}
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AccessTimeIcon sx={{ mr: 1, color: '#4caf50' }} />
            <Typography variant="h6" component="div">
              Runtime
            </Typography>
          </Box>
          <Typography variant="h4" component="div" sx={{ textAlign: 'center', my: 2 }}>
            {formatDuration(metrics.runtime)}
          </Typography>
          <Box sx={{ mt: 'auto' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Percentage of Total Time
            </Typography>
            <LinearProgressWithLabel 
              value={(metrics.runtime / (metrics.runtime + metrics.downtime)) * 100} 
              color="#4caf50" 
            />
            <TrendIndicator current={metrics.runtime} previous={metrics.previousRuntime} />
          </Box>
        </MetricCard>
      </Grid>

      {/* Downtime Metric */}
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BuildIcon sx={{ mr: 1, color: '#f44336' }} />
            <Typography variant="h6" component="div">
              Downtime
            </Typography>
          </Box>
          <Typography variant="h4" component="div" sx={{ textAlign: 'center', my: 2 }}>
            {formatDuration(metrics.downtime)}
          </Typography>
          <Box sx={{ mt: 'auto' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Percentage of Total Time
            </Typography>
            <LinearProgressWithLabel 
              value={(metrics.downtime / (metrics.runtime + metrics.downtime)) * 100} 
              color="#f44336" 
            />
            <TrendIndicator current={metrics.downtime} previous={metrics.previousDowntime} inverse={true} />
          </Box>
        </MetricCard>
      </Grid>

      {/* MTBF Metric */}
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CheckCircleIcon sx={{ mr: 1, color: '#2196f3' }} />
            <Typography variant="h6" component="div">
              MTBF
            </Typography>
          </Box>
          <Typography variant="h4" component="div" sx={{ textAlign: 'center', my: 2 }}>
            {formatDuration(metrics.mtbf)}
          </Typography>
          <Box sx={{ mt: 'auto' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Mean Time Between Failures
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2">
                Total Stops: {metrics.stops}
              </Typography>
              <Typography variant="body2">
                Avg. Duration: {formatDuration(metrics.mttr)}
              </Typography>
            </Box>
            <TrendIndicator current={metrics.mtbf} previous={metrics.previousMtbf} />
          </Box>
        </MetricCard>
      </Grid>
    </Grid>
  );
};

export default PerformanceMetrics;