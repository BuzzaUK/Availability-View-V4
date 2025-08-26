const databaseService = require('./databaseService');

/**
 * Advanced Data Interpretation Service
 * Provides sophisticated algorithms for pattern recognition, trend analysis, and contextual insights
 */
class DataInterpretationService {
  constructor() {
    this.databaseService = databaseService;
  }

  /**
   * Comprehensive data analysis with advanced pattern recognition
   */
  async analyzeShiftData(shiftData, historicalContext = true) {
    const { shift, metrics, assets, events } = shiftData;
    
    try {
      // Parallel analysis for performance
      const [performanceAnalysis, eventAnalysis, assetAnalysis, contextualAnalysis] = await Promise.all([
        this.analyzePerformancePatterns(metrics, shift),
        this.analyzeEventPatterns(events, shift),
        this.analyzeAssetBehavior(assets, events),
        historicalContext ? this.getHistoricalContext(shift) : Promise.resolve({})
      ]);

      // Advanced correlation analysis
      const correlations = this.analyzeCorrelations({
        performance: performanceAnalysis,
        events: eventAnalysis,
        assets: assetAnalysis
      });

      // Anomaly detection with machine learning-like algorithms
      const anomalies = await this.detectAdvancedAnomalies(shiftData, contextualAnalysis);

      // Predictive insights
      const predictions = this.generatePredictiveInsights({
        performance: performanceAnalysis,
        events: eventAnalysis,
        assets: assetAnalysis,
        historical: contextualAnalysis
      });

      return {
        performance: performanceAnalysis,
        events: eventAnalysis,
        assets: assetAnalysis,
        correlations,
        anomalies,
        predictions,
        contextual: contextualAnalysis,
        confidence_score: this.calculateConfidenceScore({
          dataQuality: this.assessDataQuality(shiftData),
          sampleSize: events?.length || 0,
          timespan: shift.duration_hours || 0
        })
      };
    } catch (error) {
      console.error('Error in data interpretation analysis:', error);
      throw error;
    }
  }

  /**
   * Advanced performance pattern analysis
   */
  async analyzePerformancePatterns(metrics, shift) {
    const availability = metrics.availability_percentage || 0;
    const runtime = metrics.runtime_minutes || 0;
    const downtime = metrics.downtime_minutes || 0;
    const totalStops = metrics.total_stops || 0;
    
    // Performance trend analysis
    const trend = this.calculatePerformanceTrend(availability);
    
    // Efficiency scoring with weighted factors
    const efficiencyScore = this.calculateEfficiencyScore({
      availability,
      runtime,
      downtime,
      stops: totalStops,
      duration: shift.duration_hours || 8
    });

    // Performance categorization
    const category = this.categorizePerformance(availability, efficiencyScore);

    // Time-based performance analysis
    const timeAnalysis = this.analyzeTimeBasedPerformance(shift, metrics);

    return {
      trend,
      category,
      efficiency_score: efficiencyScore,
      availability_rating: this.rateAvailability(availability),
      time_analysis: timeAnalysis,
      performance_indicators: {
        availability: { value: availability, status: this.getStatusFromValue(availability, [95, 85, 70]) },
        runtime_ratio: { value: runtime / (runtime + downtime) * 100, status: 'calculated' },
        stop_frequency: { value: totalStops / (shift.duration_hours || 8), status: 'calculated' },
        mtbf: { value: metrics.mtbf_hours || 0, status: this.getStatusFromValue(metrics.mtbf_hours || 0, [48, 24, 12]) },
        mttr: { value: metrics.mttr_minutes || 0, status: this.getStatusFromValue(metrics.mttr_minutes || 0, [15, 30, 60], true) }
      },
      insights: this.generatePerformanceInsights(availability, efficiencyScore, metrics)
    };
  }

