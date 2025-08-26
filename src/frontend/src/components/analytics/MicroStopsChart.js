import React, { useRef } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import html2canvas from 'html2canvas';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { format } from 'date-fns';

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '400px',
}));

const MicroStopsChart = ({ data, loading, selectedAsset }) => {
  const chartRef = useRef(null);

  const handleExportPNG = async () => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher resolution
          useCORS: true,
          allowTaint: true
        });
        
        const link = document.createElement('a');
        link.download = `microstop-chart-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (error) {
        console.error('Error exporting chart:', error);
      }
    }
  };
  if (loading || !data || !data.micro_stop_trend) {
    return (
      <ChartContainer>
        <Typography variant="h6" gutterBottom>
          Micro Stops Analysis
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <Typography>Loading chart data...</Typography>
        </Box>
      </ChartContainer>
    );
  }

  // Helper function to format minutes to HH:MM:SS
  const formatMinutesToHMS = (minutes) => {
    if (!minutes || minutes === 0) return '00:00:00';
    
    const totalSeconds = Math.floor(minutes * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const chartData = data.micro_stop_trend.map(item => ({
    ...item,
    date: format(new Date(item.date), 'MMM dd'),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ 
          bgcolor: 'background.paper', 
          p: 2, 
          border: 1, 
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 2
        }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.dataKey === 'micro_stop_time_minutes' 
                ? formatMinutesToHMS(entry.value) 
                : entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <ChartContainer ref={chartRef}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Micro Stops Analysis (Stops &lt; {selectedAsset?.microstop_threshold ? Math.round(selectedAsset.microstop_threshold / 60) : 3} minutes)
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleExportPNG}
          sx={{ ml: 2 }}
        >
          Create PNG
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
        Daily trend of micro stops count and accumulated time
      </Typography>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12 }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            label={{ value: 'Time (HH:MM:SS)', angle: 90, position: 'insideRight' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            yAxisId="left"
            dataKey="micro_stops" 
            fill="#ff9800" 
            name="Micro Stops Count"
            opacity={0.8}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="micro_stop_time_minutes" 
            stroke="#f44336" 
            strokeWidth={3}
            name="Accumulated Time"
            dot={{ fill: '#f44336', strokeWidth: 2, r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default MicroStopsChart;