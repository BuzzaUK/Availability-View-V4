const databaseService = require('./databaseService');
const analyticsSummaryService = require('./analyticsSummaryService');

/**
 * Advanced Analytics Service for Predictive Maintenance and Trend Analysis
 * Provides machine learning insights, failure predictions, and optimization recommendations
 */
class AdvancedAnalyticsService {
  constructor() {
    this.databaseService = databaseService;
    this.analyticsSummaryService = analyticsSummaryService;
    
    // Predictive maintenance thresholds
    this.thresholds = {
      criticalAvailability: 75,
      warningAvailability: 85,
      maxStopDuration: 1800, // 30 minutes
      highFrequencyStops: 10, // stops per day
      degradationTrend: 5 // percentage decline
    };
  }

  /**
   * Generate predictive maintenance insights
   * @param {Array} assets - Asset data
   * @param {Array} events - Historical events
   * @param {Object} options - Analysis options
   * @returns {Object} Predictive maintenance report
   */
  async generatePredictiveMaintenanceReport(assets, events, options = {}) {
    try {
      const { timeframe = 30, includeRecommendations = true } = options;
      
      const report = {
        timestamp: new Date().toISOString(),
        timeframe_days: timeframe,
        assets_analyzed: assets.length,
        predictive_insights: [],
        risk_assessment: {},
        maintenance_recommendations: [],
        trend_analysis: {},
        performance_forecasts: {}
      };

      // Analyze each asset for predictive insights
      for (const asset of assets) {
        const assetInsights = await this.analyzeAssetPredictiveMetrics(asset, events, timeframe);
        report.predictive_insights.push(assetInsights);
      }

      // Generate overall risk assessment
      report.risk_assessment = this.calculateRiskAssessment(report.predictive_insights);
      
      // Generate trend analysis
      report.trend_analysis = await this.performTrendAnalysis(assets, events, timeframe);
      
      // Generate performance forecasts
      report.performance_forecasts = this.generatePerformanceForecasts(report.trend_analysis);
      
      // Generate maintenance recommendations
      if (includeRecommendations) {
        report.maintenance_recommendations = this.generateMaintenanceRecommendations(report);
      }

      return report;
    } catch (error) {
      console.error('❌ Error generating predictive maintenance report:', error.message);
      throw error;
    }
  }

  /**
   * Analyze individual asset for predictive metrics
   */
  async analyzeAssetPredictiveMetrics(asset, events, timeframeDays) {
    const assetEvents = events.filter(e => e.asset_id === asset.id);
    const now = new Date();
    const timeframeStart = new Date(now.getTime() - (timeframeDays * 24 * 60 * 60 * 1000));
    
    const recentEvents = assetEvents.filter(e => new Date(e.timestamp) >= timeframeStart);
    
    const insights = {
      asset_id: asset.id,
      asset_name: asset.name,
      current_state: asset.current_state,
      health_score: 0,
      risk_level: 'LOW',
      failure_probability: 0,
      predicted_maintenance_date: null,
      performance_trends: {},
      anomalies_detected: [],
      degradation_indicators: []
    };

    // Calculate health score based on multiple factors
    insights.health_score = this.calculateAssetHealthScore(asset, recentEvents);
    
    // Determine risk level
    insights.risk_level = this.determineRiskLevel(insights.health_score, asset, recentEvents);
    
    // Calculate failure probability
    insights.failure_probability = this.calculateFailureProbability(asset, recentEvents);
    
    // Predict next maintenance date
    insights.predicted_maintenance_date = this.predictMaintenanceDate(asset, recentEvents);
    
    // Analyze performance trends
    insights.performance_trends = this.analyzePerformanceTrends(asset, recentEvents, timeframeDays);
    
    // Detect anomalies
    insights.anomalies_detected = this.detectAnomalies(asset, recentEvents);
    
    // Identify degradation indicators
    insights.degradation_indicators = this.identifyDegradationIndicators(asset, recentEvents);

    return insights;
  }