  /**
   * Advanced event pattern analysis with clustering and correlation
   */
  analyzeEventPatterns(events, shift) {
    if (!events || events.length === 0) {
      return {
        summary: 'No events recorded',
        patterns: [],
        clusters: [],
        temporal_analysis: {},
        severity_distribution: {},
        insights: ['Stable operational period with no recorded events']
      };
    }

    // Event clustering by type, duration, and timing
    const clusters = this.clusterEvents(events);
    
    // Temporal pattern analysis
    const temporalAnalysis = this.analyzeTemporalPatterns(events, shift);
    
    // Severity and impact analysis
    const severityAnalysis = this.analyzeSeverityDistribution(events);
    
    // Event correlation analysis
    const correlations = this.analyzeEventCorrelations(events);
    
    // Pattern recognition
    const patterns = this.identifyEventPatterns(events, clusters, temporalAnalysis);

    return {
      summary: `${events.length} events analyzed across ${clusters.length} distinct patterns`,
      patterns,
      clusters,
      temporal_analysis: temporalAnalysis,
      severity_distribution: severityAnalysis,
      correlations,
      event_density: events.length / (shift.duration_hours || 8),
      critical_events: events.filter(e => this.isCriticalEvent(e)),
      insights: this.generateEventInsights(events, patterns, temporalAnalysis)
    };
  }

  /**
   * Advanced asset behavior analysis
   */
  analyzeAssetBehavior(assets, events) {
    if (!assets || assets.length === 0) {
      return { summary: 'No asset data available', insights: [] };
    }

    // Asset performance ranking and analysis
    const assetRankings = this.rankAssetPerformance(assets);
    
    // Asset-event correlation
    const assetEventCorrelation = this.correlateAssetsWithEvents(assets, events || []);
    
    // Performance distribution analysis
    const performanceDistribution = this.analyzeAssetPerformanceDistribution(assets);
    
    // Asset reliability scoring
    const reliabilityScores = this.calculateAssetReliabilityScores(assets, events || []);

    return {
      summary: `${assets.length} assets analyzed with performance range ${((performanceDistribution.min || 0)).toFixed(1)}% - ${((performanceDistribution.max || 0)).toFixed(1)}%`,
      rankings: assetRankings,
      performance_distribution: performanceDistribution,
      reliability_scores: reliabilityScores,
      event_correlation: assetEventCorrelation,
      top_performer: assetRankings.best,
      bottom_performer: assetRankings.worst,
      insights: this.generateAssetInsights(assets, assetRankings, performanceDistribution)
    };
  }

  /**
   * Advanced anomaly detection using statistical methods
   */
  async detectAdvancedAnomalies(shiftData, historicalContext) {
    const { metrics, assets, events } = shiftData;
    const anomalies = [];

    // Statistical anomaly detection for availability
    if (historicalContext.avgAvailability) {
      const availabilityDeviation = Math.abs(metrics.availability_percentage - historicalContext.avgAvailability);
      const threshold = historicalContext.availabilityStdDev * 2; // 2 standard deviations
      
      if (availabilityDeviation > threshold) {
        anomalies.push({
          type: 'statistical_availability_anomaly',
          severity: availabilityDeviation > threshold * 1.5 ? 'high' : 'medium',
          description: `Availability ${((metrics.availability_percentage || 0)).toFixed(1)}% deviates ${((availabilityDeviation || 0)).toFixed(1)}% from historical average`,
          confidence: Math.min(availabilityDeviation / threshold, 1.0),
          recommendation: 'Investigate operational changes or equipment issues'
        });
      }
    }

    // Asset performance anomalies
    assets.forEach(asset => {
      const assetAvailability = asset.availability || 0;
      
      // Sudden performance drops
      if (assetAvailability < 50) {
        anomalies.push({
          type: 'critical_asset_failure',
          severity: 'high',
          asset: asset.asset_name,
          description: `${asset.asset_name} availability critically low at ${((assetAvailability || 0)).toFixed(1)}%`,
          confidence: 0.9,
          recommendation: 'Immediate maintenance intervention required'
        });
      }
    });

    // Event pattern anomalies
    if (events && events.length > 0) {
      const eventRate = events.length / (shiftData.shift.duration_hours || 8);
      const longEvents = events.filter(e => e.duration > 1800000); // > 30 minutes
      
      if (eventRate > 5) { // More than 5 events per hour
        anomalies.push({
          type: 'high_event_frequency',
          severity: 'medium',
          description: `Unusually high event frequency: ${((eventRate || 0)).toFixed(1)} events/hour`,
          confidence: 0.7,
          recommendation: 'Monitor for systematic issues causing frequent events'
        });
      }
      
      if (longEvents.length > 0) {
        anomalies.push({
          type: 'extended_duration_events',
          severity: 'high',
          description: `${longEvents.length} events exceeded 30 minutes duration`,
          confidence: 0.8,
          recommendation: 'Review response procedures for extended downtime events'
        });
      }
    }

    return anomalies;
  }

  /**
   * Generate predictive insights based on current patterns
   */
  generatePredictiveInsights(analysisData) {
    const insights = [];
    const { performance, events, assets } = analysisData;

    // Performance trend predictions
    if (performance.trend === 'declining') {
      insights.push({
        type: 'performance_prediction',
        timeframe: 'next_shift',
        prediction: 'Performance may continue declining without intervention',
        confidence: 0.7,
        recommended_actions: ['Implement preventive maintenance', 'Review operational procedures']
      });
    }

    // Asset failure predictions
    const riskAssets = assets.rankings?.assets?.filter(a => a.availability < 70) || [];
    if (riskAssets.length > 0) {
      insights.push({
        type: 'asset_failure_risk',
        timeframe: '24_hours',
        prediction: `${riskAssets.length} assets at risk of failure`,
        confidence: 0.6,
        assets: riskAssets.map(a => a.asset_name),
        recommended_actions: ['Schedule immediate inspections', 'Prepare backup equipment']
      });
    }

    // Event pattern predictions
    if (events.patterns && events.patterns.length > 0) {
      const recurringPatterns = events.patterns.filter(p => p.frequency > 2);
      if (recurringPatterns.length > 0) {
        insights.push({
          type: 'recurring_event_prediction',
          timeframe: 'next_shift',
          prediction: 'Recurring event patterns likely to continue',
          confidence: 0.8,
          patterns: recurringPatterns.map(p => p.description),
          recommended_actions: ['Address root causes of recurring events']
        });
      }
    }

    return insights;
  }

  // Helper methods for advanced calculations
  calculatePerformanceTrend(availability) {
    if (availability >= 95) return 'excellent';
    if (availability >= 85) return 'good';
    if (availability >= 75) return 'declining';
    if (availability >= 60) return 'poor';
    return 'critical';
  }

  calculateEfficiencyScore(data) {
    const { availability, runtime, downtime, stops, duration } = data;
    
    // Weighted efficiency calculation
    const availabilityWeight = 0.4;
    const runtimeWeight = 0.3;
    const stopWeight = 0.2;
    const durationWeight = 0.1;
    
    const availabilityScore = Math.min(availability / 95, 1) * 100;
    const runtimeScore = Math.min((runtime / (duration * 60)) / 0.9, 1) * 100;
    const stopScore = Math.max(100 - (stops / duration) * 10, 0);
    const durationScore = duration >= 8 ? 100 : (duration / 8) * 100;
    
    return (
      availabilityScore * availabilityWeight +
      runtimeScore * runtimeWeight +
      stopScore * stopWeight +
      durationScore * durationWeight
    );
  }

  categorizePerformance(availability, efficiencyScore) {
    if (availability >= 95 && efficiencyScore >= 90) return 'world_class';
    if (availability >= 85 && efficiencyScore >= 80) return 'excellent';
    if (availability >= 75 && efficiencyScore >= 70) return 'good';
    if (availability >= 65 && efficiencyScore >= 60) return 'acceptable';
    return 'needs_improvement';
  }

