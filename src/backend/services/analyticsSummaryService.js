const databaseService = require('./databaseService');

/**
 * Service for generating natural language analytics summaries from archived event data
 */
class AnalyticsSummaryService {
  constructor() {
    this.databaseService = databaseService;
  }

  /**
   * Generate comprehensive natural language summary from archived shift data
   * @param {Object} archivedData - The archived shift data containing events and metadata
   * @param {Object} options - Options for summary generation
   * @returns {Object} Natural language summary with different detail levels
   */
  generateAnalyticsSummary(archivedData, options = {}) {
    try {
      const { events = [], shift_info = {}, assets_summary = {} } = archivedData;
      const { includeDetailed = true, includeRecommendations = true } = options;

      // Calculate comprehensive analytics
      const analytics = this.calculateComprehensiveAnalytics(events, shift_info, assets_summary);
      
      // Generate different summary levels
      const summary = {
        executive_summary: this.generateExecutiveSummary(analytics),
        detailed_summary: includeDetailed ? this.generateDetailedSummary(analytics) : null,
        performance_insights: this.generatePerformanceInsights(analytics),
        recommendations: includeRecommendations ? this.generateRecommendations(analytics) : null,
        key_metrics: analytics.keyMetrics,
        timestamp: new Date().toISOString()
      };

      return summary;
    } catch (error) {
      console.error('❌ Error generating analytics summary:', error.message);
      return {
        executive_summary: 'Unable to generate analytics summary due to data processing error.',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate comprehensive analytics from event data
   */
  calculateComprehensiveAnalytics(events, shiftInfo, assetsSummary) {
    const analytics = {
      shiftInfo: {
        name: shiftInfo.name || 'Unknown Shift',
        duration: this.calculateShiftDuration(shiftInfo),
        startTime: shiftInfo.start_time,
        endTime: shiftInfo.end_time
      },
      eventMetrics: this.calculateEventMetrics(events),
      assetMetrics: this.calculateAssetMetrics(events, assetsSummary),
      performanceMetrics: this.calculatePerformanceMetrics(events),
      downtimeAnalysis: this.calculateDowntimeAnalysis(events),
      productivityMetrics: this.calculateProductivityMetrics(events, shiftInfo)
    };

    // Calculate key performance indicators
    analytics.keyMetrics = this.calculateKeyMetrics(analytics);
    
    return analytics;
  }

  /**
   * Generate executive summary (brief, high-level overview)
   */
  generateExecutiveSummary(analytics) {
    const { shiftInfo, keyMetrics, assetMetrics } = analytics;
    
    const performanceLevel = this.getPerformanceLevel(keyMetrics.overallAvailability);
    const activeAssets = assetMetrics.totalAssets;
    const criticalIssues = keyMetrics.criticalStops;
    
    let summary = `${shiftInfo.name} completed with ${performanceLevel.toLowerCase()} performance. `;
    summary += `${activeAssets} assets monitored with ${((keyMetrics?.overallAvailability || 0)).toFixed(1)}% overall availability. `;
    
    if (criticalIssues > 0) {
      summary += `${criticalIssues} critical stops detected requiring attention. `;
    }
    
    if (keyMetrics.totalDowntime > 60) {
      summary += `Total downtime: ${Math.round(keyMetrics.totalDowntime)} minutes. `;
    }
    
    summary += `${keyMetrics.totalEvents} events processed during ${shiftInfo.duration}.`;
    
    return summary;
  }

  /**
   * Generate detailed summary with specific metrics
   */
  generateDetailedSummary(analytics) {
    const { shiftInfo, eventMetrics, assetMetrics, performanceMetrics, downtimeAnalysis } = analytics;
    
    let summary = `\n**Shift Overview:**\n`;
    summary += `• Duration: ${shiftInfo.duration}\n`;
    summary += `• Assets Active: ${assetMetrics.totalAssets}\n`;
    summary += `• Total Events: ${eventMetrics.totalEvents}\n\n`;
    
    summary += `**Performance Metrics:**\n`;
    summary += `• Overall Availability: ${(performanceMetrics.overallAvailability || 0).toFixed(1)}%\n`;
    summary += `• Total Runtime: ${Math.round(performanceMetrics.totalRuntime / 60)} minutes\n`;
    summary += `• Total Downtime: ${Math.round(performanceMetrics.totalDowntime / 60)} minutes\n`;
    summary += `• Total Stops: ${performanceMetrics.totalStops}\n\n`;
    
    if (downtimeAnalysis.longestStop > 300) {
      summary += `**Critical Issues:**\n`;
      summary += `• Longest Stop: ${Math.round(downtimeAnalysis.longestStop / 60)} minutes\n`;
    }
    
    if (assetMetrics.topPerformer) {
      summary += `• Top Performer: ${assetMetrics.topPerformer.name} (${(assetMetrics.topPerformer.availability || 0).toFixed(1)}% availability)\n`;
    }
    
    if (assetMetrics.needsAttention && assetMetrics.needsAttention.length > 0) {
      summary += `• Assets Needing Attention: ${assetMetrics.needsAttention.map(a => a.name).join(', ')}\n`;
    }
    
    return summary;
  }

  /**
   * Generate performance insights
   */
  generatePerformanceInsights(analytics) {
    const insights = [];
    const { keyMetrics, assetMetrics, downtimeAnalysis, performanceMetrics } = analytics;
    
    // Availability insights
    if (keyMetrics.overallAvailability >= 90) {
      insights.push('Excellent availability performance maintained throughout the shift.');
    } else if (keyMetrics.overallAvailability >= 75) {
      insights.push('Good availability with opportunities for optimization.');
    } else {
      insights.push('Below-target availability indicates significant operational challenges.');
    }
    
    // Downtime pattern insights
    if (downtimeAnalysis.shortStops > performanceMetrics.totalStops * 0.7) {
      insights.push('High frequency of short stops suggests potential minor issues or operator interventions.');
    }
    
    if (downtimeAnalysis.longestStop > 1800) { // 30 minutes
      insights.push('Extended downtime periods detected, indicating possible major equipment issues.');
    }
    
    // Asset performance insights
    if (assetMetrics.consistentPerformers > assetMetrics.totalAssets * 0.8) {
      insights.push('Most assets demonstrated consistent performance throughout the shift.');
    }
    
    if (assetMetrics.variablePerformers > 0) {
      insights.push(`${assetMetrics.variablePerformers} assets showed variable performance patterns.`);
    }
    
    return insights;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(analytics) {
    const recommendations = [];
    const { keyMetrics, downtimeAnalysis, assetMetrics } = analytics;
    
    // Availability-based recommendations
    if (keyMetrics.overallAvailability < 75) {
      recommendations.push('Priority: Investigate root causes of extended downtime periods.');
      recommendations.push('Consider implementing predictive maintenance strategies.');
    }
    
    // Downtime pattern recommendations
    if (downtimeAnalysis.shortStops > 10) {
      recommendations.push('Review operator procedures to minimize short stop frequency.');
    }
    
    if (downtimeAnalysis.longestStop > 1800) {
      recommendations.push('Conduct detailed analysis of extended downtime incidents.');
    }
    
    // Asset-specific recommendations
    if (assetMetrics.needsAttention && assetMetrics.needsAttention.length > 0) {
      recommendations.push(`Focus maintenance efforts on: ${assetMetrics.needsAttention.map(a => a.name).join(', ')}.`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue current operational practices - performance is within acceptable parameters.');
    }
    
    return recommendations;
  }

  /**
   * Calculate shift duration in human-readable format
   */
  calculateShiftDuration(shiftInfo) {
    if (!shiftInfo.start_time || !shiftInfo.end_time) {
      return 'Duration unavailable';
    }
    
    const start = new Date(shiftInfo.start_time);
    const end = new Date(shiftInfo.end_time);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  /**
   * Calculate event-based metrics
   */
  calculateEventMetrics(events) {
    const eventTypes = {};
    const stateChanges = events.filter(e => e.event_type === 'STATE_CHANGE');
    
    events.forEach(event => {
      eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
    });
    
    return {
      totalEvents: events.length,
      eventTypes,
      stateChanges: stateChanges.length,
      eventFrequency: events.length > 0 ? events.length / (events.length > 0 ? 1 : 1) : 0
    };
  }

  /**
   * Calculate asset-specific metrics
   */
  calculateAssetMetrics(events, assetsSummary) {
    const assets = assetsSummary.assets || [];
    const assetPerformance = [];
    
    assets.forEach(asset => {
      const assetEvents = events.filter(e => e.asset_id === asset.asset_id);
      const runtime = assetEvents
        .filter(e => e.event_type === 'STATE_CHANGE' && e.new_state === 'RUNNING')
        .reduce((sum, e) => sum + (e.duration || 0), 0);
      const downtime = assetEvents
        .filter(e => e.event_type === 'STATE_CHANGE' && e.new_state === 'STOPPED')
        .reduce((sum, e) => sum + (e.duration || 0), 0);
      
      const totalTime = runtime + downtime;
      const availability = totalTime > 0 ? (runtime / totalTime) * 100 : 0;
      
      assetPerformance.push({
        name: asset.asset_name,
        availability,
        runtime,
        downtime,
        events: assetEvents.length
      });
    });
    
    const topPerformer = assetPerformance.reduce((best, current) => 
      current.availability > (best?.availability || 0) ? current : best, null);
    
    const needsAttention = assetPerformance.filter(a => a.availability < 70);
    const consistentPerformers = assetPerformance.filter(a => a.availability >= 85).length;
    const variablePerformers = assetPerformance.filter(a => a.availability >= 70 && a.availability < 85).length;
    
    return {
      totalAssets: assets.length,
      assetPerformance,
      topPerformer,
      needsAttention,
      consistentPerformers,
      variablePerformers
    };
  }

  /**
   * Calculate overall performance metrics
   */
  calculatePerformanceMetrics(events) {
    const stateChangeEvents = events.filter(e => e.event_type === 'STATE_CHANGE');
    
    const totalRuntime = stateChangeEvents
      .filter(e => e.new_state === 'RUNNING')
      .reduce((sum, e) => sum + (e.duration || 0), 0);
    
    const totalDowntime = stateChangeEvents
      .filter(e => e.new_state === 'STOPPED')
      .reduce((sum, e) => sum + (e.duration || 0), 0);
    
    const totalStops = stateChangeEvents.filter(e => e.new_state === 'STOPPED').length;
    const totalTime = totalRuntime + totalDowntime;
    const overallAvailability = totalTime > 0 ? (totalRuntime / totalTime) * 100 : 0;
    
    return {
      totalRuntime,
      totalDowntime,
      totalStops,
      overallAvailability
    };
  }

  /**
   * Calculate downtime analysis
   */
  calculateDowntimeAnalysis(events) {
    const downtimeEvents = events.filter(e => 
      e.event_type === 'STATE_CHANGE' && e.new_state === 'STOPPED'
    );
    
    const durations = downtimeEvents.map(e => e.duration || 0);
    const shortStops = durations.filter(d => d < 300).length; // < 5 minutes
    const mediumStops = durations.filter(d => d >= 300 && d < 1800).length; // 5-30 minutes
    const longStops = durations.filter(d => d >= 1800).length; // > 30 minutes
    const longestStop = Math.max(...durations, 0);
    const averageStopDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    
    return {
      shortStops,
      mediumStops,
      longStops,
      longestStop,
      averageStopDuration
    };
  }

  /**
   * Calculate productivity metrics
   */
  calculateProductivityMetrics(events, shiftInfo) {
    const shiftDurationMs = shiftInfo.end_time && shiftInfo.start_time ? 
      new Date(shiftInfo.end_time) - new Date(shiftInfo.start_time) : 0;
    
    const eventsPerHour = shiftDurationMs > 0 ? 
      (events.length / (shiftDurationMs / (1000 * 60 * 60))) : 0;
    
    return {
      eventsPerHour: Math.round(eventsPerHour * 100) / 100,
      shiftDurationMs
    };
  }

  /**
   * Calculate key performance indicators
   */
  calculateKeyMetrics(analytics) {
    const { performanceMetrics, downtimeAnalysis, eventMetrics } = analytics;
    
    return {
      overallAvailability: performanceMetrics?.overallAvailability || 0,
      totalDowntime: performanceMetrics?.totalDowntime || 0,
      totalEvents: eventMetrics?.totalEvents || 0,
      criticalStops: downtimeAnalysis?.longStops || 0,
      averageStopDuration: downtimeAnalysis?.averageStopDuration || 0
    };
  }

  /**
   * Get performance level description
   */
  getPerformanceLevel(availability) {
    if (availability >= 90) return 'Excellent';
    if (availability >= 80) return 'Good';
    if (availability >= 70) return 'Fair';
    return 'Poor';
  }

  /**
   * Generate email-optimized summary (concise for email headers)
   */
  generateEmailSummary(archivedData, options = {}) {
    const summary = this.generateAnalyticsSummary(archivedData, { 
      includeDetailed: false, 
      includeRecommendations: false,
      ...options 
    });
    
    return {
      subject_line: this.generateEmailSubjectLine(summary),
      header_summary: summary.executive_summary,
      key_metrics: summary.key_metrics,
      top_insights: summary.performance_insights.slice(0, 3)
    };
  }

  /**
   * Generate dynamic email subject line based on performance
   */
  generateEmailSubjectLine(summary) {
    const availability = summary.key_metrics?.overallAvailability || 0;
    const performanceLevel = this.getPerformanceLevel(availability);
    
    if (availability >= 90) {
      return `✅ ${performanceLevel} Shift Performance`;
    } else if (availability >= 75) {
      return `⚠️ ${performanceLevel} Shift Performance`;
    } else {
      return `🚨 ${performanceLevel} Shift Performance - Attention Required`;
    }
  }
}

module.exports = new AnalyticsSummaryService();