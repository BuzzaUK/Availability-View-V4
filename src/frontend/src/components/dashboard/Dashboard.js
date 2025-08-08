import React, { useState, useEffect, useCallback, useContext } from 'react';
import { styled } from '@mui/material/styles';
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
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import SocketContext from '../../context/SocketContext';
import SettingsContext from '../../context/SettingsContext';
import AuthContext from '../../context/AuthContext';



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



  // Listen for ESP32 asset state changes
  // Note: Socket functionality will be implemented when needed
  useEffect(() => {
    // Socket connection will be handled by SocketContext
    // This useEffect is reserved for future socket implementation
  }, []);

  // Calculate metrics from real asset data
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

    const assetMetrics = assets.map(asset => {
      const currentState = assetStates[asset.name];
      const status = currentState?.state || asset.current_state || 'STOPPED';
      
      if (status === 'RUNNING') {
        runningAssets++;
      }

      totalRuntime += asset.runtime || 0;
      totalDowntime += asset.downtime || 0;
      totalStops += asset.total_stops || 0;

      const totalTime = (asset.runtime || 0) + (asset.downtime || 0);
      const availability = totalTime > 0 ? (asset.runtime || 0) / totalTime : 0;

      return {
        id: asset._id,
        name: asset.name,
        status: status,
        availability: availability,
        runtime: formatMilliseconds(asset.runtime || 0),
        downtime: formatMilliseconds(asset.downtime || 0),
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
  }, [assets, assetStates]);

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
            <strong>Current Countdown:</strong> {refreshCountdown}s
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
          {settings?.autoRefresh && (
            <Chip 
              icon={<RefreshIcon />}
              label={`Auto-refresh in: ${refreshCountdown}s`}
              variant="outlined"
              color="primary"
              size="small"
            />
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              // Force refresh by fetching fresh data and resetting countdown
              fetchAllData();
              setRefreshCountdown(settings?.refreshInterval || 30);
            }}
            disabled={false}
          >
            Refresh Now
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
          metrics.assets.map((asset) => (
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

                  {/* Asset Metrics */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Availability:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {(asset.availability * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Runtime:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                        {formatTime(asset.runtime)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Downtime:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>
                        {formatTime(asset.downtime)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Total Stops:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {asset.totalStops}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Availability Chart Placeholder */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 1, textAlign: 'center' }}>
                      Availability
                    </Typography>
                    <Box sx={{ 
                      height: 60, 
                      backgroundColor: '#f8fafc', 
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0'
                    }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        Chart Placeholder
                      </Typography>
                    </Box>
                  </Box>

                  {/* Runtime vs Downtime Chart Placeholder */}
                  <Box>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 1, textAlign: 'center' }}>
                      Runtime vs Downtime
                    </Typography>
                    <Box sx={{ 
                      height: 80, 
                      backgroundColor: '#f8fafc', 
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                      position: 'relative'
                    }}>
                      {asset.name === 'Production Line A' && asset.downtime !== '00:00:00' ? (
                        <Box sx={{ 
                          width: '80%', 
                          height: '60%', 
                          backgroundColor: '#ef4444',
                          borderRadius: 1
                        }} />
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          Chart Placeholder
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
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
