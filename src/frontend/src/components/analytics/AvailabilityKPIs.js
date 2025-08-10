import React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BuildIcon from '@mui/icons-material/Build';
import StopIcon from '@mui/icons-material/Stop';
import SpeedIcon from '@mui/icons-material/Speed';

const KPICard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const KPIValue = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 'bold',
  marginBottom: theme.spacing(1),
}));

const KPILabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1),
}));

const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  '& .MuiSvgIcon-root': {
    fontSize: '3rem',
  },
}));

const AvailabilityKPIs = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading KPIs...</Typography>
      </Box>
    );
  }

  const { overview } = data;

  // Helper function to format hours to HH:MM:SS
  const formatHoursToHMS = (hours) => {
    if (!hours || hours === 0) return '00:00:00';
    
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper function to get color based on value and thresholds
  const getAvailabilityColor = (value) => {
    if (value >= 90) return 'success';
    if (value >= 80) return 'warning';
    return 'error';
  };

  const getMTBFColor = (value) => {
    if (value >= 24) return 'success'; // > 24 hours
    if (value >= 8) return 'warning';  // 8-24 hours
    return 'error'; // < 8 hours
  };

  const getMTTRColor = (value) => {
    if (value <= 0.5) return 'success'; // <= 30 minutes
    if (value <= 2) return 'warning';   // 30 minutes - 2 hours
    return 'error'; // > 2 hours
  };

  const kpis = [
    {
      label: 'Overall Availability',
      value: `${overview.overall_availability}%`,
      icon: <TrendingUpIcon color="primary" />,
      color: getAvailabilityColor(overview.overall_availability),
      description: 'Percentage of planned production time that equipment is available'
    },
    {
      label: 'Total Runtime',
      value: formatHoursToHMS(overview.total_runtime_hours),
      icon: <AccessTimeIcon color="success" />,
      color: 'primary',
      description: 'Total time equipment was running and producing'
    },
    {
      label: 'Total Downtime',
      value: formatHoursToHMS(overview.total_downtime_hours),
      icon: <TrendingDownIcon color="error" />,
      color: 'error',
      description: 'Total time equipment was stopped or not producing'
    },
    {
      label: 'MTBF (Mean Time Between Failures)',
      value: formatHoursToHMS(overview.avg_mtbf_hours),
      icon: <SpeedIcon color="info" />,
      color: getMTBFColor(overview.avg_mtbf_hours),
      description: 'Average time between equipment failures'
    },
    {
      label: 'MTTR (Mean Time To Repair)',
      value: formatHoursToHMS(overview.avg_mttr_hours),
      icon: <BuildIcon color="warning" />,
      color: getMTTRColor(overview.avg_mttr_hours),
      description: 'Average time to repair equipment after failure'
    },
    {
      label: 'Total Stops',
      value: overview.total_stops,
      icon: <StopIcon color="error" />,
      color: 'primary',
      description: 'Total number of production stops'
    },
    {
      label: 'Micro Stops (<3min)',
      value: overview.micro_stops,
      icon: <StopIcon color="warning" />,
      color: 'warning',
      description: 'Number of stops lasting less than 3 minutes'
    },
    {
      label: 'Micro Stop Time',
      value: formatHoursToHMS(overview.micro_stop_time_hours),
      icon: <AccessTimeIcon color="warning" />,
      color: 'warning',
      description: 'Total time lost to micro stops'
    },
    {
      label: 'Utilization Rate',
      value: `${overview.utilization_rate}%`,
      icon: <SpeedIcon color="primary" />,
      color: getAvailabilityColor(overview.utilization_rate),
      description: 'Percentage of total time equipment was utilized'
    },
    {
      label: 'Stop Frequency',
      value: `${overview.stop_frequency_per_hour}/h`,
      icon: <StopIcon color="info" />,
      color: 'primary',
      description: 'Average number of stops per hour of runtime'
    },
    {
      label: 'Micro Stop %',
      value: `${overview.micro_stop_percentage}%`,
      icon: <StopIcon color="secondary" />,
      color: overview.micro_stop_percentage > 50 ? 'error' : 'success',
      description: 'Percentage of stops that are micro stops'
    }
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Availability KPIs
      </Typography>
      <Grid container spacing={3}>
        {kpis.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <KPICard elevation={2}>
              <Box>
                <IconContainer>
                  {kpi.icon}
                </IconContainer>
                <KPIValue color={kpi.color === 'error' ? 'error' : 'primary'}>
                  {kpi.value}
                </KPIValue>
                <KPILabel>
                  {kpi.label}
                </KPILabel>
                <Chip 
                  label={kpi.color === 'success' ? 'Good' : kpi.color === 'warning' ? 'Fair' : kpi.color === 'error' ? 'Poor' : 'Info'}
                  color={kpi.color}
                  size="small"
                  sx={{ mb: 1 }}
                />
              </Box>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}
              >
                {kpi.description}
              </Typography>
            </KPICard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AvailabilityKPIs;