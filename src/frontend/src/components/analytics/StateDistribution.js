import React from 'react';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import { Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

// Styled components - removed theme dependency
const ChartContainer = styled(Paper)(() => ({
  padding: '24px',
  height: '400px',
  display: 'flex',
  flexDirection: 'column',
}));

const StateDistribution = ({ data }) => {
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

  // Helper function to format percentage
  const formatPercentage = (value, total) => {
    if (!value || !total) return '0%';
    return `${((value / total) * 100).toFixed(2)}%`;
  };

  // Calculate total time
  const totalTime = data.reduce((sum, item) => sum + item.duration, 0);

  // Prepare state distribution data
  const stateData = {
    labels: data.map(item => item.state),
    datasets: [
      {
        data: data.map(item => item.duration),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)', // RUNNING - teal
          'rgba(255, 99, 132, 0.6)', // STOPPED - red
          'rgba(255, 206, 86, 0.6)', // WARNING - yellow
          'rgba(153, 102, 255, 0.6)', // IDLE - purple
          'rgba(54, 162, 235, 0.6)', // Other - blue
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare time distribution data (day vs night)
  const timeData = {
    labels: ['Day Shift (6:00 - 18:00)', 'Night Shift (18:00 - 6:00)'],
    datasets: [
      {
        data: [65, 35], // Example data - replace with actual day/night distribution
        backgroundColor: [
          'rgba(255, 206, 86, 0.6)', // Day - yellow
          'rgba(54, 162, 235, 0.6)', // Night - blue
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const label = context.label;
            return `${label}: ${formatDuration(value)} (${formatPercentage(value, totalTime)})`;
          }
        }
      }
    },
  };

  // Render empty state
  if (!data || data.length === 0) {
    return (
      <ChartContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography variant="body1">No state distribution data available</Typography>
        </Box>
      </ChartContainer>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <ChartContainer>
          <Typography variant="h6" gutterBottom>
            State Distribution
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Pie data={stateData} options={pieOptions} />
          </Box>
        </ChartContainer>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <ChartContainer>
          <Typography variant="h6" gutterBottom>
            Day vs Night Distribution
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Doughnut data={timeData} options={pieOptions} />
          </Box>
        </ChartContainer>
      </Grid>
      
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            State Summary
          </Typography>
          <Grid container spacing={2}>
            {data.map((item, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {item.state}
                  </Typography>
                  <Typography variant="body2">
                    Duration: {formatDuration(item.duration)}
                  </Typography>
                  <Typography variant="body2">
                    Percentage: {formatPercentage(item.duration, totalTime)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default StateDistribution;