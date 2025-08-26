import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Spinner,
  Badge,
  ProgressBar,
  Table,
  Form,
  ButtonGroup,
  Tabs,
  Tab
} from 'react-bootstrap';
import {
  FaRobot,
  FaExclamationTriangle,
  FaChartLine,
  FaTools,
  FaSearch,
  FaDownload,
  FaRedo,
  FaHeartbeat,
  FaBell,
  FaCalendarAlt
} from 'react-icons/fa';
import api from '../../services/api';

const AdvancedAnalyticsPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('predictive');
  const [timeframe, setTimeframe] = useState(30);
  
  // Data states
  const [predictiveReport, setPredictiveReport] = useState(null);
  const [assetHealth, setAssetHealth] = useState(null);
  const [forecasts, setForecasts] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [anomalies, setAnomalies] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, [timeframe]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadPredictiveReport(),
        loadAssetHealth(),
        loadForecasts(),
        loadRecommendations(),
        loadAnomalies()
      ]);
    } catch (err) {
      setError('Failed to load analytics data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictiveReport = async () => {
    try {
      const response = await api.get('/advanced-analytics/predictive-maintenance', {
        params: { timeframe, includeRecommendations: true }
      });
      setPredictiveReport(response.data.data);
    } catch (err) {
      console.error('Error loading predictive report:', err);
    }
  };

  const loadAssetHealth = async () => {
    try {
      const response = await api.get('/advanced-analytics/asset-health', {
        params: { timeframe }
      });
      setAssetHealth(response.data.data);
    } catch (err) {
      console.error('Error loading asset health:', err);
    }
  };

  const loadForecasts = async () => {
    try {
      const response = await api.get('/advanced-analytics/forecasts', {
        params: { timeframe }
      });
      setForecasts(response.data.data);
    } catch (err) {
      console.error('Error loading forecasts:', err);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await api.get('/advanced-analytics/maintenance-recommendations', {
        params: { timeframe }
      });
      setRecommendations(response.data.data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  };

  const loadAnomalies = async () => {
    try {
      const response = await api.get('/advanced-analytics/anomalies', {
        params: { timeframe: 7 } // Last 7 days for anomalies
      });
      setAnomalies(response.data.data);
    } catch (err) {
      console.error('Error loading anomalies:', err);
    }
  };

  const getRiskBadgeVariant = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'URGENT': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportReport = async () => {
    try {
      const reportData = {
        predictive_report: predictiveReport,
        asset_health: assetHealth,
        forecasts: forecasts,
        recommendations: recommendations,
        anomalies: anomalies,
        generated_at: new Date().toISOString(),
        timeframe_days: timeframe
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `advanced-analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export report: ' + err.message);
    }
  };

  const renderPredictiveMaintenanceTab = () => (
    <div>
      {predictiveReport && (
        <>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaHeartbeat className="text-primary mb-2" size={24} />
                  <h5>Overall Risk</h5>
                  <Badge variant={getRiskBadgeVariant(predictiveReport.risk_assessment?.overall_risk_level)}>
                    {predictiveReport.risk_assessment?.overall_risk_level || 'Unknown'}
                  </Badge>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaTools className="text-warning mb-2" size={24} />
                  <h5>Assets Needing Attention</h5>
                  <h3 className="text-warning">
                    {predictiveReport.risk_assessment?.assets_requiring_attention || 0}
                  </h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaChartLine className="text-info mb-2" size={24} />
                  <h5>Avg Health Score</h5>
                  <h3 className="text-info">
                    {predictiveReport.risk_assessment?.average_health_score?.toFixed(1) || 'N/A'}%
                  </h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaExclamationTriangle className="text-danger mb-2" size={24} />
                  <h5>Avg Failure Risk</h5>
                  <h3 className="text-danger">
                    {((predictiveReport.risk_assessment?.average_failure_probability || 0) * 100).toFixed(1)}%
                  </h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="mb-4">
            <Card.Header>
              <h5><FaHeartbeat className="me-2" />Asset Health Analysis</h5>
            </Card.Header>
            <Card.Body>
              {predictiveReport.predictive_insights?.length > 0 ? (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Health Score</th>
                      <th>Risk Level</th>
                      <th>Failure Probability</th>
                      <th>Predicted Maintenance</th>
                      <th>Anomalies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictiveReport.predictive_insights.map((insight, index) => (
                      <tr key={index}>
                        <td>{insight.asset_name}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <ProgressBar 
                              now={insight.health_score} 
                              variant={insight.health_score > 80 ? 'success' : insight.health_score > 60 ? 'warning' : 'danger'}
                              style={{ width: '100px', marginRight: '10px' }}
                            />
                            <span>{insight.health_score?.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={getRiskBadgeVariant(insight.risk_level)}>
                            {insight.risk_level}
                          </Badge>
                        </td>
                        <td>{(insight.failure_probability * 100).toFixed(1)}%</td>
                        <td>{formatDate(insight.predicted_maintenance_date)}</td>
                        <td>
                          <Badge variant="info">
                            {insight.anomalies_detected?.length || 0}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">No predictive insights available</Alert>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );

  const renderMaintenanceRecommendationsTab = () => (
    <div>
      {recommendations && (
        <Card>
          <Card.Header>
            <h5><FaTools className="me-2" />Maintenance Recommendations</h5>
          </Card.Header>
          <Card.Body>
            {recommendations.recommendations?.length > 0 ? (
              <>
                <Row className="mb-3">
                  <Col md={3}>
                    <Card className="text-center border-danger">
                      <Card.Body>
                        <h6>Urgent</h6>
                        <h4 className="text-danger">{recommendations.summary?.by_priority?.urgent || 0}</h4>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center border-warning">
                      <Card.Body>
                        <h6>High Priority</h6>
                        <h4 className="text-warning">{recommendations.summary?.by_priority?.high || 0}</h4>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center border-info">
                      <Card.Body>
                        <h6>Medium Priority</h6>
                        <h4 className="text-info">{recommendations.summary?.by_priority?.medium || 0}</h4>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center border-success">
                      <Card.Body>
                        <h6>Low Priority</h6>
                        <h4 className="text-success">{recommendations.summary?.by_priority?.low || 0}</h4>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Asset</th>
                      <th>Recommendation</th>
                      <th>Description</th>
                      <th>Est. Downtime</th>
                      <th>Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.recommendations.map((rec, index) => (
                      <tr key={index}>
                        <td>
                          <Badge variant={getPriorityBadgeVariant(rec.priority)}>
                            {rec.priority}
                          </Badge>
                        </td>
                        <td>{rec.asset_name}</td>
                        <td>{rec.recommendation}</td>
                        <td>{rec.description}</td>
                        <td>{rec.estimated_downtime}</td>
                        <td>${rec.estimated_cost?.toLocaleString() || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            ) : (
              <Alert variant="success">No maintenance recommendations at this time</Alert>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );

  const renderAnomaliesTab = () => (
    <div>
      {anomalies && (
        <Card>
          <Card.Header>
            <h5><FaBell className="me-2" />Anomaly Detection</h5>
          </Card.Header>
          <Card.Body>
            {anomalies.anomalies?.length > 0 ? (
              <>
                <Row className="mb-3">
                  <Col md={4}>
                    <Card className="text-center border-danger">
                      <Card.Body>
                        <h6>High Severity</h6>
                        <h4 className="text-danger">{anomalies.summary?.by_severity?.high || 0}</h4>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center border-warning">
                      <Card.Body>
                        <h6>Medium Severity</h6>
                        <h4 className="text-warning">{anomalies.summary?.by_severity?.medium || 0}</h4>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center border-info">
                      <Card.Body>
                        <h6>Low Severity</h6>
                        <h4 className="text-info">{anomalies.summary?.by_severity?.low || 0}</h4>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Asset</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Detected At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.anomalies.map((anomaly, index) => (
                      <tr key={index}>
                        <td>
                          <Badge variant={anomaly.severity === 'HIGH' ? 'danger' : anomaly.severity === 'MEDIUM' ? 'warning' : 'info'}>
                            {anomaly.severity}
                          </Badge>
                        </td>
                        <td>{anomaly.asset_name}</td>
                        <td>{anomaly.type?.replace(/_/g, ' ')}</td>
                        <td>{anomaly.description}</td>
                        <td>{formatDate(anomaly.detected_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            ) : (
              <Alert variant="success">No anomalies detected in the last 7 days</Alert>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );

  const renderForecastsTab = () => (
    <div>
      {forecasts && (
        <Card>
          <Card.Header>
            <h5><FaChartLine className="me-2" />Performance Forecasts</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={4}>
                <Card className="mb-3">
                  <Card.Header className="bg-primary text-white">
                    <h6><FaCalendarAlt className="me-2" />Next 7 Days</h6>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Predicted Availability:</strong> {forecasts.forecasts?.next_7_days?.predicted_availability?.predicted_value}%</p>
                    <p><strong>Expected Stops:</strong> {forecasts.forecasts?.next_7_days?.expected_stops?.predicted_count}</p>
                    <p><strong>Confidence:</strong> {forecasts.forecasts?.next_7_days?.predicted_availability?.confidence_interval?.[0]}-{forecasts.forecasts?.next_7_days?.predicted_availability?.confidence_interval?.[1]}%</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="mb-3">
                  <Card.Header className="bg-info text-white">
                    <h6><FaCalendarAlt className="me-2" />Next 30 Days</h6>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Predicted Availability:</strong> {forecasts.forecasts?.next_30_days?.predicted_availability?.predicted_value}%</p>
                    <p><strong>Expected Stops:</strong> {forecasts.forecasts?.next_30_days?.expected_stops?.predicted_count}</p>
                    <p><strong>Confidence:</strong> {forecasts.forecasts?.next_30_days?.predicted_availability?.confidence_interval?.[0]}-{forecasts.forecasts?.next_30_days?.predicted_availability?.confidence_interval?.[1]}%</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="mb-3">
                  <Card.Header className="bg-success text-white">
                    <h6><FaCalendarAlt className="me-2" />Next 90 Days</h6>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Predicted Availability:</strong> {forecasts.forecasts?.next_90_days?.predicted_availability?.predicted_value}%</p>
                    <p><strong>Expected Stops:</strong> {forecasts.forecasts?.next_90_days?.expected_stops?.predicted_count}</p>
                    <p><strong>Confidence:</strong> {forecasts.forecasts?.next_90_days?.predicted_availability?.confidence_interval?.[0]}-{forecasts.forecasts?.next_90_days?.predicted_availability?.confidence_interval?.[1]}%</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            {forecasts.trend_analysis && (
              <Card className="mt-3">
                <Card.Header>
                  <h6>Trend Analysis</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p><strong>Overall Availability Trend:</strong> 
                        <Badge variant={forecasts.trend_analysis.overall_availability_trend === 'IMPROVING' ? 'success' : 
                                     forecasts.trend_analysis.overall_availability_trend === 'DECLINING' ? 'danger' : 'info'} className="ms-2">
                          {forecasts.trend_analysis.overall_availability_trend}
                        </Badge>
                      </p>
                      <p><strong>System Reliability Trend:</strong> 
                        <Badge variant={forecasts.trend_analysis.system_reliability_trend === 'IMPROVING' ? 'success' : 
                                     forecasts.trend_analysis.system_reliability_trend === 'DECLINING' ? 'danger' : 'info'} className="ms-2">
                          {forecasts.trend_analysis.system_reliability_trend}
                        </Badge>
                      </p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Seasonal Patterns:</strong> {forecasts.trend_analysis.seasonal_patterns?.daily_patterns}</p>
                      <p><strong>Correlation Analysis:</strong> {forecasts.trend_analysis.correlation_analysis?.asset_interdependencies}</p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><FaRobot className="me-2" />Advanced Analytics & Predictive Maintenance</h2>
            <div>
              <Form.Select 
                value={timeframe} 
                onChange={(e) => setTimeframe(parseInt(e.target.value))}
                style={{ width: '150px', display: 'inline-block', marginRight: '10px' }}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </Form.Select>
              <Button variant="outline-primary" onClick={loadInitialData} className="me-2">
                <FaRedo /> Refresh
              </Button>
              <Button variant="outline-success" onClick={exportReport}>
                <FaDownload /> Export Report
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading advanced analytics...</p>
        </div>
      ) : (
        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
          <Tab eventKey="predictive" title={<><FaRobot className="me-1" />Predictive Maintenance</>}>
            {renderPredictiveMaintenanceTab()}
          </Tab>
          <Tab eventKey="recommendations" title={<><FaTools className="me-1" />Recommendations</>}>
            {renderMaintenanceRecommendationsTab()}
          </Tab>
          <Tab eventKey="anomalies" title={<><FaBell className="me-1" />Anomalies</>}>
            {renderAnomaliesTab()}
          </Tab>
          <Tab eventKey="forecasts" title={<><FaChartLine className="me-1" />Forecasts</>}>
            {renderForecastsTab()}
          </Tab>
        </Tabs>
      )}
    </Container>
  );
};

export default AdvancedAnalyticsPage;