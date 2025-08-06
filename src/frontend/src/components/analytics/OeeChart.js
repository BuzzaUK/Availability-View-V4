import React from 'react';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Line } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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

const OeeChart = ({ data, groupBy }) => {
  // Format date based on groupBy
  const formatDate = (dateString) => {
    const date = parseISO(dateString);
    switch (groupBy) {
      case 'day':
        return format(date, 'MMM dd');
      case 'week':
        return `Week ${format(date, 'w')}`;
      case 'month':
        return format(date, 'MMM yyyy');
      default:
        return format(date, 'MMM dd');
    }
  };

  // Prepare chart data
  const chartData = {
    labels: data.map(item => formatDate(item.date)),
    datasets: [
      {
        label: 'OEE',
        data: data.map(item => (item.oee * 100).toFixed(2)),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Availability',
        data: data.map(item => (item.availability * 100).toFixed(2)),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Performance',
        data: data.map(item => (item.performance * 100).toFixed(2)),
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Quality',
        data: data.map(item => (item.quality * 100).toFixed(2)),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.4,
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
            return `${context.dataset.label}: ${context.raw}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Percentage (%)',
        },
      },
      x: {
        title: {
          display: true,
          text: groupBy === 'day' ? 'Day' : groupBy === 'week' ? 'Week' : 'Month',
        },
      },
    },
  };

  // Render empty state
  if (!data || data.length === 0) {
    return (
      <ChartContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography variant="body1">No data available</Typography>
        </Box>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer>
      <Typography variant="h6" gutterBottom>
        OEE Trends
      </Typography>
      <Box sx={{ flexGrow: 1 }}>
        <Line data={chartData} options={options} />
      </Box>
    </ChartContainer>
  );
};

export default OeeChart;