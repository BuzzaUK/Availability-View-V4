import React, { useState, useEffect, useCallback } from 'react';
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
  Tooltip,
  Skeleton,
  Fade,
  LinearProgress,
  Snackbar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../services/api';
import { format } from 'date-fns';

const NaturalLanguageReports = () => {
  const [reportType, setReportType] = useState('shift');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [loadingReportTypes, setLoadingReportTypes] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [availableReportTypes, setAvailableReportTypes] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(false);

  useEffect(() => {
    fetchShifts();
    fetchAvailableReportTypes();
  }, []);

  const fetchShifts = useCallback(async () => {
    setLoadingShifts(true);
    try {
      // First get all archived shift reports
      const archivedReportsResponse = await api.get('/reports/shifts');
      const archivedReports = archivedReportsResponse.data?.data || [];
      
      // Extract shift IDs that have archived reports
      const shiftIdsWithReports = new Set();
      archivedReports.forEach(report => {
        // Check for shift_id in archived_data.shift_id (where it's actually stored)
        const shiftId = report.archived_data?.shift_id || report.archived_data?.shift_info?.id || report.shift_id;
        if (shiftId) {
          shiftIdsWithReports.add(shiftId);
        }
      });
      
      // Get all shifts
      const shiftsResponse = await api.get('/shifts');
      const allShifts = shiftsResponse.data?.data || [];
      
      // Filter shifts to only include those with archived reports
      const shiftsWithReports = allShifts.filter(shift => 
        shiftIdsWithReports.has(shift.id)
      );
      
      setShifts(shiftsWithReports);
      if (shiftsWithReports && shiftsWithReports.length > 0) {
        setSelectedShift(shiftsWithReports[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
      setError('Failed to load available shifts. Please refresh the page.');
      setShifts([]);
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  const fetchAvailableReportTypes = useCallback(async () => {
    setLoadingReportTypes(true);
    try {
      const response = await api.get('/reports/natural-language');
      setAvailableReportTypes(response.data);
    } catch (err) {
      console.error('Failed to fetch report types:', err);
      setError('Failed to load report type information.');
    } finally {
      setLoadingReportTypes(false);
    }
  }, []);

  const generateReport = async () => {
    if (!selectedShift && reportType === 'shift') {
      setError('Please select a shift to generate the report.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    setReport(null);

    try {
      let endpoint;
      let reportDescription;
      
      if (reportType === 'shift') {
        endpoint = `/reports/natural-language/shift/${selectedShift}?includeRawData=true&useAI=true`;
        const selectedShiftData = shifts.find(s => s.id.toString() === selectedShift.toString());
        reportDescription = selectedShiftData ? 
          `${selectedShiftData.shift_name} - ${format(new Date(selectedShiftData.start_time), 'MMM dd, yyyy HH:mm')}` : 
          `Shift ${selectedShift}`;
      } else if (reportType === 'daily') {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        endpoint = `/reports/natural-language/daily/${dateStr}?useAI=true`;
        reportDescription = `Daily Summary for ${format(selectedDate, 'MMM dd, yyyy')}`;
      }

      const response = await api.get(endpoint);
      setReport(response.data);
      setSuccessMessage(`Successfully generated ${reportType} report for ${reportDescription}`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to generate report. Please try again.';
      setError(errorMessage);
      console.error('Report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleReport = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setReport(null);

    try {
      const response = await api.get('/reports/natural-language/sample?useAI=true');
      setReport(response.data);
      setSuccessMessage('Successfully generated sample report for demonstration purposes');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to generate sample report. Please try again.';
      setError(errorMessage);
      console.error('Sample report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!report) return;

    setDownloadProgress(true);
    try {
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
      setSuccessMessage('Report downloaded successfully!');
    } catch (err) {
      setError('Failed to download report. Please try again.');
      console.error('Download error:', err);
    } finally {
      setDownloadProgress(false);
    }
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

  const renderNarrativeSection = (title, content, icon) => {
    if (!content) return null;
    
    return (
      <Card 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4
          },
          border: '1px solid',
          borderColor: 'grey.200',
          backgroundColor: 'background.paper',
          borderRadius: 2
        }}
      >
        <CardContent sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          p: 3,
          '&:last-child': { pb: 3 }
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              color: 'primary.main',
              fontWeight: 600,
              borderBottom: '2px solid',
              borderColor: 'primary.light',
              pb: 1,
              flexShrink: 0
            }}
          >
            {icon}
            {title}
          </Typography>
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto',
            pr: 1
          }}>
            <Typography 
              variant="body1" 
              sx={{ 
                whiteSpace: 'pre-line', 
                lineHeight: 1.7,
                color: 'text.primary',
                fontSize: '0.95rem',
                textAlign: 'justify',
                wordBreak: 'break-word'
              }}
            >
              {content}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

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
        <Card sx={{ mb: 3, position: 'relative' }}>
          {loading && (
            <LinearProgress 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1 
              }} 
            />
          )}
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon color="primary" />
              Generate Report
            </Typography>
            
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => {
                      setReportType(e.target.value);
                      setError('');
                      setSuccessMessage('');
                    }}
                    label="Report Type"
                    disabled={loading}
                  >
                    <MenuItem value="shift">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon fontSize="small" />
                        Shift Report
                      </Box>
                    </MenuItem>
                    <MenuItem value="daily">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon fontSize="small" />
                        Daily Summary
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {reportType === 'shift' && (
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Select Shift</InputLabel>
                    {loadingShifts ? (
                      <Skeleton variant="rectangular" height={56} />
                    ) : (
                      <Select
                        value={selectedShift}
                        onChange={(e) => {
                          setSelectedShift(e.target.value);
                          setError('');
                          setSuccessMessage('');
                        }}
                        label="Select Shift"
                        disabled={loading || shifts.length === 0}
                      >
                        {shifts.map((shift) => (
                          <MenuItem key={shift.id} value={shift.id}>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {shift.shift_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(shift.start_time), 'MMM dd, yyyy HH:mm')}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </FormControl>
                  {!loadingShifts && shifts.length === 0 && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      No shifts available. Please check your data or try refreshing.
                    </Typography>
                  )}
                </Grid>
              )}

              {reportType === 'daily' && (
                <Grid item xs={12} md={4}>
                  <DatePicker
                    label="Select Date"
                    value={selectedDate}
                    onChange={(newValue) => {
                      setSelectedDate(newValue);
                      setError('');
                      setSuccessMessage('');
                    }}
                    disabled={loading}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
              )}

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={generateReport}
                    disabled={loading || (reportType === 'shift' && (!selectedShift || loadingShifts))}
                    startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
                    fullWidth
                    sx={{
                      minHeight: 48,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: 2
                      }
                    }}
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
                  sx={{
                    minHeight: 48,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: 1
                    }
                  }}
                >
                  Sample Report
                </Button>
              </Grid>
            </Grid>

            {error && (
              <Fade in={!!error}>
                <Alert 
                  severity="error" 
                  sx={{ mt: 2 }}
                  icon={<ErrorIcon />}
                  action={
                    <IconButton
                      aria-label="close"
                      color="inherit"
                      size="small"
                      onClick={() => setError('')}
                    >
                      ×
                    </IconButton>
                  }
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {successMessage && (
              <Fade in={!!successMessage}>
                <Alert 
                  severity="success" 
                  sx={{ mt: 2 }}
                  icon={<CheckCircleIcon />}
                  action={
                    <IconButton
                      aria-label="close"
                      color="inherit"
                      size="small"
                      onClick={() => setSuccessMessage('')}
                    >
                      ×
                    </IconButton>
                  }
                >
                  {successMessage}
                </Alert>
              </Fade>
            )}
          </CardContent>
        </Card>

        {/* Available Report Types Info */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon color="info" />
              Available Report Types
            </Typography>
            
            {loadingReportTypes ? (
              <Box>
                <Grid container spacing={2}>
                  {[1, 2].map((item) => (
                    <Grid item xs={12} md={6} key={item}>
                      <Paper sx={{ p: 2, height: '100%' }}>
                        <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
                        <Skeleton variant="rectangular" width={80} height={24} />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} variant="rectangular" width={120} height={24} sx={{ borderRadius: 12 }} />
                  ))}
                </Box>
              </Box>
            ) : availableReportTypes ? (
              <Box>
                <Grid container spacing={2}>
                  {availableReportTypes.available_reports?.map((reportType, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          height: '100%',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 3
                          }
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
                          {reportType.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                          {reportType.description}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip 
                            label={reportType.type} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                          <Typography variant="caption" color="text.secondary">
                            {reportType.endpoint?.includes('shift') ? 'Per Shift' : 'Daily Summary'}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon fontSize="small" color="success" />
                  Key Features:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableReportTypes.features?.map((feature, index) => (
                    <Chip 
                      key={index} 
                      label={feature} 
                      size="small" 
                      variant="outlined"
                      sx={{
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                          color: 'white'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Alert severity="info" icon={<InfoIcon />}>
                Report type information is currently unavailable. The system will still generate reports normally.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Generated Report Display */}
        {report && (
          <Fade in={!!report}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              border: '1px solid',
              borderColor: 'primary.light'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon color="primary" />
                    Generated Report - {report.shift_id === 'SAMPLE' ? 'Sample Report' : `Shift ${report.shift_id}`}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip 
                      label={`Generated: ${format(new Date(report.generated_at), 'MMM dd, yyyy HH:mm')}`}
                      size="small"
                      color="info"
                      icon={<ScheduleIcon />}
                      variant="outlined"
                      sx={{ backgroundColor: 'white' }}
                    />
                    <Tooltip title={downloadProgress ? 'Downloading...' : 'Download Report'}>
                      <span>
                        <IconButton 
                          onClick={downloadReport} 
                          color="primary"
                          disabled={downloadProgress}
                          sx={{
                            backgroundColor: 'white',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                              color: 'white'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          {downloadProgress ? <CircularProgress size={20} /> : <DownloadIcon />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>

              {report.narrative && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 3, borderColor: 'primary.light' }} />
                  <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
                    {/* Executive Summary - Full Width */}
                    {report.narrative.executive_summary && (
                      <Grid item xs={12}>
                        <Box sx={{ height: '100%' }}>
                          {renderNarrativeSection(
                            'Executive Summary', 
                            report.narrative.executive_summary,
                            <TrendingUpIcon color="primary" />
                          )}
                        </Box>
                      </Grid>
                    )}
                    
                    {/* First Row - Shift Overview and Asset Performance */}
                    {report.narrative.shift_overview && (
                      <Grid item xs={12} lg={6}>
                        <Box sx={{ height: '100%', minHeight: '300px' }}>
                          {renderNarrativeSection(
                            'Shift Overview', 
                            report.narrative.shift_overview,
                            <ScheduleIcon color="info" />
                          )}
                        </Box>
                      </Grid>
                    )}
                    {report.narrative.asset_performance && (
                      <Grid item xs={12} lg={6}>
                        <Box sx={{ height: '100%', minHeight: '300px' }}>
                          {renderNarrativeSection(
                            'Asset Performance', 
                            report.narrative.asset_performance,
                            <AssessmentIcon color="success" />
                          )}
                        </Box>
                      </Grid>
                    )}
                    
                    {/* Key Events - Full Width */}
                    {report.narrative.key_events && (
                      <Grid item xs={12}>
                        <Box sx={{ height: '100%' }}>
                          {renderNarrativeSection(
                            'Key Events', 
                            report.narrative.key_events,
                            <DescriptionIcon color="warning" />
                          )}
                        </Box>
                      </Grid>
                    )}
                    
                    {/* Second Row - Recommendations and Conclusion */}
                    {report.narrative.recommendations && (
                      <Grid item xs={12} lg={6}>
                        <Box sx={{ height: '100%', minHeight: '250px' }}>
                          {renderNarrativeSection(
                            'Recommendations', 
                            report.narrative.recommendations,
                            <CheckCircleIcon color="primary" />
                          )}
                        </Box>
                      </Grid>
                    )}
                    {report.narrative.conclusion && (
                      <Grid item xs={12} lg={6}>
                        <Box sx={{ height: '100%', minHeight: '250px' }}>
                          {renderNarrativeSection(
                            'Conclusion', 
                            report.narrative.conclusion,
                            <TrendingUpIcon color="success" />
                          )}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {/* Raw Data Section (if included) */}
              {report.raw_data && (
                <Box sx={{ mt: 4 }}>
                  <Divider sx={{ mb: 3, borderColor: 'primary.light' }} />
                  <Accordion 
                    sx={{ 
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 2,
                      '&:before': {
                        display: 'none'
                      },
                      boxShadow: 1
                    }}
                  >
                    <AccordionSummary 
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        backgroundColor: 'grey.50',
                        borderRadius: '8px 8px 0 0',
                        '&:hover': {
                          backgroundColor: 'grey.100'
                        }
                      }}
                    >
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssessmentIcon color="primary" />
                        Raw Data & Metrics
                        <Chip 
                          label="Technical Details" 
                          size="small" 
                          variant="outlined" 
                          color="info"
                        />
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <Box sx={{ 
                        backgroundColor: '#1e1e1e', 
                        color: '#d4d4d4',
                        p: 2,
                        borderRadius: '0 0 8px 8px',
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                      }}>
                        <pre style={{ 
                          margin: 0,
                          overflow: 'auto',
                          fontSize: '13px',
                          lineHeight: 1.4,
                          maxHeight: '500px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {JSON.stringify(report.raw_data, null, 2)}
                        </pre>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
            </CardContent>
          </Card>
          </Fade>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default NaturalLanguageReports;