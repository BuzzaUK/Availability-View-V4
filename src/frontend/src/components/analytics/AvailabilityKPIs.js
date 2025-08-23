import React, { useState, useContext } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BuildIcon from '@mui/icons-material/Build';
import StopIcon from '@mui/icons-material/Stop';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import AlertContext from '../../context/AlertContext';
import AuthContext from '../../context/AuthContext';

const KPICard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const CombinedKPICard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
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

const SettingsButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  padding: theme.spacing(0.5),
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

const AvailabilityKPIs = ({ data, loading, selectedAsset }) => {
  const { error, success } = useContext(AlertContext);
  const { token } = useContext(AuthContext);
  

  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [thresholds, setThresholds] = useState({
    mtbf: { good: 24, warning: 8 },
    mttr: { good: 0.5, warning: 2 }
  });
  const [microstopDialogOpen, setMicrostopDialogOpen] = useState(false);
  const [microstopThreshold, setMicrostopThreshold] = useState(3); // Default 3 minutes

  if (loading || !data) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading KPIs...</Typography>
      </Box>
    );
  }

  const overview = data?.overview || {
    overall_availability: 0,
    total_runtime_hours: 0,
    total_downtime_hours: 0,
    avg_mtbf_hours: 0,
    avg_mttr_hours: 0,
    total_stops: 0,
    stop_frequency_per_hour: 0,
    micro_stops: 0,
    micro_stop_time_hours: 0,
    micro_stop_percentage: 0,
  };

  const handleThresholdEdit = (metric) => {
    setSelectedMetric(metric);
    setThresholdDialogOpen(true);
  };

  const handleThresholdSave = () => {
    // Here you would typically save to backend/localStorage
    setThresholdDialogOpen(false);
    setSelectedMetric(null);
  };

  const handleMicrostopEdit = () => {
    if (selectedAsset) {
      // Convert seconds to minutes for display
      const thresholdInMinutes = (selectedAsset.microstop_threshold || 180) / 60;
      setMicrostopThreshold(thresholdInMinutes);
      setMicrostopDialogOpen(true);
    } else {
      // Show error if no asset is selected
      error('Please select an asset to configure microstop threshold');
    }
  };

  const handleMicrostopSave = async () => {
    if (!selectedAsset) {
      error('No asset selected');
      return;
    }
    
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Convert minutes to seconds for storage
      const thresholdInSeconds = microstopThreshold * 60;
      
      await axios.put(`/api/assets/${selectedAsset.id}`, {
        ...selectedAsset,
        microstop_threshold: thresholdInSeconds
      }, { headers });
      
      success('Microstop threshold updated successfully');
      setMicrostopDialogOpen(false);
      // Trigger a refresh of the data if needed
      window.location.reload();
    } catch (err) {
      error('Failed to update microstop threshold: ' + (err.response?.data?.message || err.message));
    }
  };

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
    if (value >= thresholds.mtbf.good) return 'success';
    if (value >= thresholds.mtbf.warning) return 'warning';
    return 'error';
  };

  const getMTTRColor = (value) => {
    if (value <= thresholds.mttr.good) return 'success';
    if (value <= thresholds.mttr.warning) return 'warning';
    return 'error';
  };

  const individualKpis = [
    {
      label: 'Overall Availability',
      value: `${overview.overall_availability}%`,
      icon: <TrendingUpIcon sx={{ color: '#2196f3' }} />,
      color: 'info',
      textColor: '#2196f3',
      description: 'Percentage of planned production time that equipment is available'
    },
    {
      label: 'Total Runtime',
      value: formatHoursToHMS(overview.total_runtime_hours),
      icon: <AccessTimeIcon sx={{ color: '#4caf50' }} />,
      color: 'success',
      textColor: '#4caf50',
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
      label: 'MTTR (Mean Time To Repair)',
      value: formatHoursToHMS(overview.avg_mttr_hours),
      icon: <BuildIcon color="warning" />,
      color: getMTTRColor(overview.avg_mttr_hours),
      description: 'Average time to repair equipment after failure',
      hasSettings: true,
      settingsKey: 'mttr'
    },
    {
      label: 'MTBF (Mean Time Between Failures)',
      value: formatHoursToHMS(overview.avg_mtbf_hours),
      icon: <SpeedIcon color="info" />,
      color: getMTBFColor(overview.avg_mtbf_hours),
      description: 'Average time between equipment failures',
      hasSettings: true,
      settingsKey: 'mtbf'
    }
  ];

  const combinedKpis = [
    {
      title: 'Stop Analysis',
      metrics: [
        {
          label: 'Total No. of Stops',
          value: overview.total_stops,
          icon: <StopIcon color="error" />
        },
        {
          label: 'Stop Frequency',
          value: `${overview.stop_frequency_per_hour}/h`,
          icon: <StopIcon color="info" />
        }
      ]
    },
    {
      title: 'Micro Stop Details',
      hasEdit: !!selectedAsset, // Only show edit button when asset is selected
      editAction: handleMicrostopEdit,
      metrics: [
        {
          label: 'Micro Stop No.',
          value: overview.micro_stops,
          icon: <StopIcon color="warning" />
        },
        {
          label: 'Total Time',
          value: formatHoursToHMS(overview.micro_stop_time_hours),
          icon: <AccessTimeIcon color="warning" />
        },
        {
          label: '%',
          value: `${overview.micro_stop_percentage}%`,
          icon: <StopIcon color="secondary" />
        }
      ]
    }
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Availability KPIs
      </Typography>
      
      {/* Individual KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {individualKpis.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <KPICard elevation={2}>
              {kpi.hasSettings && (
                <SettingsButton 
                  onClick={() => handleThresholdEdit(kpi.settingsKey)}
                  size="small"
                >
                  <SettingsIcon fontSize="small" />
                </SettingsButton>
              )}
              <Box>
                <IconContainer>
                  {kpi.icon}
                </IconContainer>
                <KPIValue 
                  sx={{ 
                    color: kpi.textColor || (kpi.color === 'error' ? 'error.main' : 'primary.main'),
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    marginBottom: 1
                  }}
                >
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

      {/* Combined KPIs */}
      <Grid container spacing={3}>
        {combinedKpis.map((group, groupIndex) => (
          <Grid item xs={12} md={6} key={groupIndex}>
            <CombinedKPICard elevation={2} sx={{ position: 'relative' }}>
              {group.hasEdit && (
                <SettingsButton 
                  onClick={group.editAction}
                  size="small"
                >
                  <EditIcon fontSize="small" />
                </SettingsButton>
              )}
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                {group.title}
              </Typography>
              <Grid container spacing={2}>
                {group.metrics.map((metric, metricIndex) => (
                  <Grid item xs={12 / group.metrics.length} key={metricIndex}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box sx={{ mb: 1 }}>
                        {metric.icon}
                      </Box>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 'bold',
                          mb: 0.5,
                          fontSize: group.metrics.length > 2 ? '1.5rem' : '2rem'
                        }}
                      >
                        {metric.value}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {metric.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CombinedKPICard>
          </Grid>
        ))}
      </Grid>

      {/* Threshold Configuration Dialog */}
      <Dialog open={thresholdDialogOpen} onClose={() => setThresholdDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Configure {selectedMetric?.toUpperCase()} Thresholds
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Good Threshold (Green)"
              type="number"
              value={selectedMetric ? thresholds[selectedMetric]?.good : ''}
              onChange={(e) => {
                if (selectedMetric) {
                  setThresholds(prev => ({
                    ...prev,
                    [selectedMetric]: {
                      ...prev[selectedMetric],
                      good: parseFloat(e.target.value)
                    }
                  }));
                }
              }}
              sx={{ mb: 2 }}
              helperText={selectedMetric === 'mtbf' ? 'Hours - Values >= this are Good (Green)' : 'Hours - Values <= this are Good (Green)'}
            />
            <TextField
              fullWidth
              label="Warning Threshold (Amber)"
              type="number"
              value={selectedMetric ? thresholds[selectedMetric]?.warning : ''}
              onChange={(e) => {
                if (selectedMetric) {
                  setThresholds(prev => ({
                    ...prev,
                    [selectedMetric]: {
                      ...prev[selectedMetric],
                      warning: parseFloat(e.target.value)
                    }
                  }));
                }
              }}
              helperText={selectedMetric === 'mtbf' ? 'Hours - Values >= this but < Good are Warning (Amber)' : 'Hours - Values <= this but > Good are Warning (Amber)'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThresholdDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleThresholdSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Microstop Threshold Dialog */}
      <Dialog open={microstopDialogOpen} onClose={() => setMicrostopDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Microstop Threshold</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Microstop Threshold (minutes)"
              type="number"
              value={microstopThreshold}
              onChange={(e) => setMicrostopThreshold(parseFloat(e.target.value))}
              sx={{ mb: 2 }}
              helperText="Stops shorter than this duration will be classified as microstops"
              inputProps={{ min: 0.1, step: 0.1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMicrostopDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMicrostopSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AvailabilityKPIs;