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
  InputLabel,
  LinearProgress
} from '@mui/material';
import {
  Factory as FactoryIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Target as TargetIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import SocketContext from '../../context/SocketContext';

const ProductionEfficiencyWidget = () => {
  const { assets, events } = useContext(SocketContext);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('throughput');
  const [productionData, setProductionData] = useState({
    throughput: { current: 0, target: 100, trend: 0, unit: 'units/hr' },
    cycleTime: { current: 0, target: 45, trend: 0, unit: 'sec' },
    efficiency: { current: 0, target: 85, trend: 0, unit: '%' },
    yieldRate: { current: 0, target: 95, trend: 0, unit: '%' },
    utilization: { current: 0, target: 90, trend: 0, unit: '%' },
    scrapRate: { current: 0, target: 2, trend: 0, unit: '%' }
  });
  const [chartData, setChartData] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);

  // Generate time labels based on selected range
  const generateTimeLabels = (range) => {
    const labels = [];
    const now = new Date();
    
    switch (range) {
      case '1h':
        for (let i = 59; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 60000);
          labels.push(time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
        }
        break;
      case '8h':
        for (let i = 7; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 3600000);
          labels.push(time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit' }) + ':00');
        }
        break;
      case '24h':
      default:
        for (let i = 23; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 3600000);
          labels.push(time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit' }) + ':00');
        }
        break;
    }
    
    return labels;
  };

  // Calculate production metrics from asset data
  useEffect(() => {
    const calculateProductionMetrics = () => {
      if (!assets || assets.length === 0) {
        return;
      }

      let totalRuntime = 0;
      let totalDowntime = 0;
      let runningAssets = 0;
      let totalAssets = assets.length;
      let totalStops = 0;

      assets.forEach(asset => {
        const runtime = asset.runtime || 0;
        const downtime = asset.downtime || 0;
        const stops = asset.total_stops || 0;
        
        totalRuntime += runtime;
        totalDowntime += downtime;
        totalStops += stops;
        
        if (asset.current_state === 'RUNNING') {
          runningAssets++;
        }
      });

      const totalTime = totalRuntime + totalDowntime;
      const utilization = totalAssets > 0 ? (runningAssets / totalAssets) * 100 : 0;
      const efficiency = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;
      
      // Simulate production metrics based on asset performance
      const baseProduction = runningAssets * 50; // Base units per hour per running asset
      const efficiencyFactor = efficiency / 100;
      const throughput = baseProduction * efficiencyFactor;
      
      // Simulate cycle time (inversely related to efficiency)
      const cycleTime = efficiency > 0 ? 60 - (efficiency * 0.2) : 60;
      
      // Simulate yield rate and scrap rate
      const yieldRate = Math.min(100, 90 + (efficiency * 0.1));
      const scrapRate = Math.max(0, 5 - (efficiency * 0.05));

      // Calculate trends (simulate based on previous values)
      const newProductionData = {
        throughput: {
          current: throughput,
          target: 100,
          trend: throughput - (productionData.throughput.current || throughput),
          unit: 'units/hr'
        },
        cycleTime: {
          current: cycleTime,
          target: 45,
          trend: cycleTime - (productionData.cycleTime.current || cycleTime),
          unit: 'sec'
        },
        efficiency: {
          current: efficiency,
          target: 85,
          trend: efficiency - (productionData.efficiency.current || efficiency),
          unit: '%'
        },
        yieldRate: {
          current: yieldRate,
          target: 95,
          trend: yieldRate - (productionData.yieldRate.current || yieldRate),
          unit: '%'
        },
        utilization: {
          current: utilization,
          target: 90,
          trend: utilization - (productionData.utilization.current || utilization),
          unit: '%'
        },
        scrapRate: {
          current: scrapRate,
          target: 2,
          trend: scrapRate - (productionData.scrapRate.current || scrapRate),
          unit: '%'
        }
      };

      setProductionData(newProductionData);
      
      // Generate hourly data for charts
      const labels = generateTimeLabels(timeRange);
      const hourlyMetrics = labels.map((_, index) => {
        const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
        const baseValue = newProductionData[selectedMetric].current;
        return Math.max(0, baseValue * (1 + variation));
      });
      
      setHourlyData(hourlyMetrics);
    };

    calculateProductionMetrics();
  }, [assets, events, timeRange, selectedMetric]);

  // Update chart data when hourly data changes
  useEffect(() => {
    if (hourlyData.length > 0) {
      const labels = generateTimeLabels(timeRange);
      const metric = productionData[selectedMetric];
      
      setChartData({
        labels,
        datasets: [
          {
            label: `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} (${metric.unit})`,
            data: hourlyData,
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          },
          {
            label: `Target (${metric.target}${metric.unit})`,
            data: new Array(labels.length).fill(metric.target),
            borderColor: '#4caf50',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0
          }
        ]
      });
    }
  }, [hourlyData, selectedMetric, productionData, timeRange]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time'
        },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: productionData[selectedMetric]?.unit || ''
        },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  // Get status color based on value vs target
  const getStatusColor = (current, target, isLowerBetter = false) => {
    const ratio = isLowerBetter ? target / Math.max(current, 0.1) : current / target;
    
    if (ratio >= 1) return 'success';
    if (ratio >= 0.8) return 'warning';
    return 'error';
  };

  // Get trend icon
  const getTrendIcon = (trend, isLowerBetter = false) => {
    if (Math.abs(trend) < 0.1) return null;
    
    const isPositive = isLowerBetter ? trend < 0 : trend > 0;
    return isPositive ? 
      <TrendingUpIcon color="success" fontSize="small" /> : 
      <TrendingDownIcon color="error" fontSize="small" />;
  };

  // Production Metric Card Component
  const MetricCard = ({ title, data, isLowerBetter = false }) => {
    const statusColor = getStatusColor(data.current, data.target, isLowerBetter);
    const progress = isLowerBetter ? 
      Math.min(100, (data.target / Math.max(data.current, 0.1)) * 100) :
      Math.min(100, (data.current / data.target) * 100);

    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {title}
            </Typography>
            {getTrendIcon(data.trend, isLowerBetter)}
          </Box>
          
          <Typography variant="h5" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
            {data.current.toFixed(1)}{data.unit}
          </Typography>
          
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Target: {data.target}{data.unit}
          </Typography>
          
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            color={statusColor}
            sx={{ height: 6, borderRadius: 3, mb: 1 }}
          />
          
          {Math.abs(data.trend) > 0.1 && (
            <Chip
              label={`${data.trend > 0 ? '+' : ''}${data.trend.toFixed(1)}${data.unit}`}
              size="small"
              color={getTrendIcon(data.trend, isLowerBetter) ? 'success' : 'error'}
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FactoryIcon color="primary" />
            <Typography variant="h6" component="div">
              Production Efficiency
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                label="Metric"
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                <MenuItem value="throughput">Throughput</MenuItem>
                <MenuItem value="cycleTime">Cycle Time</MenuItem>
                <MenuItem value="efficiency">Efficiency</MenuItem>
                <MenuItem value="yieldRate">Yield Rate</MenuItem>
                <MenuItem value="utilization">Utilization</MenuItem>
                <MenuItem value="scrapRate">Scrap Rate</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>Range</InputLabel>
              <Select
                value={timeRange}
                label="Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1h">1H</MenuItem>
                <MenuItem value="8h">8H</MenuItem>
                <MenuItem value="24h">24H</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Metric Cards */}
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard title="Throughput" data={productionData.throughput} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard title="Cycle Time" data={productionData.cycleTime} isLowerBetter={true} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard title="Efficiency" data={productionData.efficiency} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard title="Yield Rate" data={productionData.yieldRate} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard title="Utilization" data={productionData.utilization} />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard title="Scrap Rate" data={productionData.scrapRate} isLowerBetter={true} />
          </Grid>
          
          {/* Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TimelineIcon color="primary" />
                  <Typography variant="h6">
                    {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
                  </Typography>
                </Box>
                
                <Box sx={{ height: 300 }}>
                  {chartData && (
                    <Line data={chartData} options={chartOptions} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ProductionEfficiencyWidget;