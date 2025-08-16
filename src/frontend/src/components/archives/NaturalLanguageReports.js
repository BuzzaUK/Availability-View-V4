import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import { format } from 'date-fns';

const NaturalLanguageReports = () => {
  const [reportType, setReportType] = useState('shift');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableReportTypes, setAvailableReportTypes] = useState(null);

  useEffect(() => {
    fetchShifts();
    fetchAvailableReportTypes();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await axios.get('/api/shifts');
      const shiftsData = response.data?.data || [];
      setShifts(shiftsData);
      if (shiftsData && shiftsData.length > 0) {
        setSelectedShift(shiftsData[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
      setShifts([]);
    }
  };

  const fetchAvailableReportTypes = async () => {
    try {
      const response = await axios.get('/api/reports/natural-language');
      setAvailableReportTypes(response.data);
    } catch (err) {
      console.error('Failed to fetch report types:', err);
    }
  };

  const generateReport = async () => {
    if (!selectedShift && reportType === 'shift') {
      setError('Please select a shift');
      return;
    }

    setLoading(true);
    setError('');
    setReport(null);

    try {
      let endpoint;
      if (reportType === 'shift') {
        endpoint = `/api/reports/natural-language/shift/${selectedShift}?includeRawData=true`;
      } else if (reportType === 'daily') {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        endpoint = `/api/reports/natural-language/daily/${dateStr}`;
      }

      const response = await axios.get(endpoint);
      setReport(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const generateSampleReport = async () => {
    setLoading(true);
    setError('');
    setReport(null);

    try {
      const response = await axios.get('/api/reports/natural-language/sample');
      setReport(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate sample report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const content = formatReportForDownload(report);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `natural-language-report-${report.shift_id || 'sample'}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatReportForDownload = (report) => {
    if (!report.narrative) return JSON.stringify(report, null, 2);

    let content = `NATURAL LANGUAGE SHIFT REPORT\n`;
    content += `Generated: ${new Date(report.generated_at).toLocaleString()}\n`;
    content += `Shift ID: ${report.shift_id}\n`;
    content += `Report Type: ${report.report_type}\n\n`;
    content += `${'='.repeat(80)}\n\n`;

    Object.entries(report.narrative).forEach(([section, text]) => {
      content += `${section.toUpperCase().replace(/_/g, ' ')}\n`;
      content += `${'-'.repeat(40)}\n`;
      content += `${text}\n\n`;
    });

    return content;
  };

  const renderNarrativeSection = (title, content, icon) => (
    <Accordion defaultExpanded={title === 'Executive Summary'}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Paper sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
          <Typography 
            variant="body1" 
            component="div"
            sx={{ 
              whiteSpace: 'pre-line',
              '& strong': { fontWeight: 'bold' },
              '& em': { fontStyle: 'italic' }
            }}
            dangerouslySetInnerHTML={{ 
              __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                           .replace(/\*(.*?)\*/g, '<em>$1</em>')
                           .replace(/\n/g, '<br/>')
            }}
          />
        </Paper>
      </AccordionDetails>
    </Accordion>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon />
          Natural Language Reports
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Generate comprehensive, human-readable reports that provide insights and analysis of shift performance, 
          asset behavior, and operational efficiency in natural language format.
        </Typography>

        {/* Report Generation Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Generate Report</Typography>
            
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    label="Report Type"
                  >
                    <MenuItem value="shift">Shift Report</MenuItem>
                    <MenuItem value="daily">Daily Summary</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {reportType === 'shift' && (
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Select Shift</InputLabel>
                    <Select
                      value={selectedShift}
                      onChange={(e) => setSelectedShift(e.target.value)}
                      label="Select Shift"
                    >
                      {shifts.map((shift) => (
                        <MenuItem key={shift.id} value={shift.id}>
                          {shift.name} - {format(new Date(shift.start_time), 'MMM dd, yyyy HH:mm')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {reportType === 'daily' && (
                <Grid item xs={12} md={4}>
                  <DatePicker
                    label="Select Date"
                    value={selectedDate}
                    onChange={(newValue) => setSelectedDate(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
              )}

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={generateReport}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
                    fullWidth
                  >
                    {loading ? 'Generating...' : 'Generate Report'}
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  onClick={generateSampleReport}
                  disabled={loading}
                  startIcon={<DescriptionIcon />}
                  fullWidth
                >
                  Sample Report
                </Button>
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Available Report Types Info */}
        {availableReportTypes && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Available Report Types</Typography>
              <Grid container spacing={2}>
                {availableReportTypes.available_reports?.map((reportType, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        {reportType.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {reportType.description}
                      </Typography>
                      <Chip 
                        label={reportType.type} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>Key Features:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableReportTypes.features?.map((feature, index) => (
                  <Chip key={index} label={feature} size="small" variant="outlined" />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Generated Report Display */}
        {report && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Generated Report - {report.shift_id === 'SAMPLE' ? 'Sample Report' : `Shift ${report.shift_id}`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label={`Generated: ${format(new Date(report.generated_at), 'MMM dd, yyyy HH:mm')}`}
                    size="small"
                    color="info"
                    icon={<ScheduleIcon />}
                  />
                  <Tooltip title="Download Report">
                    <IconButton onClick={downloadReport} color="primary">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {report.narrative && (
                <Box sx={{ mt: 2 }}>
                  {renderNarrativeSection(
                    'Executive Summary', 
                    report.narrative.executive_summary,
                    <TrendingUpIcon color="primary" />
                  )}
                  {renderNarrativeSection(
                    'Shift Overview', 
                    report.narrative.shift_overview,
                    <ScheduleIcon color="info" />
                  )}
                  {renderNarrativeSection(
                    'Asset Performance', 
                    report.narrative.asset_performance,
                    <AssessmentIcon color="success" />
                  )}
                  {renderNarrativeSection(
                    'Key Events', 
                    report.narrative.key_events,
                    <DescriptionIcon color="warning" />
                  )}
                  {renderNarrativeSection(
                    'Recommendations', 
                    report.narrative.recommendations,
                    <TrendingUpIcon color="secondary" />
                  )}
                  {renderNarrativeSection(
                    'Conclusion', 
                    report.narrative.conclusion,
                    <AssessmentIcon color="primary" />
                  )}
                </Box>
              )}

              {/* Raw Data Section (if included) */}
              {report.raw_data && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Raw Data & Metrics</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                      <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                        {JSON.stringify(report.raw_data, null, 2)}
                      </pre>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default NaturalLanguageReports;