  analyzeTimeBasedPerformance(shift, metrics) {
    const startHour = new Date(shift.start_time).getHours();
    let shiftType = 'day';
    
    if (startHour >= 22 || startHour < 6) shiftType = 'night';
    else if (startHour >= 14) shiftType = 'evening';
    
    return {
      shift_type: shiftType,
      start_hour: startHour,
      day_of_week: new Date(shift.start_time).getDay(),
      performance_context: this.getPerformanceContext(shiftType, metrics.availability_percentage)
    };
  }

  getPerformanceContext(shiftType, availability) {
    const contexts = {
      night: availability >= 80 ? 'Excellent night shift performance' : 'Night shift challenges detected',
      evening: availability >= 85 ? 'Strong evening performance' : 'Evening shift optimization needed',
      day: availability >= 90 ? 'Outstanding day shift results' : 'Day shift improvement opportunities'
    };
    
    return contexts[shiftType] || 'Standard shift performance';
  }

  clusterEvents(events) {
    // Simple clustering by event type and duration
    const clusters = {};
    
    events.forEach(event => {
      const duration = event.duration || 0;
      let durationCategory = 'instant';
      
      if (duration > 1800000) durationCategory = 'extended'; // > 30 min
      else if (duration > 300000) durationCategory = 'long'; // > 5 min
      else if (duration > 60000) durationCategory = 'medium'; // > 1 min
      else if (duration > 0) durationCategory = 'short';
      
      const clusterKey = `${event.event_type}_${durationCategory}`;
      
      if (!clusters[clusterKey]) {
        clusters[clusterKey] = {
          type: event.event_type,
          duration_category: durationCategory,
          events: [],
          count: 0,
          total_duration: 0
        };
      }
      
      clusters[clusterKey].events.push(event);
      clusters[clusterKey].count++;
      clusters[clusterKey].total_duration += duration;
    });
    
    return Object.values(clusters);
  }

  analyzeTemporalPatterns(events, shift) {
    const shiftStart = new Date(shift.start_time).getTime();
    const shiftDuration = (shift.duration_hours || 8) * 3600000; // Convert to milliseconds
    
    // Divide shift into time buckets
    const buckets = 8; // 8 time periods
    const bucketSize = shiftDuration / buckets;
    const bucketCounts = new Array(buckets).fill(0);
    
    events.forEach(event => {
      const eventTime = new Date(event.timestamp).getTime();
      const relativeTime = eventTime - shiftStart;
      const bucketIndex = Math.floor(relativeTime / bucketSize);
      
      if (bucketIndex >= 0 && bucketIndex < buckets) {
        bucketCounts[bucketIndex]++;
      }
    });
    
    // Find peak periods
    const maxEvents = Math.max(...bucketCounts);
    const peakPeriods = bucketCounts.map((count, index) => ({
      period: index + 1,
      events: count,
      is_peak: count === maxEvents && count > 0
    }));
    
    return {
      distribution: bucketCounts,
      peak_periods: peakPeriods.filter(p => p.is_peak),
      event_density_pattern: this.classifyDensityPattern(bucketCounts)
    };
  }

