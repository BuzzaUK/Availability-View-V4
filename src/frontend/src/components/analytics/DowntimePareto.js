import React from 'react';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
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

const DowntimePareto = ({ data }) => {
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

  // Sort data by downtime duration in descending order
  const sortedData = [...data].sort((a, b) => b.duration - a.duration);

  // Calculate cumulative percentage
  const totalDowntime = sortedData.reduce((sum, item) => sum + item.duration, 0);
  let cumulativeDowntime = 0;
  
  const chartData = {
    labels: sortedData.map(item => item.reason),
    datasets: [
      {
        type: 'bar',
        label: 'Downtime',
        data: sortedData.map(item => item.duration / (1000 * 60 * 60)), // Convert to hours
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Cumulative %',
        data: sortedData.map(item => {
          cumulativeDowntime += item.duration;
          return (cumulativeDowntime / totalDowntime) * 100;
        }),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderWidth: 2,
        pointRadius: 4,
        fill: false,
        yAxisID: 'y1',
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const datasetLabel = context.dataset.label;
            const value = context.raw;
            if (datasetLabel === 'Downtime') {
              return `${datasetLabel}: ${formatDuration(value * 60 * 60 * 1000)}`;
            } else {
              return `${datasetLabel}: ${value.toFixed(2)}%`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Downtime Reason',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Downtime (hours)',
        },
        beginAtZero: true,
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Cumulative Percentage',
        },
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // Render empty state
  if (!data || data.length === 0) {
    return (
      <ChartContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography variant="body1">No downtime data available</Typography>
        </Box>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer>
      <Typography variant="h6" gutterBottom>
        Downtime Pareto Analysis
      </Typography>
      <Box sx={{ flexGrow: 1 }}>
        <Bar data={chartData} options={options} />
      </Box>
    </ChartContainer>
  );
};

export default DowntimePareto;