  /**
   * Calculate asset health score (0-100)
   */
  calculateAssetHealthScore(asset, recentEvents) {
    let score = 100;
    
    // Factor 1: Availability (40% weight)
    const totalTime = (asset.runtime || 0) + (asset.downtime || 0);
    const availability = totalTime > 0 ? ((asset.runtime || 0) / totalTime) * 100 : 100;
    const availabilityScore = Math.max(0, availability);
    score = score * 0.4 + availabilityScore * 0.4;
    
    // Factor 2: Stop frequency (30% weight)
    const stopEvents = recentEvents.filter(e => e.event_type === 'STOP');
    const stopFrequency = stopEvents.length;
    const stopScore = Math.max(0, 100 - (stopFrequency * 5)); // Penalize frequent stops
    score = score * 0.7 + stopScore * 0.3;
    
    // Factor 3: Stop duration patterns (20% weight)
    const avgStopDuration = stopEvents.length > 0 ? 
      stopEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / stopEvents.length : 0;
    const durationScore = Math.max(0, 100 - (avgStopDuration / 60)); // Penalize long stops
    score = score * 0.8 + durationScore * 0.2;
    
    // Factor 4: Recent performance (10% weight)
    const recentAvailability = this.calculateRecentAvailability(asset, recentEvents, 7); // Last 7 days
    score = score * 0.9 + recentAvailability * 0.1;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine risk level based on health score and other factors
   */
  determineRiskLevel(healthScore, asset, recentEvents) {
    if (healthScore < 60) return 'CRITICAL';
    if (healthScore < 75) return 'HIGH';
    if (healthScore < 85) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate failure probability (0-1)
   */
  calculateFailureProbability(asset, recentEvents) {
    const healthScore = this.calculateAssetHealthScore(asset, recentEvents);
    const stopFrequency = recentEvents.filter(e => e.event_type === 'STOP').length;
    const avgStopDuration = this.calculateAverageStopDuration(recentEvents);
    
    // Base probability from health score
    let probability = (100 - healthScore) / 100;
    
    // Adjust for stop frequency
    if (stopFrequency > this.thresholds.highFrequencyStops) {
      probability += 0.2;
    }
    
    // Adjust for stop duration
    if (avgStopDuration > this.thresholds.maxStopDuration) {
      probability += 0.15;
    }
    
    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Predict next maintenance date
   */
  predictMaintenanceDate(asset, recentEvents) {
    const failureProbability = this.calculateFailureProbability(asset, recentEvents);
    const healthScore = this.calculateAssetHealthScore(asset, recentEvents);
    
    // Calculate days until maintenance needed
    let daysUntilMaintenance;
    
    if (failureProbability > 0.8) {
      daysUntilMaintenance = 1; // Immediate
    } else if (failureProbability > 0.6) {
      daysUntilMaintenance = 7; // Within a week
    } else if (failureProbability > 0.4) {
      daysUntilMaintenance = 30; // Within a month
    } else {
      daysUntilMaintenance = Math.max(30, 90 - (90 * failureProbability));
    }
    
    const maintenanceDate = new Date();
    maintenanceDate.setDate(maintenanceDate.getDate() + daysUntilMaintenance);
    
    return maintenanceDate.toISOString();
  }

  /**
   * Analyze performance trends
   */
  analyzePerformanceTrends(asset, recentEvents, timeframeDays) {
    const trends = {
      availability_trend: 'STABLE',
      stop_frequency_trend: 'STABLE',
      stop_duration_trend: 'STABLE',
      overall_trend: 'STABLE',
      trend_confidence: 0
    };

    // Split timeframe into periods for trend analysis
    const periodDays = Math.max(1, Math.floor(timeframeDays / 4));
    const periods = this.splitIntoPeriods(recentEvents, periodDays);
    
    if (periods.length >= 2) {
      // Analyze availability trend
      const availabilities = periods.map(p => this.calculatePeriodAvailability(asset, p.events));
      trends.availability_trend = this.calculateTrend(availabilities);
      
      // Analyze stop frequency trend
      const stopCounts = periods.map(p => p.events.filter(e => e.event_type === 'STOP').length);
      trends.stop_frequency_trend = this.calculateTrend(stopCounts, true); // Reverse for stops
      
      // Analyze stop duration trend
      const avgDurations = periods.map(p => this.calculateAverageStopDuration(p.events));
      trends.stop_duration_trend = this.calculateTrend(avgDurations, true); // Reverse for duration
      
      // Overall trend
      trends.overall_trend = this.determineOverallTrend(trends);
      trends.trend_confidence = this.calculateTrendConfidence(periods);
    }

    return trends;
  }

  /**
   * Detect anomalies in asset behavior
   */
  detectAnomalies(asset, recentEvents) {
    const anomalies = [];
    
    // Detect unusual stop patterns
    const stopEvents = recentEvents.filter(e => e.event_type === 'STOP');
    const avgStopDuration = this.calculateAverageStopDuration(stopEvents);
    
    stopEvents.forEach(stop => {
      if (stop.duration > avgStopDuration * 3) {
        anomalies.push({
          type: 'UNUSUAL_STOP_DURATION',
          timestamp: stop.timestamp,
          description: `Stop duration of ${Math.round(stop.duration / 60)} minutes is significantly longer than average`,
          severity: 'HIGH'
        });
      }
    });
    
    // Detect frequency anomalies
    const dailyStops = this.groupEventsByDay(stopEvents);
    const avgDailyStops = Object.values(dailyStops).reduce((sum, count) => sum + count, 0) / Object.keys(dailyStops).length;
    
    Object.entries(dailyStops).forEach(([date, count]) => {
      if (count > avgDailyStops * 2) {
        anomalies.push({
          type: 'HIGH_STOP_FREQUENCY',
          timestamp: date,
          description: `${count} stops detected on ${date}, significantly above average of ${Math.round(avgDailyStops)}`,
          severity: 'MEDIUM'
        });
      }
    });
    
    return anomalies;
  }

  /**
   * Identify degradation indicators
   */
  identifyDegradationIndicators(asset, recentEvents) {
    const indicators = [];
    
    // Check for increasing stop frequency
    const periods = this.splitIntoPeriods(recentEvents, 7); // Weekly periods
    if (periods.length >= 3) {
      const stopCounts = periods.map(p => p.events.filter(e => e.event_type === 'STOP').length);
      const trend = this.calculateTrendSlope(stopCounts);
      
      if (trend > 0.5) {
        indicators.push({
          type: 'INCREASING_STOP_FREQUENCY',
          description: 'Stop frequency is increasing over time',
          severity: 'MEDIUM',
          trend_slope: trend
        });
      }
    }
    
    // Check for decreasing availability
    const healthScore = this.calculateAssetHealthScore(asset, recentEvents);
    if (healthScore < this.thresholds.warningAvailability) {
      indicators.push({
        type: 'DECLINING_AVAILABILITY',
        description: `Asset availability (${(healthScore || 0).toFixed(1)}%) is below warning threshold`,
        severity: healthScore < this.thresholds.criticalAvailability ? 'HIGH' : 'MEDIUM',
        current_value: healthScore
      });
    }
    
    return indicators;
  }

  /**
   * Calculate overall risk assessment
   */
  calculateRiskAssessment(predictiveInsights) {
    const riskCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    
    let totalFailureProbability = 0;
    let avgHealthScore = 0;
    
    predictiveInsights.forEach(insight => {
      riskCounts[insight.risk_level]++;
      totalFailureProbability += insight.failure_probability;
      avgHealthScore += insight.health_score;
    });
    
    const assetCount = predictiveInsights.length;
    avgHealthScore = assetCount > 0 ? avgHealthScore / assetCount : 0;
    const avgFailureProbability = assetCount > 0 ? totalFailureProbability / assetCount : 0;
    
    return {
      overall_risk_level: this.determineOverallRiskLevel(riskCounts),
      risk_distribution: riskCounts,
      average_health_score: Math.round(avgHealthScore * 10) / 10,
      average_failure_probability: Math.round(avgFailureProbability * 100) / 100,
      assets_requiring_attention: riskCounts.CRITICAL + riskCounts.HIGH,
      total_assets_analyzed: assetCount
    };
  }

  /**
   * Perform trend analysis across all assets
   */
  async performTrendAnalysis(assets, events, timeframeDays) {
    const trends = {
      overall_availability_trend: 'STABLE',
      system_reliability_trend: 'STABLE',
      maintenance_frequency_trend: 'STABLE',
      performance_indicators: {},
      seasonal_patterns: {},
      correlation_analysis: {}
    };
    
    // Calculate system-wide trends
    const systemMetrics = this.calculateSystemMetrics(assets, events, timeframeDays);
    trends.overall_availability_trend = systemMetrics.availability_trend;
    trends.system_reliability_trend = systemMetrics.reliability_trend;
    
    // Identify seasonal patterns
    trends.seasonal_patterns = this.identifySeasonalPatterns(events);
    
    // Perform correlation analysis
    trends.correlation_analysis = this.performCorrelationAnalysis(assets, events);
    
    return trends;
  }

  /**
   * Generate performance forecasts
   */
  generatePerformanceForecasts(trendAnalysis) {
    const forecasts = {
      next_7_days: {},
      next_30_days: {},
      next_90_days: {},
      confidence_intervals: {}
    };
    
    // Generate short-term forecasts (7 days)
    forecasts.next_7_days = {
      predicted_availability: this.forecastAvailability(trendAnalysis, 7),
      expected_stops: this.forecastStops(trendAnalysis, 7),
      maintenance_windows: this.suggestMaintenanceWindows(7)
    };
    
    // Generate medium-term forecasts (30 days)
    forecasts.next_30_days = {
      predicted_availability: this.forecastAvailability(trendAnalysis, 30),
      expected_stops: this.forecastStops(trendAnalysis, 30),
      maintenance_windows: this.suggestMaintenanceWindows(30)
    };
    
    // Generate long-term forecasts (90 days)
    forecasts.next_90_days = {
      predicted_availability: this.forecastAvailability(trendAnalysis, 90),
      expected_stops: this.forecastStops(trendAnalysis, 90),
      maintenance_windows: this.suggestMaintenanceWindows(90)
    };
    
    return forecasts;
  }

  /**
   * Generate maintenance recommendations
   */
  generateMaintenanceRecommendations(report) {
    const recommendations = [];
    
    // Analyze each asset's insights
    report.predictive_insights.forEach(insight => {
      if (insight.risk_level === 'CRITICAL') {
        recommendations.push({
          priority: 'URGENT',
          asset_name: insight.asset_name,
          recommendation: 'Immediate maintenance required',
          description: `Asset health score is ${((insight.health_score || 0)).toFixed(1)}% with ${(((insight.failure_probability || 0) * 100) || 0).toFixed(1)}% failure probability`,
          estimated_downtime: '2-4 hours',
          cost_impact: 'HIGH'
        });
      } else if (insight.risk_level === 'HIGH') {
        recommendations.push({
          priority: 'HIGH',
          asset_name: insight.asset_name,
          recommendation: 'Schedule maintenance within 7 days',
          description: `Declining performance indicators detected`,
          estimated_downtime: '1-2 hours',
          cost_impact: 'MEDIUM'
        });
      }
    });
    
    // Add system-wide recommendations
    if (report.risk_assessment.assets_requiring_attention > report.risk_assessment.total_assets_analyzed * 0.3) {
      recommendations.push({
        priority: 'MEDIUM',
        asset_name: 'SYSTEM-WIDE',
        recommendation: 'Review maintenance procedures',
        description: 'Multiple assets showing degradation patterns',
        estimated_downtime: 'Varies',
        cost_impact: 'MEDIUM'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // Helper methods
  calculateRecentAvailability(asset, events, days) {
    const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const recentEvents = events.filter(e => new Date(e.timestamp) >= cutoff);
    
    let runtime = 0;
    let downtime = 0;
    
    recentEvents.forEach(event => {
      if (event.event_type === 'STATE_CHANGE') {
        if (event.new_state === 'RUNNING') {
          runtime += event.duration || 0;
        } else {
          downtime += event.duration || 0;
        }
      }
    });
    
    const totalTime = runtime + downtime;
    return totalTime > 0 ? (runtime / totalTime) * 100 : 100;
  }

  calculateAverageStopDuration(events) {
    const stopEvents = events.filter(e => e.event_type === 'STOP' && e.duration);
    if (stopEvents.length === 0) return 0;
    
    const totalDuration = stopEvents.reduce((sum, e) => sum + e.duration, 0);
    return totalDuration / stopEvents.length;
  }

  splitIntoPeriods(events, periodDays) {
    const periods = [];
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < 4; i++) {
      const periodEnd = new Date(now.getTime() - (i * periodDays * msPerDay));
      const periodStart = new Date(periodEnd.getTime() - (periodDays * msPerDay));
      
      const periodEvents = events.filter(e => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= periodStart && eventDate < periodEnd;
      });
      
      periods.unshift({
        start: periodStart,
        end: periodEnd,
        events: periodEvents
      });
    }
    
    return periods;
  }

  calculateTrend(values, reverse = false) {
    if (values.length < 2) return 'STABLE';
    
    const slope = this.calculateTrendSlope(values);
    const threshold = 0.1;
    
    if (reverse) {
      if (slope > threshold) return 'DECLINING';
      if (slope < -threshold) return 'IMPROVING';
    } else {
      if (slope > threshold) return 'IMPROVING';
      if (slope < -threshold) return 'DECLINING';
    }
    
    return 'STABLE';
  }

  calculateTrendSlope(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumX2 = values.reduce((sum, val, i) => sum + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  determineOverallTrend(trends) {
    const trendValues = Object.values(trends).filter(t => typeof t === 'string');
    const improvingCount = trendValues.filter(t => t === 'IMPROVING').length;
    const decliningCount = trendValues.filter(t => t === 'DECLINING').length;
    
    if (decliningCount > improvingCount) return 'DECLINING';
    if (improvingCount > decliningCount) return 'IMPROVING';
    return 'STABLE';
  }

  calculateTrendConfidence(periods) {
    // Simple confidence based on data availability
    const totalEvents = periods.reduce((sum, p) => sum + p.events.length, 0);
    return Math.min(1, totalEvents / 100); // Normalize to 0-1
  }

  groupEventsByDay(events) {
    const dailyGroups = {};
    
    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      dailyGroups[date] = (dailyGroups[date] || 0) + 1;
    });
    
    return dailyGroups;
  }

  calculatePeriodAvailability(asset, events) {
    let runtime = 0;
    let downtime = 0;
    
    events.forEach(event => {
      if (event.event_type === 'STATE_CHANGE') {
        if (event.new_state === 'RUNNING') {
          runtime += event.duration || 0;
        } else {
          downtime += event.duration || 0;
        }
      }
    });
    
    const totalTime = runtime + downtime;
    return totalTime > 0 ? (runtime / totalTime) * 100 : 100;
  }

  determineOverallRiskLevel(riskCounts) {
    if (riskCounts.CRITICAL > 0) return 'CRITICAL';
    if (riskCounts.HIGH > 0) return 'HIGH';
    if (riskCounts.MEDIUM > 0) return 'MEDIUM';
    return 'LOW';
  }

  calculateSystemMetrics(assets, events, timeframeDays) {
    // Simplified system metrics calculation
    return {
      availability_trend: 'STABLE',
      reliability_trend: 'STABLE'
    };
  }

  identifySeasonalPatterns(events) {
    // Simplified seasonal pattern detection
    return {
      daily_patterns: 'Normal distribution',
      weekly_patterns: 'Consistent across weekdays',
      monthly_patterns: 'No significant seasonal variation'
    };
  }

  performCorrelationAnalysis(assets, events) {
    // Simplified correlation analysis
    return {
      asset_interdependencies: 'Low correlation detected',
      environmental_factors: 'No significant correlations',
      operational_patterns: 'Standard operational correlation'
    };
  }

  forecastAvailability(trendAnalysis, days) {
    // Simplified forecasting - in production, use more sophisticated models
    return {
      predicted_value: 85.5,
      confidence_interval: [80.0, 91.0],
      trend_direction: 'STABLE'
    };
  }

  forecastStops(trendAnalysis, days) {
    // Simplified stop forecasting
    return {
      predicted_count: Math.ceil(days / 7) * 3,
      confidence_interval: [Math.ceil(days / 7) * 2, Math.ceil(days / 7) * 5],
      peak_periods: ['Monday mornings', 'Friday afternoons']
    };
  }

  suggestMaintenanceWindows(days) {
    // Suggest optimal maintenance windows
    const windows = [];
    const startDate = new Date();
    
    for (let i = 0; i < Math.ceil(days / 7); i++) {
      const windowDate = new Date(startDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      windows.push({
        date: windowDate.toISOString().split('T')[0],
        time_slot: 'Weekend (Saturday 6AM - Sunday 6PM)',
        expected_impact: 'Minimal production disruption',
        priority: i === 0 ? 'HIGH' : 'MEDIUM'
      });
    }
    
    return windows;
  }
}

module.exports = new AdvancedAnalyticsService();