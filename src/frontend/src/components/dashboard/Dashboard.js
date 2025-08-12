import React, { useState, useEffect, useCallback, useContext } from 'react';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Typography,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import SocketContext from '../../context/SocketContext';
import SettingsContext from '../../context/SettingsContext';
import AuthContext from '../../context/AuthContext';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Styled components
const MetricCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '& .MuiCardContent-root': {
    flexGrow: 1,
    padding: theme.spacing(2.5),
  },
}));

const Dashboard = () => {
  const { assets, events, fetchAllData, loading } = useContext(SocketContext);
  const [showRefreshNotice, setShowRefreshNotice] = useState(false);
  const { settings } = useContext(SettingsContext);
  const { isAuthenticated, token, user } = useContext(AuthContext);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [showDebug, setShowDebug] = useState(false);
  const [assetStates, setAssetStates] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now()); // For real-time calculations
  const navigate = useNavigate();

  // Remove the every-second update effect - we'll only update on auto-refresh

  // Navigate to Analytics with the selected asset pre-filtered
  const handleAnalyticsClick = (assetId) => {
    if (!assetId) return;
    navigate(`/analytics?asset=${encodeURIComponent(assetId)}`);
  };

  // Listen for ESP32 asset state changes
  // Note: Socket functionality will be implemented when needed
  useEffect(() => {
    // Socket connection will be handled by SocketContext
    // This useEffect is reserved for future socket implementation
  }, []);

  // Calculate metrics from real asset data with real-time updates
  const calculateMetrics = useCallback(() => {
    if (!assets || assets.length === 0) {
      return {
        systemAvailability: 0,
        totalRuntime: '00:00:00',
        totalDowntime: '00:00:00',
        totalStops: 0,
        assets: []
      };
    }



    let totalRuntime = 0;
    let totalDowntime = 0;
    let totalStops = 0;
    let runningAssets = 0;
    const now = new Date(currentTime); // Use the state-based current time

    const assetMetrics = assets.map(asset => {
      const currentState = assetStates[asset.name];
      const status = currentState?.state || asset.current_state || 'STOPPED';
      
      if (status === 'RUNNING') {
        runningAssets++;
      }

      // Use accumulated database values (stored in seconds) and convert to milliseconds
      let currentRuntimeMs = (asset.runtime || 0) * 1000; // Convert seconds to milliseconds
      let currentDowntimeMs = (asset.downtime || 0) * 1000; // Convert seconds to milliseconds
      
      // Add time since last state change for real-time display
      if (asset.last_state_change) {
        const lastStateChange = new Date(asset.last_state_change);
        const timeSinceLastChangeMs = Math.max(0, now - lastStateChange);
        
        if (status === 'RUNNING') {
          currentRuntimeMs += timeSinceLastChangeMs;
        } else if (status === 'STOPPED') {
          currentDowntimeMs += timeSinceLastChangeMs;
        }
      }

      totalRuntime += currentRuntimeMs;
      totalDowntime += currentDowntimeMs;
      totalStops += asset.total_stops || 0;

      const totalTime = currentRuntimeMs + currentDowntimeMs;
      const availability = totalTime > 0 ? currentRuntimeMs / totalTime : 0;

      return {
        id: asset.id,
        name: asset.name,
        status: status,
        availability: availability,
        runtime: formatMilliseconds(currentRuntimeMs),
        downtime: formatMilliseconds(currentDowntimeMs),
        runtimeMs: currentRuntimeMs,
        downtimeMs: currentDowntimeMs,
        totalStops: asset.total_stops || 0,
        pin_number: asset.pin_number
      };
    });

    const systemAvailability = assets.length > 0 ? runningAssets / assets.length : 0;

    return {
      systemAvailability,
      totalRuntime: formatMilliseconds(totalRuntime),
      totalDowntime: formatMilliseconds(totalDowntime),
      totalStops,
      assets: assetMetrics
    };
  }, [assets, assetStates, currentTime]);

  const formatMilliseconds = (ms) => {
    if (!ms) return '00:00:00';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const metrics = calculateMetrics();

  // Get status color for asset indicators
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'RUNNING':
        return '#10b981'; // Green
      case 'STOPPED':
        return '#ef4444'; // Red
      default:
        return '#94a3b8'; // Gray
    }
  };

  // Chart helper functions
  const getAvailabilityChartData = (availability) => {
    const availabilityPercent = availability * 100;
    
    return {
      labels: ['Availability'],
      datasets: [
        {
          label: 'Available',
          data: [availabilityPercent],
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // More opaque blue
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }
      ],
    };
  };

  // New function to get the maximum time value for scaling
  const getMaxTimeValue = (runtimeMs, downtimeMs) => {
    return Math.max(runtimeMs, downtimeMs);
  };

  // New function to create runtime chart data
  const getRuntimeChartData = (runtimeMs, maxTimeMs) => {
    const runtimeMinutes = runtimeMs / 60000; // Convert to minutes
    const maxMinutes = maxTimeMs / 60000;
    
    return {
      labels: ['Runtime'],
      datasets: [
        {
          label: 'Runtime',
          data: [runtimeMinutes],
          backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }
      ],
    };
  };

  // New function to create downtime chart data
  const getDowntimeChartData = (downtimeMs, maxTimeMs) => {
    const downtimeMinutes = downtimeMs / 60000; // Convert to minutes
    const maxMinutes = maxTimeMs / 60000;
    
    return {
      labels: ['Downtime'],
      datasets: [
        {
          label: 'Downtime',
          data: [downtimeMinutes],
          backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (context.chart.config.type === 'doughnut') {
              return `${context.parsed.toFixed(1)}%`;
            } else {
              const hours = Math.floor(context.parsed / 60);
              const minutes = Math.floor(context.parsed % 60);
              return `${context.label}: ${hours}h ${minutes}m`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.parsed.toFixed(1)}%`;
          }
        }
      }
    },
    cutout: '70%',
  };

  const availabilityChartOptions = {
    indexAxis: 'y', // This makes it horizontal
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.x.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        display: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          font: {
            size: 10,
          },
          color: '#64748b',
        }
      },
      y: {
        display: false,
      }
    },
    layout: {
      padding: {
        top: 5,
        bottom: 5,
      }
    }
  };

  // Improved chart options for runtime/downtime horizontal bars with better time scaling
  const getTimeChartOptions = (maxTimeMs) => {
    // Determine the best unit and scale based on the maximum time
    let maxValue, unit, stepSize, tickCallback, tooltipCallback;
    
    if (maxTimeMs < 60000) { // Less than 1 minute - use seconds
      maxValue = Math.max(Math.ceil(maxTimeMs / 1000), 10); // Minimum 10 seconds scale
      stepSize = maxValue <= 30 ? 5 : 10; // 5s steps for small values, 10s for larger
      unit = 'seconds';
      tickCallback = function(value) {
        return `${Math.round(value)}s`;
      };
      tooltipCallback = function(context) {
        const value = context.parsed.x;
        return `${context.dataset.label}: ${Math.round(value)}s`;
      };
    } else if (maxTimeMs < 3600000) { // Less than 1 hour - use minutes
      maxValue = Math.max(Math.ceil(maxTimeMs / 60000), 5);
      stepSize = maxValue <= 10 ? 1 : maxValue <= 30 ? 5 : 10; // More granular steps
      unit = 'minutes';
      tickCallback = function(value) {
        return `${Math.round(value)}m`;
      };
      tooltipCallback = function(context) {
        const value = context.parsed.x;
        return `${context.dataset.label}: ${Math.round(value)}m`;
      };
    } else { // 1 hour or more - use hours and minutes
      maxValue = Math.ceil(maxTimeMs / 60000);
      stepSize = maxValue <= 120 ? 15 : 30; // 15min or 30min steps
      unit = 'hours';
      tickCallback = function(value) {
        const hours = Math.floor(value / 60);
        const minutes = Math.floor(value % 60);
        if (hours > 0) {
          return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return `${minutes}m`;
      };
      tooltipCallback = function(context) {
        const value = context.parsed.x;
        const hours = Math.floor(value / 60);
        const minutes = Math.floor(value % 60);
        return `${context.dataset.label}: ${hours}h ${minutes}m`;
      };
    }
    
    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: tooltipCallback
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: maxValue,
          display: true,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.15)',
          },
          ticks: {
            stepSize: stepSize,
            callback: tickCallback,
            font: {
              size: 10,
            },
            color: '#64748b',
            maxTicksLimit: 8, // Limit number of ticks for readability
          }
        },
        y: {
          display: false,
        }
      },
      layout: {
        padding: {
          top: 5,
          bottom: 5,
        }
      }
    };
  };

  // Update countdown when settings change
  useEffect(() => {
    if (settings?.refreshInterval) {
      setRefreshCountdown(settings.refreshInterval);
    }
  }, [settings?.refreshInterval, settings?.autoRefresh]);

  // Auto-refresh countdown
  useEffect(() => {
    console.log('🔍 DASHBOARD SETTINGS CHANGED:', {
      autoRefresh: settings?.autoRefresh,
      refreshInterval: settings?.refreshInterval,
      fullSettings: settings
    });
    if (settings?.autoRefresh) {
      const interval = setInterval(() => {
        setRefreshCountdown(prev => {
          const newValue = prev - 1;
          
          if (newValue <= 0) {
            // Call fetchAllData directly to avoid dependency loops
            fetchAllData().then(() => {
              console.log('✅ Auto-refresh completed successfully', new Date().toISOString());
              // Update current time to refresh calculations
              setCurrentTime(Date.now());
            }).catch(error => {
              console.error('❌ Auto-refresh failed:', error, new Date().toISOString());
            });
            setShowRefreshNotice(true);
            setTimeout(() => setShowRefreshNotice(false), 2000);
            const nextInterval = settings?.refreshInterval || 30;
            return nextInterval;
          }
          
          return newValue;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    } else {
      // Reset countdown when auto-refresh is disabled
      setRefreshCountdown(settings?.refreshInterval || 30);
    }
  }, [settings?.autoRefresh, settings?.refreshInterval, fetchAllData]);

  const formatTime = (timeString) => {
    return timeString || '00:00:00';
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Debug Panel */}
      {showDebug && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="h6">Debug Information</Typography>
          <Typography variant="body2">
            <strong>Authentication:</strong> {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}<br/>
            <strong>Token:</strong> {token ? 'Present' : 'Missing'}<br/>
            <strong>User:</strong> {user?.email || 'None'}<br/>
            <strong>Settings Auto-Refresh:</strong> {settings?.autoRefresh ? 'Enabled' : 'Disabled'}<br/>
            <strong>Settings Refresh Interval:</strong> {settings?.refreshInterval || 'Not Set'}<br/>
          </Typography>
        </Alert>
      )}

      {/* System Overview Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: '#1e293b' }}>
          System Overview
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </Box>
      </Box>

      {/* System Overview Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <MetricCard>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                System Availability
              </Typography>
              <Typography variant="h3" sx={{ color: '#3b82f6', fontWeight: 700, mb: 2 }}>
                {(metrics.systemAvailability * 100).toFixed(1)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.systemAvailability * 100} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#3b82f6'
                  }
                }}
              />
            </CardContent>
          </MetricCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <MetricCard>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                Total Runtime
              </Typography>
              <Typography variant="h3" sx={{ color: '#10b981', fontWeight: 700, mb: 2 }}>
                {formatTime(metrics.totalRuntime)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon sx={{ color: '#10b981', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#10b981' }}>
                  Active production time
                </Typography>
              </Box>
            </CardContent>
          </MetricCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <MetricCard>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                Total Downtime
              </Typography>
              <Typography variant="h3" sx={{ color: '#ef4444', fontWeight: 700, mb: 2 }}>
                {formatTime(metrics.totalDowntime)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingDownIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#ef4444' }}>
                  Total stops: {metrics.totalStops}
                </Typography>
              </Box>
            </CardContent>
          </MetricCard>
        </Grid>
      </Grid>

      {/* Asset Status */}
      <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: '#1e293b', mb: 3 }}>
        Asset Status
      </Typography>
      
      <Grid container spacing={3}>
        {metrics.assets && metrics.assets.length > 0 ? (
          metrics.assets.map((asset) => {
            const maxTimeMs = getMaxTimeValue(asset.runtimeMs, asset.downtimeMs);
            const timeChartOptions = getTimeChartOptions(maxTimeMs);
            
            return (
              <Grid item xs={12} md={4} key={asset.id}>
                <Card sx={{ 
                  height: '100%',
                  border: `2px solid ${getStatusColor(asset.status)}`,
                  borderRadius: 2,
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    {/* Asset Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {asset.name}
                        {asset.pin_number && (
                          <Typography variant="caption" sx={{ color: '#64748b', ml: 1 }}>
                            (Pin {asset.pin_number})
                          </Typography>
                        )}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={asset.status}
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor(asset.status),
                            color: 'white',
                            fontWeight: 500
                          }}
                        />
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(asset.status),
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Asset Metrics - Removed duplicate text readings, keeping only Total Stops */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" sx={{ color: '#64748b', fontSize: '1rem' }}>
                          Total Stops:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          {asset.totalStops}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Availability Chart - Fixed height and layout */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 1, textAlign: 'center', fontWeight: 500 }}>
                        Availability
                      </Typography>
                      <Box sx={{ 
                        height: 50, 
                        position: 'relative',
                        mb: 1
                      }}>
                        <Bar 
                          data={getAvailabilityChartData(asset.availability)} 
                          options={availabilityChartOptions}
                        />
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#3b82f6' }}>
                          {(asset.availability * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>

                    {/* Runtime Chart */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 1, textAlign: 'center', fontWeight: 500 }}>
                        Runtime
                      </Typography>
                      <Box sx={{ 
                        height: 50,
                        position: 'relative',
                        mb: 1
                      }}>
                        <Bar 
                          data={getRuntimeChartData(asset.runtimeMs, maxTimeMs)} 
                          options={timeChartOptions}
                        />
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                          {formatTime(asset.runtime)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Downtime Chart */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 1, textAlign: 'center', fontWeight: 500 }}>
                        Downtime
                      </Typography>
                      <Box sx={{ 
                        height: 50,
                        position: 'relative',
                        mb: 1
                      }}>
                        <Bar 
                          data={getDowntimeChartData(asset.downtimeMs, maxTimeMs)} 
                          options={timeChartOptions}
                        />
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>
                          {formatTime(asset.downtime)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Analytics Button */}
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<AnalyticsIcon />}
                        onClick={() => handleAnalyticsClick(asset.id)}
                        sx={{
                          borderColor: '#3b82f6',
                          color: '#3b82f6',
                          '&:hover': {
                            backgroundColor: 'rgba(59, 130, 246, 0.04)',
                            borderColor: '#2563eb'
                          }
                        }}
                      >
                        View Analytics
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">
                No assets found. Please add assets in the configuration.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;