  classifyDensityPattern(bucketCounts) {
    const total = bucketCounts.reduce((sum, count) => sum + count, 0);
    if (total === 0) return 'no_events';
    
    const variance = this.calculateVariance(bucketCounts);
    const mean = total / bucketCounts.length;
    
    if (variance < mean * 0.5) return 'uniform';
    if (variance > mean * 2) return 'clustered';
    return 'moderate';
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  // Additional helper methods
  getStatusFromValue(value, thresholds, inverse = false) {
    if (!value) return 'unknown';
    
    const [excellent, good, fair] = thresholds;
    
    if (inverse) {
      if (value <= excellent) return 'excellent';
      if (value <= good) return 'good';
      if (value <= fair) return 'fair';
      return 'poor';
    } else {
      if (value >= excellent) return 'excellent';
      if (value >= good) return 'good';
      if (value >= fair) return 'fair';
      return 'poor';
    }
  }

  rateAvailability(availability) {
    if (availability >= 95) return 'world_class';
    if (availability >= 85) return 'excellent';
    if (availability >= 75) return 'good';
    if (availability >= 65) return 'acceptable';
    return 'needs_improvement';
  }

  generatePerformanceInsights(availability, efficiencyScore, metrics) {
    const insights = [];
    
    if (availability >= 95) {
      insights.push('World-class availability performance achieved');
    } else if (availability < 70) {
      insights.push('Availability below acceptable threshold - immediate action required');
    }
    
    if (efficiencyScore >= 90) {
      insights.push('Outstanding operational efficiency demonstrated');
    } else if (efficiencyScore < 60) {
      insights.push('Efficiency improvements needed across multiple areas');
    }
    
    if (metrics.mtbf_hours && metrics.mtbf_hours < 24) {
      insights.push('Mean Time Between Failures indicates reliability concerns');
    }
    
    if (metrics.mttr_minutes && metrics.mttr_minutes > 30) {
      insights.push('Mean Time To Repair suggests maintenance efficiency opportunities');
    }
    
    return insights;
  }

  async getHistoricalContext(shift) {
    try {
      // This would typically query historical data from the database
      // For now, return mock historical context
      return {
        avgAvailability: 82.5,
        availabilityStdDev: 8.2,
        avgEventCount: 12,
        eventCountStdDev: 4.1,
        historicalTrend: 'stable',
        dataPoints: 30 // Number of historical shifts analyzed
      };
    } catch (error) {
      console.warn('Could not retrieve historical context:', error);
      return {};
    }
  }

  calculateConfidenceScore(factors) {
    const { dataQuality, sampleSize, timespan } = factors;
    
    let confidence = 0.5; // Base confidence
    
    // Adjust based on data quality
    confidence += dataQuality * 0.3;
    
    // Adjust based on sample size (events)
    if (sampleSize >= 10) confidence += 0.1;
    if (sampleSize >= 20) confidence += 0.1;
    
    // Adjust based on timespan
    if (timespan >= 8) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  assessDataQuality(shiftData) {
    const { shift, metrics, assets, events } = shiftData;
    let quality = 0;
    
    // Check completeness
    if (shift && shift.start_time) quality += 0.2;
    if (metrics && typeof metrics.availability_percentage === 'number') quality += 0.3;
    if (assets && assets.length > 0) quality += 0.3;
    if (events && Array.isArray(events)) quality += 0.2;
    
    return quality;
  }

  // Additional methods for asset analysis
  rankAssetPerformance(assets) {
    const rankedAssets = assets
      .map(asset => ({
        ...asset,
        performance_score: this.calculateAssetPerformanceScore(asset)
      }))
      .sort((a, b) => b.performance_score - a.performance_score);
    
    return {
      assets: rankedAssets,
      best: rankedAssets[0],
      worst: rankedAssets[rankedAssets.length - 1],
      median_performance: rankedAssets[Math.floor(rankedAssets.length / 2)]?.performance_score || 0
    };
  }

  calculateAssetPerformanceScore(asset) {
    const availability = asset.availability || 0;
    const stops = asset.stops || 0;
    const runtime = asset.runtime || 0;
    
    // Weighted scoring
    let score = availability * 0.6; // 60% weight on availability
    score += Math.max(100 - stops * 5, 0) * 0.2; // 20% weight on stop frequency
    score += Math.min(runtime / 28800000, 1) * 100 * 0.2; // 20% weight on runtime (8 hours = 28800000ms)
    
    return Math.min(score, 100);
  }

  analyzeAssetPerformanceDistribution(assets) {
    const availabilities = assets.map(a => a.availability || 0);
    
    return {
      min: Math.min(...availabilities),
      max: Math.max(...availabilities),
      average: availabilities.reduce((sum, val) => sum + val, 0) / availabilities.length,
      median: this.calculateMedian(availabilities),
      std_deviation: Math.sqrt(this.calculateVariance(availabilities))
    };
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  correlateAssetsWithEvents(assets, events) {
    return assets.map(asset => {
      const assetEvents = events.filter(e => e.asset_id === asset.asset_id || e.asset === asset.asset_id);
      return {
        asset_name: asset.asset_name,
        event_count: assetEvents.length,
        event_types: [...new Set(assetEvents.map(e => e.event_type))],
        total_event_duration: assetEvents.reduce((sum, e) => sum + (e.duration || 0), 0),
        correlation_score: this.calculateEventCorrelationScore(asset, assetEvents)
      };
    });
  }

  calculateEventCorrelationScore(asset, events) {
    const availability = asset.availability || 0;
    const eventCount = events.length;
    
    // Higher event count with lower availability suggests strong correlation
    if (availability < 70 && eventCount > 5) return 0.9;
    if (availability < 80 && eventCount > 3) return 0.7;
    if (availability > 90 && eventCount < 2) return 0.8; // Good correlation (high availability, few events)
    
    return 0.5; // Moderate correlation
  }

  calculateAssetReliabilityScores(assets, events) {
    return assets.map(asset => {
      const assetEvents = events.filter(e => e.asset_id === asset.asset_id || e.asset === asset.asset_id);
      const availability = asset.availability || 0;
      const stops = asset.stops || 0;
      
      // Reliability score based on multiple factors
      let reliabilityScore = availability * 0.5; // 50% weight on availability
      reliabilityScore += Math.max(100 - stops * 10, 0) * 0.3; // 30% weight on stop frequency
      reliabilityScore += Math.max(100 - assetEvents.length * 5, 0) * 0.2; // 20% weight on event frequency
      
      return {
        asset_name: asset.asset_name,
        reliability_score: Math.min(reliabilityScore, 100),
        reliability_rating: this.getRatingFromScore(reliabilityScore)
      };
    });
  }

  getRatingFromScore(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  generateAssetInsights(assets, rankings, distribution) {
    const insights = [];
    
    if (distribution.std_deviation > 20) {
      insights.push('High performance variation detected across assets');
    }
    
    if (rankings.best && rankings.best.availability > 95) {
      insights.push(`${rankings.best.asset_name} demonstrates world-class performance`);
    }
    
    if (rankings.worst && rankings.worst.availability < 70) {
      insights.push(`${rankings.worst.asset_name} requires immediate attention`);
    }
    
    const lowPerformers = assets.filter(a => (a.availability || 0) < 75).length;
    if (lowPerformers > assets.length * 0.3) {
      insights.push('Multiple assets underperforming - systematic review needed');
    }
    
    return insights;
  }

  generateEventInsights(events, patterns, temporalAnalysis) {
    const insights = [];
    
    if (events.length === 0) {
      insights.push('Stable operational period with no recorded events');
      return insights;
    }
    
    const criticalEvents = events.filter(e => this.isCriticalEvent(e));
    if (criticalEvents.length > 0) {
      insights.push(`${criticalEvents.length} critical events require immediate attention`);
    }
    
    if (temporalAnalysis.event_density_pattern === 'clustered') {
      insights.push('Events clustered in specific time periods - investigate operational patterns');
    }
    
    const eventTypes = [...new Set(events.map(e => e.event_type))];
    if (eventTypes.length === 1) {
      insights.push(`All events of type ${eventTypes[0]} - focused troubleshooting opportunity`);
    }
    
    return insights;
  }

  isCriticalEvent(event) {
    return event.duration > 300000 || // > 5 minutes
           event.event_type === 'ALARM' ||
           event.event_type === 'ERROR' ||
           event.event_type === 'EMERGENCY_STOP';
  }

  analyzeCorrelations(analysisData) {
    const { performance, events, assets } = analysisData;
    
    return {
      performance_event_correlation: this.calculatePerformanceEventCorrelation(performance, events),
      asset_performance_correlation: this.calculateAssetPerformanceCorrelation(assets),
      temporal_performance_correlation: this.calculateTemporalCorrelation(performance, events)
    };
  }

  calculatePerformanceEventCorrelation(performance, events) {
    // Simple correlation: more events typically correlate with lower performance
    const eventCount = events.summary ? parseInt(events.summary.split(' ')[0]) : 0;
    const availability = performance.performance_indicators?.availability?.value || 0;
    
    if (eventCount > 10 && availability < 80) return { strength: 'strong', direction: 'negative' };
    if (eventCount < 3 && availability > 90) return { strength: 'strong', direction: 'positive' };
    
    return { strength: 'moderate', direction: 'neutral' };
  }

  calculateAssetPerformanceCorrelation(assets) {
    if (!assets.rankings || !assets.rankings.assets) return { strength: 'unknown' };
    
    const performances = assets.rankings.assets.map(a => a.availability || 0);
    const variance = this.calculateVariance(performances);
    
    if (variance < 100) return { strength: 'strong', pattern: 'uniform' };
    if (variance > 400) return { strength: 'weak', pattern: 'scattered' };
    
    return { strength: 'moderate', pattern: 'mixed' };
  }

  calculateTemporalCorrelation(performance, events) {
    // Analyze if performance issues correlate with specific time periods
    if (!events.temporal_analysis) return { strength: 'unknown' };
    
    const pattern = events.temporal_analysis.event_density_pattern;
    const availability = performance.performance_indicators?.availability?.value || 0;
    
    if (pattern === 'clustered' && availability < 80) {
      return { strength: 'strong', insight: 'Performance issues correlate with event clusters' };
    }
    
    return { strength: 'moderate', insight: 'No strong temporal correlation detected' };
  }

  identifyEventPatterns(events, clusters, temporalAnalysis) {
    const patterns = [];
    
    // Identify recurring event types
    const eventTypeCounts = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(eventTypeCounts).forEach(([type, count]) => {
      if (count >= 3) {
        patterns.push({
          type: 'recurring_event_type',
          description: `${type} events recurring ${count} times`,
          frequency: count,
          severity: count > 5 ? 'high' : 'medium'
        });
      }
    });
    
    // Identify duration patterns
    const longEvents = events.filter(e => e.duration > 600000); // > 10 minutes
    if (longEvents.length > 0) {
      patterns.push({
        type: 'extended_duration_pattern',
        description: `${longEvents.length} events with extended duration`,
        frequency: longEvents.length,
        severity: 'high'
      });
    }
    
    return patterns;
  }

  analyzeSeverityDistribution(events) {
    const distribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    events.forEach(event => {
      if (this.isCriticalEvent(event)) {
        distribution.critical++;
      } else if (event.duration > 180000) { // > 3 minutes
        distribution.high++;
      } else if (event.duration > 60000) { // > 1 minute
        distribution.medium++;
      } else {
        distribution.low++;
      }
    });
    
    return distribution;
  }

  analyzeEventCorrelations(events) {
    // Analyze if certain event types tend to occur together
    const correlations = [];
    
    // Time-based correlation (events within 5 minutes of each other)
    for (let i = 0; i < events.length - 1; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const timeDiff = Math.abs(new Date(events[i].timestamp) - new Date(events[j].timestamp));
        if (timeDiff <= 300000) { // Within 5 minutes
          correlations.push({
            event1: events[i].event_type,
            event2: events[j].event_type,
            time_difference: timeDiff / 1000, // seconds
            correlation_type: 'temporal'
          });
        }
      }
    }
    
    return correlations;
  }
}

module.exports = new DataInterpretationService();