import React, { useState, useEffect, useContext } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as FlatIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import SocketContext from '../../context/SocketContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const RealTimeMetricsWidget = () => {
  const { assets, events } = useContext(SocketContext);
  const [timeRange, setTimeRange] = useState('1h'); // 1h, 4h, 12h, 24h
  const [selectedMetric, setSelectedMetric] = useState('availability');
  const [selectedAsset, setSelectedAsset] = useState('all'); // 'all' or specific asset ID
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Generate time series data based on current assets and events
  useEffect(() => {
    const generateMetricsHistory = () => {
      const now = new Date();
      const intervals = {
        '1h': { points: 12, intervalMs: 5 * 60 * 1000 }, // 5-minute intervals
        '4h': { points: 24, intervalMs: 10 * 60 * 1000 }, // 10-minute intervals
        '12h': { points: 36, intervalMs: 20 * 60 * 1000 }, // 20-minute intervals
        '24h': { points: 48, intervalMs: 30 * 60 * 1000 } // 30-minute intervals
      };

      const { points, intervalMs } = intervals[timeRange];
      const history = [];

      for (let i = points - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * intervalMs));
        const metrics = calculateMetricsAtTime(timestamp);
        history.push({
          timestamp,
          ...metrics
        });
      }

      setMetricsHistory(history);
    };

    generateMetricsHistory();
    const interval = setInterval(generateMetricsHistory, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [timeRange, assets, events, lastUpdate, selectedAsset]);

  // Calculate metrics at a specific time (based on Dashboard calculation logic)
  const calculateMetricsAtTime = (timestamp) => {
    if (!assets || assets.length === 0) {
      return {
        availability: 0,
        activeAssets: 0,
        totalRuntime: 0,
        totalDowntime: 0
      };
    }

    // Filter assets based on selection
    const filteredAssets = selectedAsset === 'all' 
      ? assets 
      : assets.filter(asset => asset.id === selectedAsset);

    if (filteredAssets.length === 0) {
      return {
        availability: 0,
        activeAssets: 0,
        totalRuntime: 0,
        totalDowntime: 0
      };
    }

    // Simulate some variation in metrics over time for trending
    const timeVariation = Math.sin(timestamp.getTime() / (1000 * 60 * 60)) * 0.02; // Small hourly variation
    const randomVariation = (Math.random() - 0.5) * 0.01; // Very small random variation

    let totalRuntime = 0;
    let totalDowntime = 0;
    let activeAssets = 0;
    let totalAvailability = 0;

    // Calculate metrics using Dashboard logic with real-time adjustments
    const now = new Date(timestamp);
    
    const assetMetrics = filteredAssets.map(asset => {
      const status = asset.current_state || 'STOPPED';
      if (status === 'RUNNING') activeAssets++;

      // Get base runtime and downtime from asset
      let currentRuntimeMs = (asset.runtime || 0) * 1000; // Convert to milliseconds
      let currentDowntimeMs = (asset.downtime || 0) * 1000;

      // Add real-time adjustment based on current state and last state change
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

      const totalTime = currentRuntimeMs + currentDowntimeMs;
      const availability = totalTime > 0 ? currentRuntimeMs / totalTime : 0;
      totalAvailability += availability;

      return {
        availability: availability,
        runtimeMs: currentRuntimeMs,
        downtimeMs: currentDowntimeMs
      };
    });

    // Calculate system availability as average of individual asset availabilities (Dashboard logic)
    let systemAvailability = filteredAssets.length > 0 
      ? (totalAvailability / filteredAssets.length) * 100
      : 0;

    // Apply small variations for trending effect
    systemAvailability = Math.max(0, Math.min(100, 
      systemAvailability + (timeVariation + randomVariation) * 100
    ));

    return {
      availability: systemAvailability,
      activeAssets,
      totalRuntime: totalRuntime / (1000 * 60 * 60), // Convert to hours
      totalDowntime: totalDowntime / (1000 * 60 * 60) // Convert to hours
    };
  };

  // Get chart data for selected metric
  const getChartData = () => {
    const labels = metricsHistory.map(point => 
      point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
    
    const data = metricsHistory.map(point => point[selectedMetric]);
    const currentValue = data[data.length - 1] || 0;
    const previousValue = data[data.length - 2] || 0;
    const trend = currentValue - previousValue;

    // Color based on metric type and trend
    const getColor = () => {
      if (selectedMetric === 'throughput' || selectedMetric === 'activeAssets') {
        return trend >= 0 ? '#4caf50' : '#f44336';
      }
      return trend >= 0 ? '#4caf50' : '#f44336';
    };

    return {
      labels,
      datasets: [
        {
          label: getMetricLabel(selectedMetric),
          data,
          borderColor: getColor(),
          backgroundColor: `${getColor()}20`,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: getColor(),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  };

  const getMetricLabel = (metric) => {
    const labels = {
      availability: 'Availability (%)',
      activeAssets: 'Active Assets',
      totalRuntime: 'Total Runtime (hrs)',
      totalDowntime: 'Total Downtime (hrs)'
    };
    return labels[metric] || metric;
  };

  const getCurrentValue = () => {
    if (metricsHistory.length === 0) return 0;
    const current = metricsHistory[metricsHistory.length - 1][selectedMetric];
    
    if (selectedMetric === 'activeAssets') {
      return Math.round(current);
    } else if (selectedMetric === 'totalRuntime' || selectedMetric === 'totalDowntime') {
      return (current / 60).toFixed(1); // Convert minutes to hours
    } else {
      return current.toFixed(1);
    }
  };

  const getTrend = () => {
    if (metricsHistory.length < 2) return { value: 0, direction: 'flat' };
    
    const current = metricsHistory[metricsHistory.length - 1][selectedMetric];
    const previous = metricsHistory[metricsHistory.length - 2][selectedMetric];
    const change = current - previous;
    
    let direction = 'flat';
    if (Math.abs(change) > 0.1) {
      direction = change > 0 ? 'up' : 'down';
    }
    
    return { value: Math.abs(change), direction };
  };

  // Calculate dynamic scale based on data range
  const getDynamicScale = () => {
    if (metricsHistory.length === 0) {
      return { min: 0, max: 100, stepSize: 10 };
    }

    const data = metricsHistory.map(point => point[selectedMetric]);
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue;

    // For availability, use percentage-based scaling
    if (selectedMetric === 'availability') {
      if (range < 5) {
        // Small range: focus on the data with padding
        const center = (minValue + maxValue) / 2;
        const padding = Math.max(2, range * 0.5);
        return {
          min: Math.max(0, center - padding),
          max: Math.min(100, center + padding),
          stepSize: 0.5
        };
      } else if (range < 20) {
        // Medium range: show with some padding
        const padding = range * 0.2;
        return {
          min: Math.max(0, minValue - padding),
          max: Math.min(100, maxValue + padding),
          stepSize: 1
        };
      } else {
        // Large range: use full scale
        return { min: 0, max: 100, stepSize: 5 };
      }
    }

    // For active assets
    if (selectedMetric === 'activeAssets') {
      if (range <= 2) {
        const padding = Math.max(1, Math.ceil(range * 0.5));
        return {
          min: Math.max(0, minValue - padding),
          max: maxValue + padding,
          stepSize: 1
        };
      } else {
        const padding = Math.ceil(range * 0.2);
        return {
          min: Math.max(0, minValue - padding),
          max: maxValue + padding,
          stepSize: Math.max(1, Math.ceil(range / 8))
        };
      }
    }

    // For runtime/downtime (hours)
    if (selectedMetric === 'totalRuntime' || selectedMetric === 'totalDowntime') {
      if (range < 1) {
        // Small range: focus on the data
        const center = (minValue + maxValue) / 2;
        const padding = Math.max(0.2, range * 0.5);
        return {
          min: Math.max(0, center - padding),
          max: center + padding,
          stepSize: 0.1
        };
      } else if (range < 5) {
        const padding = range * 0.2;
        return {
          min: Math.max(0, minValue - padding),
          max: maxValue + padding,
          stepSize: 0.5
        };
      } else {
        const padding = range * 0.1;
        return {
          min: Math.max(0, minValue - padding),
          max: maxValue + padding,
          stepSize: Math.max(0.5, Math.ceil(range / 10))
        };
      }
    }

    // Default fallback
    return { min: 0, max: maxValue * 1.1, stepSize: Math.max(0.1, range / 10) };
  };

  const dynamicScale = getDynamicScale();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#333',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            const metricLabel = getMetricLabel(selectedMetric);
            
            if (selectedMetric === 'availability') {
              return `${metricLabel}: ${value.toFixed(1)}%`;
            } else if (selectedMetric === 'activeAssets') {
              return `${metricLabel}: ${Math.round(value)}`;
            } else if (selectedMetric === 'totalRuntime' || selectedMetric === 'totalDowntime') {
              const hours = Math.floor(value);
              const minutes = Math.round((value - hours) * 60);
              return `${metricLabel}: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
              return `${metricLabel}: ${value.toFixed(1)}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 6,
          color: '#666'
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        min: dynamicScale.min,
        max: dynamicScale.max,
        ticks: {
          color: '#666',
          stepSize: dynamicScale.stepSize,
          maxTicksLimit: 8,
          callback: function(value) {
            if (selectedMetric === 'activeAssets') {
              return Math.round(value);
            } else if (selectedMetric === 'availability') {
              return value.toFixed(1) + '%';
            } else if (selectedMetric === 'totalRuntime' || selectedMetric === 'totalDowntime') {
              return value.toFixed(1) + 'h';
            } else {
              return value.toFixed(1);
            }
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const trend = getTrend();
  const currentValue = getCurrentValue();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimelineIcon color="primary" />
            <Typography variant="h6" component="div">
              Real-Time Metrics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={() => setLastUpdate(Date.now())}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Asset</InputLabel>
              <Select
                value={selectedAsset}
                label="Asset"
                onChange={(e) => setSelectedAsset(e.target.value)}
              >
                <MenuItem value="all">All Assets (System)</MenuItem>
                {assets && assets.map(asset => (
                  <MenuItem key={asset.id} value={asset.id}>
                    {asset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                label="Metric"
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                <MenuItem value="availability">Availability</MenuItem>
                <MenuItem value="activeAssets">Active Assets</MenuItem>
                <MenuItem value="totalRuntime">Total Runtime</MenuItem>
                <MenuItem value="totalDowntime">Total Downtime</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1h">Last Hour</MenuItem>
                <MenuItem value="4h">Last 4 Hours</MenuItem>
                <MenuItem value="12h">Last 12 Hours</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h4" component="div" color="primary">
            {currentValue}
            {selectedMetric === 'availability' && '%'}
            {selectedMetric === 'totalRuntime' && 'h'}
            {selectedMetric === 'totalDowntime' && 'h'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {trend.direction === 'up' && <TrendingUpIcon color="success" />}
            {trend.direction === 'down' && <TrendingDownIcon color="error" />}
            {trend.direction === 'flat' && <FlatIcon color="disabled" />}
            <Chip
              label={`${trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}${trend.value.toFixed(1)}${selectedMetric === 'availability' ? '%' : selectedMetric === 'totalRuntime' || selectedMetric === 'totalDowntime' ? 'h' : ''}`}
              size="small"
              color={trend.direction === 'up' ? 'success' : trend.direction === 'down' ? 'error' : 'default'}
              variant="outlined"
            />
          </Box>
        </Box>
        
        {selectedAsset !== 'all' && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={`Filtered by: ${assets?.find(a => a.id === selectedAsset)?.name || 'Unknown Asset'}`}
              size="small"
              color="info"
              variant="outlined"
            />
          </Box>
        )}

        <Box sx={{ height: 200 }}>
          {metricsHistory.length > 0 && (
            <Line data={getChartData()} options={chartOptions} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default RealTimeMetricsWidget;