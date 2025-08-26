import React, { useState, useEffect, useContext } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Doughnut } from 'react-chartjs-2';
import SocketContext from '../../context/SocketContext';

const AdvancedKPIWidget = () => {
  const { assets, events } = useContext(SocketContext);
  const [kpis, setKpis] = useState({
    availability: { value: 0, target: 95, trend: 0 },
    mtbf: { value: 0, target: 240, trend: 0 }, // Mean Time Between Failures (hours)
    mttr: { value: 0, target: 30, trend: 0 }   // Mean Time To Repair (minutes)
  });
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Calculate KPIs from asset data
  useEffect(() => {
    const calculateKPIs = () => {
      if (!assets || assets.length === 0) {
        return;
      }

      let totalRuntime = 0;
      let totalDowntime = 0;
      let totalStops = 0;
      let totalRepairTime = 0;
      let runningAssets = 0;

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
        
        // Simulate repair time based on downtime events
        if (stops > 0) {
          totalRepairTime += downtime / stops; // Average repair time per stop
        }
      });

      const totalTime = totalRuntime + totalDowntime;
      const availability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;
      
      // Calculate MTBF and MTTR
      const mtbf = totalStops > 0 ? (totalRuntime / 3600) / totalStops : 0; // Hours between failures
      const mttr = totalStops > 0 ? (totalRepairTime / 60) / totalStops : 0; // Minutes to repair

      // Calculate trends (simulate based on previous values)
      const newKpis = {
        availability: { 
          value: availability, 
          target: 95, 
          trend: availability - (kpis.availability.value || availability)
        },
        mtbf: { 
          value: mtbf, 
          target: 240, 
          trend: mtbf - (kpis.mtbf.value || mtbf)
        },
        mttr: { 
          value: mttr, 
          target: 30, 
          trend: mttr - (kpis.mttr.value || mttr)
        }
      };

      setKpis(newKpis);
    };

    calculateKPIs();
  }, [assets, events, lastUpdate]);

  // Get status color based on value vs target
  const getStatusColor = (value, target, isLowerBetter = false) => {
    const ratio = isLowerBetter ? target / Math.max(value, 1) : value / target;
    
    if (ratio >= 1) return 'success';
    if (ratio >= 0.8) return 'warning';
    return 'error';
  };

  // Get status icon
  const getStatusIcon = (value, target, isLowerBetter = false) => {
    const color = getStatusColor(value, target, isLowerBetter);
    
    switch (color) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <CheckCircleIcon />;
    }
  };

  // Get trend icon
  const getTrendIcon = (trend) => {
    if (Math.abs(trend) < 0.1) return null;
    return trend > 0 ? 
      <TrendingUpIcon color="success" fontSize="small" /> : 
      <TrendingDownIcon color="error" fontSize="small" />;
  };

  // Create gauge chart data
  const createGaugeData = (value, target, label) => {
    const percentage = Math.min(100, (value / target) * 100);
    
    return {
      labels: ['Progress', 'Remaining'],
      datasets: [
        {
          data: [percentage, 100 - percentage],
          backgroundColor: [
            getStatusColor(value, target) === 'success' ? '#4caf50' :
            getStatusColor(value, target) === 'warning' ? '#ff9800' : '#f44336',
            '#e0e0e0'
          ],
          borderWidth: 0,
          cutout: '75%'
        }
      ]
    };
  };

  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    }
  };

  // KPI Card Component
  const KPICard = ({ title, kpi, unit = '%', isLowerBetter = false, showGauge = false }) => {
    const statusColor = getStatusColor(kpi.value, kpi.target, isLowerBetter);
    const progress = isLowerBetter ? 
      Math.min(100, (kpi.target / Math.max(kpi.value, 1)) * 100) :
      Math.min(100, (kpi.value / kpi.target) * 100);

    return (
      <Card sx={{ height: '100%', position: 'relative' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getTrendIcon(kpi.trend)}
              {getStatusIcon(kpi.value, kpi.target, isLowerBetter)}
            </Box>
          </Box>
          
          <Typography variant="h5" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
            {kpi.value.toFixed(1)}{unit}
          </Typography>
          
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Target: {kpi.target}{unit}
          </Typography>
          
          {showGauge ? (
            <Box sx={{ height: 60, position: 'relative' }}>
              <Doughnut 
                data={createGaugeData(kpi.value, kpi.target, title)} 
                options={gaugeOptions} 
              />
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  {progress.toFixed(0)}%
                </Typography>
              </Box>
            </Box>
          ) : (
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              color={statusColor}
              sx={{ height: 8, borderRadius: 4 }}
            />
          )}
          
          {Math.abs(kpi.trend) > 0.1 && (
            <Chip
              label={`${kpi.trend > 0 ? '+' : ''}${kpi.trend.toFixed(1)}${unit}`}
              size="small"
              color={kpi.trend > 0 ? 'success' : 'error'}
              variant="outlined"
              sx={{ mt: 1, fontSize: '0.7rem', height: 20 }}
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
            <SpeedIcon color="primary" />
            <Typography variant="h6" component="div">
              Key Performance Indicators
            </Typography>
          </Box>
          <Tooltip title="Refresh KPIs">
            <IconButton size="small" onClick={() => setLastUpdate(Date.now())}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <KPICard 
              title="Availability" 
              kpi={kpis.availability} 
              showGauge={true}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <KPICard 
              title="Mean Time Between Failures" 
              kpi={kpis.mtbf} 
              unit=" hrs"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <KPICard 
              title="Mean Time To Repair" 
              kpi={kpis.mttr} 
              unit=" min"
              isLowerBetter={true}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AdvancedKPIWidget;