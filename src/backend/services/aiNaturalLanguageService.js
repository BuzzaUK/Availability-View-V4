// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const OpenAI = require('openai');
const databaseService = require('./databaseService');
const dataInterpretationService = require('./dataInterpretationService');
const { formatMillisecondsToHMS, formatMinutesToHMS, formatTimestampToHMS, formatDuration, formatDurationNarrative } = require('../utils/timeFormatter');

class AINaturalLanguageService {
  constructor() {
    // Initialize OpenAI client - will use environment variable OPENAI_API_KEY
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
    });
    
    this.databaseService = databaseService;
  }

  /**
   * Generate AI-driven natural language shift report
   */
  async generateIntelligentShiftReport(shiftData, options = {}) {
    try {
      const { shift, metrics, assets, events } = shiftData;
      
      // Use advanced data interpretation service for comprehensive analysis
      const advancedInsights = await dataInterpretationService.analyzeShiftData(shiftData, true);
      
      // Combine with existing pattern analysis
      const basicInsights = await this.analyzeDataPatterns(shiftData);
      const dataInsights = { ...basicInsights, advanced: advancedInsights };
      
      // Generate contextual narrative sections with enhanced insights
      // Combine multiple sections into fewer API calls for better performance
      const [mainReport, recommendations] = await Promise.all([
        this.generateCombinedMainReport(shiftData, dataInsights),
        this.generateIntelligentRecommendations(shiftData, dataInsights)
      ]);
      
      const narrative = {
        executive_summary: mainReport.executive_summary,
        shift_overview: mainReport.shift_overview,
        asset_performance: mainReport.asset_performance,
        key_events: mainReport.key_events,
        recommendations: recommendations,
        conclusion: mainReport.conclusion
      };
      
      return {
        success: true,
        shift_id: shift.id,
        report_type: 'ai_natural_language',
        generated_at: new Date().toISOString(),
        narrative: narrative,
        data_insights: options.includeInsights ? dataInsights : null,
        raw_data: options.includeRawData ? shiftData : null
      };
      
    } catch (error) {
      console.error('Error generating AI natural language report:', error);
      throw error;
    }
  }

  /**
   * Analyze data patterns to extract intelligent insights
   */
  async analyzeDataPatterns(shiftData) {
    const { shift, metrics, assets, events } = shiftData;
    
    const insights = {
      performance_trends: this.analyzePerformanceTrends(metrics, assets),
      event_patterns: this.analyzeEventPatterns(events),
      asset_behavior: this.analyzeAssetBehavior(assets, events),
      anomalies: this.detectAnomalies(shiftData),
      efficiency_factors: this.identifyEfficiencyFactors(shiftData),
      contextual_factors: await this.getContextualFactors(shift)
    };
    
    return insights;
  }

  /**
   * Generate combined main report sections in a single API call for better performance
   */
  async generateCombinedMainReport(shiftData, insights) {
    const { shift, metrics, assets, events } = shiftData;
    
    const prompt = `
Generate a comprehensive manufacturing shift report with the following data:

Shift Information:
- Shift: ${shift.shift_name || 'Unknown Shift'}
- Duration: ${(shift.duration_hours || 0).toFixed(1)} hours
- Date: ${new Date(shift.start_time).toLocaleDateString()}

Key Metrics:
- Overall Availability: ${(metrics.availability_percentage || 0).toFixed(1)}%
- Total Runtime: ${formatMinutesToHMS(metrics.runtime_minutes || 0)}
- Total Downtime: ${formatMinutesToHMS(metrics.downtime_minutes || 0)}
- Total Stops: ${metrics.total_stops || 0}

Asset Performance:
${assets.map(asset => `- ${asset.asset_name}: ${(asset.availability || 0).toFixed(1)}% availability`).join('\n')}

Please provide the report in the following JSON format:
{
  "executive_summary": "Professional executive summary (2-3 sentences highlighting key performance metrics and business impact)",
  "shift_overview": "Comprehensive shift overview (3-4 paragraphs covering timeline, operational periods, event patterns, and performance context)",
  "asset_performance": "Asset performance analysis (3-4 paragraphs comparing asset performance, identifying patterns, and providing maintenance insights)",
  "key_events": "Key events analysis (3-4 paragraphs summarizing event timeline, impact analysis, and operational insights)",
  "conclusion": "Comprehensive conclusion (2-3 paragraphs with performance summary, achievements, improvements, and next steps)"
}

Use professional manufacturing terminology and focus on actionable insights.`;

    try {
      // Add timeout wrapper for OpenAI API call (increased to 90 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI API timeout after 90 seconds')), 90000);
      });
      
      const apiPromise = this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "You are an expert manufacturing analyst. Generate comprehensive shift reports in valid JSON format only. Do not include any text outside the JSON structure."
        }, {
          role: "user",
          content: prompt
        }],
        max_tokens: 2000,
        temperature: 0.3
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      const content = response.choices[0].message.content.trim();
      
      // Parse JSON response
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing AI JSON response:', parseError);
        return this.generateFallbackMainReport(shiftData, insights);
      }
      
    } catch (error) {
      console.error('Error generating AI combined main report:', error);
      return this.generateFallbackMainReport(shiftData, insights);
    }
  }

  /**
   * Generate fallback main report when AI fails
   */
  generateFallbackMainReport(shiftData, insights) {
    return {
      executive_summary: this.generateFallbackExecutiveSummary(shiftData, insights),
      shift_overview: this.generateFallbackShiftOverview(shiftData, insights),
      asset_performance: this.generateFallbackAssetAnalysis(shiftData, insights),
      key_events: this.generateFallbackEventsAnalysis(shiftData, insights),
      conclusion: this.generateFallbackConclusion(shiftData, insights)
    };
  }

  /**
   * Generate AI-powered executive summary
   */
  async generateExecutiveSummary(shiftData, insights) {
    const { shift, metrics, assets } = shiftData;
    
    const prompt = `
Generate a professional executive summary for a manufacturing shift report with the following data:

Shift Information:
- Shift: ${shift.shift_name || 'Unknown Shift'}
- Duration: ${(shift.duration_hours || 0).toFixed(1)} hours
- Date: ${new Date(shift.start_time).toLocaleDateString()}

Key Metrics:
- Overall Availability: ${(metrics.availability_percentage || 0).toFixed(1)}%
- Total Runtime: ${formatMinutesToHMS(metrics.runtime_minutes || 0)}
- Total Downtime: ${formatMinutesToHMS(metrics.downtime_minutes || 0)}
- Total Stops: ${metrics.total_stops || 0}

Asset Performance:
${assets.map(asset => `- ${asset.asset_name}: ${(asset.availability || 0).toFixed(1)}% availability`).join('\n')}

Data Insights:
- Performance Trend: ${insights.performance_trends.trend}
- Key Anomalies: ${insights.anomalies.length} detected
- Efficiency Rating: ${insights.efficiency_factors.rating}
- Advanced Analytics: ${insights.advanced?.performance?.category || 'N/A'}
- Confidence Score: ${insights.advanced?.confidence_score || 0}

Generate a concise, professional executive summary (2-3 paragraphs) that:
1. Highlights overall performance with specific metrics
2. Identifies key achievements or concerns
3. Provides actionable insights for management

Use professional manufacturing terminology and focus on business impact.`;

    try {
      // Add timeout wrapper for OpenAI API call (increased to 60 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI API timeout after 60 seconds')), 60000);
      });
      
      const apiPromise = this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "You are an expert manufacturing analyst generating executive summaries for shift reports. Focus on clear, actionable insights with specific metrics."
        }, {
          role: "user",
          content: prompt
        }],
        max_tokens: 500,
        temperature: 0.3
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI executive summary:', error);
      return this.generateFallbackExecutiveSummary(shiftData, insights);
    }
  }

  /**
   * Generate AI-powered shift overview
   */
  async generateShiftOverview(shiftData, insights) {
    const { shift, metrics, events } = shiftData;
    
    const prompt = `
Generate a detailed shift overview for the following manufacturing shift:

Shift Details:
- Name: ${shift.shift_name || 'Unknown Shift'}
- Start: ${new Date(shift.start_time).toLocaleString()}
- End: ${shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Ongoing'}
- Duration: ${(shift.duration_hours || 0).toFixed(1)} hours

Operational Metrics:
- Total Events: ${events?.length || 0}
- Runtime: ${formatMinutesToHMS(metrics.runtime_minutes || 0)}
- Downtime: ${formatMinutesToHMS(metrics.downtime_minutes || 0)}
- Availability: ${(metrics.availability_percentage || 0).toFixed(1)}%

Event Distribution:
${this.getEventDistribution(events)}

Contextual Factors:
${insights.contextual_factors.summary}

Advanced Performance Analysis:
${insights.advanced?.performance?.summary || 'Standard analysis applied'}

Temporal Patterns:
${insights.advanced?.events?.temporal_analysis?.summary || 'No advanced temporal patterns detected'}

Generate a comprehensive shift overview (3-4 paragraphs) that:
1. Summarizes the shift timeline and key operational periods
2. Analyzes the event distribution and patterns
3. Contextualizes performance within operational factors
4. Highlights notable operational achievements or challenges

Use technical but accessible language suitable for operations managers.`;

    try {
      // Add timeout wrapper for OpenAI API call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI API timeout after 60 seconds')), 60000);
      });
      
      const apiPromise = this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "You are a manufacturing operations analyst providing detailed shift overviews. Focus on operational context and timeline analysis."
        }, {
          role: "user",
          content: prompt
        }],
        max_tokens: 600,
        temperature: 0.4
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI shift overview:', error);
      return this.generateFallbackShiftOverview(shiftData, insights);
    }
  }

  /**
   * Generate AI-powered asset performance analysis
   */
  async generateAssetPerformanceAnalysis(shiftData, insights) {
    const { assets, events } = shiftData;
    
    const assetAnalysis = assets.map(asset => {
      const assetEvents = events?.filter(e => e.asset_id === asset.asset_id || e.asset === asset.asset_id) || [];
      return {
        name: asset.asset_name,
        availability: asset.availability,
        stops: asset.stops,
        runtime: asset.runtime,
        events: assetEvents.length,
        performance_rating: this.getAssetPerformanceRating(asset)
      };
    });
    
    const prompt = `
Analyze the performance of manufacturing assets during this shift:

${assetAnalysis.map(asset => `
Asset: ${asset.name}
- Availability: ${(asset.availability || 0).toFixed(1)}%
- Stops: ${asset.stops}
- Runtime: ${formatMillisecondsToHMS(asset.runtime)}
- Events: ${asset.events}
- Performance Rating: ${asset.performance_rating}`).join('\n')}

Asset Behavior Insights:
${insights.asset_behavior.summary}

Performance Trends:
${insights.performance_trends.details}

Advanced Asset Analysis:
${insights.advanced?.assets?.summary || 'Standard asset analysis applied'}

Reliability Scores:
${insights.advanced?.assets?.reliability_scores?.map(score => `- ${score.asset_name}: ${score.score}`).join('\n') || 'No reliability scores available'}

Asset Correlations:
${insights.advanced?.correlations?.asset_correlations?.map(corr => `- ${corr.description}`).join('\n') || 'No significant correlations detected'}

Generate a comprehensive asset performance analysis (3-4 paragraphs) that:
1. Compares asset performance and identifies top/bottom performers
2. Analyzes performance patterns and correlations
3. Identifies specific asset issues or achievements
4. Provides asset-specific insights and observations

Focus on actionable insights for maintenance and operations teams.`;

    try {
      // Add timeout wrapper for OpenAI API call (increased to 60 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI API timeout after 60 seconds')), 60000);
      });
      
      const apiPromise = this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "You are a maintenance and reliability engineer analyzing asset performance. Provide technical insights with practical recommendations."
        }, {
          role: "user",
          content: prompt
        }],
        max_tokens: 700,
        temperature: 0.3
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI asset performance analysis:', error);
      return this.generateFallbackAssetAnalysis(shiftData, insights);
    }
  }

  /**
   * Generate AI-powered key events analysis
   */
  async generateKeyEventsAnalysis(shiftData, insights) {
    const { events } = shiftData;
    
    if (!events || events.length === 0) {
      return "**Key Events Analysis**\n\nNo significant events were recorded during this shift, indicating stable operational conditions.";
    }
    
    const eventSummary = this.summarizeEvents(events);
    
    const prompt = `
Analyze the key events that occurred during this manufacturing shift:

Event Summary:
- Total Events: ${events.length}
- Event Types: ${Object.keys(eventSummary.byType).join(', ')}
- Critical Events: ${eventSummary.critical.length}
- Duration Range: ${eventSummary.durationRange}

Event Patterns:
${insights.event_patterns.summary}

Advanced Event Analysis:
${insights.advanced?.events?.summary || 'Standard event analysis applied'}

Detected Patterns:
${insights.advanced?.events?.patterns?.map(pattern => `- ${pattern.type}: ${pattern.description}`).join('\n') || 'No advanced patterns detected'}

Event Correlations:
${insights.advanced?.events?.correlations?.map(corr => `- ${corr.description}`).join('\n') || 'No event correlations found'}

Critical Events:
${eventSummary.critical.map(event => `- ${formatTimestampToHMS(event.timestamp)}: ${event.asset_name} - ${event.event_type} (${event.duration ? formatMillisecondsToHMS(event.duration) : 'instant'})`).join('\n')}

Event Distribution by Type:
${Object.entries(eventSummary.byType).map(([type, count]) => `- ${type}: ${count} events`).join('\n')}

Generate a detailed key events analysis (3-4 paragraphs) that:
1. Summarizes the event timeline and frequency patterns
2. Analyzes the impact of critical events on operations
3. Identifies event correlations and root cause indicators
4. Highlights unusual patterns or recurring issues

Provide insights that help operations teams understand event causality.`;

    try {
      // Add timeout wrapper for OpenAI API call (increased to 60 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI API timeout after 60 seconds')), 60000);
      });
      
      const apiPromise = this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "You are a process improvement specialist analyzing operational events. Focus on patterns, causality, and operational impact."
        }, {
          role: "user",
          content: prompt
        }],
        max_tokens: 700,
        temperature: 0.4
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI key events analysis:', error);
      return this.generateFallbackEventsAnalysis(shiftData, insights);
    }
  }

  /**
   * Generate AI-powered intelligent recommendations
   */
  async generateIntelligentRecommendations(shiftData, insights) {
    const { shift, metrics, assets, events } = shiftData;
    
    const prompt = `
Generate intelligent recommendations for improving manufacturing operations based on this shift analysis:

Performance Summary:
- Overall Availability: ${(metrics.availability_percentage || 0).toFixed(1)}%
- Total Stops: ${metrics.total_stops}
- Downtime: ${formatMinutesToHMS(metrics.downtime_minutes || 0)}

Key Insights:
- Performance Trend: ${insights.performance_trends.trend}
- Detected Anomalies: ${insights.anomalies.length}
- Efficiency Rating: ${insights.efficiency_factors.rating}
- Critical Event Patterns: ${insights.event_patterns.criticalPatterns}

Advanced Analytics:
- Performance Category: ${insights.advanced?.performance?.category || 'Standard'}
- Predictive Insights: ${insights.advanced?.predictions?.length || 0} predictions available
- Asset Rankings: ${Object.keys(insights.advanced?.assets?.rankings || {}).length} assets ranked
- Confidence Score: ${insights.advanced?.confidence_score || 0}

Asset Issues:
${assets.filter(a => (a.availability || 0) < 80).map(a => `- ${a.asset_name}: ${(a.availability || 0).toFixed(1)}% availability`).join('\n') || 'No significant asset issues detected'}

Generate 4-6 specific, actionable recommendations that:
1. Address the most critical performance issues identified
2. Leverage the detected patterns and insights
3. Provide both immediate and long-term improvement strategies
4. Include specific metrics or targets where applicable
5. Consider resource requirements and implementation feasibility

Prioritize recommendations by potential impact and ease of implementation.`;

    try {
      // Add timeout wrapper for OpenAI API call (increased to 60 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI API timeout after 60 seconds')), 60000);
      });
      
      const apiPromise = this.openai.chat.completions.create({
          model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "You are a lean manufacturing consultant providing actionable improvement recommendations. Focus on practical, measurable solutions."
        }, {
          role: "user",
          content: prompt
        }],
        max_tokens: 800,
        temperature: 0.3
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return this.generateFallbackRecommendations(shiftData, insights);
    }
  }

  /**
   * Generate AI-powered contextual conclusion
   */
  async generateContextualConclusion(shiftData, insights) {
    const { shift, metrics, assets } = shiftData;
    
    const prompt = `
Generate a contextual conclusion for this manufacturing shift report:

Shift Performance Summary:
- Shift: ${shift.shift_name || 'Unknown Shift'}
- Overall Availability: ${(metrics.availability_percentage || 0).toFixed(1)}%
- Duration: ${(shift.duration_hours || 0).toFixed(1)} hours
- Total Assets: ${assets.length}

Performance Context:
- Efficiency Rating: ${insights.efficiency_factors.rating}
- Performance Trend: ${insights.performance_trends.trend}
- Anomalies Detected: ${insights.anomalies.length}
- Best Performing Asset: ${assets.reduce((best, asset) => (asset.availability || 0) > (best?.availability || 0) ? asset : best, null)?.asset_name || 'N/A'}
- Lowest Performing Asset: ${assets.reduce((worst, asset) => (asset.availability || 0) < (worst?.availability || 100) ? asset : worst, null)?.asset_name || 'N/A'}

Advanced Analysis:
- Performance Category: ${insights.advanced?.performance?.category || 'Standard'}
- Analysis Confidence: ${insights.advanced?.confidence_score || 0}
- Predictive Indicators: ${insights.advanced?.predictions?.length || 0} available
- Advanced Anomalies: ${insights.advanced?.anomalies?.length || 0} detected

Generate a comprehensive conclusion (2-3 paragraphs) that:
1. Summarizes the overall shift performance in business context
2. Highlights key achievements and areas for improvement
3. Provides forward-looking insights for the next shift
4. Includes specific next steps for the operations team

End with a clear performance rating and outlook for continuous improvement.`;

    try {
      // Add timeout wrapper for OpenAI API call (increased to 60 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI API timeout after 60 seconds')), 60000);
      });
      
      const apiPromise = this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "You are a manufacturing operations manager providing shift conclusions. Focus on business impact and forward-looking insights."
        }, {
          role: "user",
          content: prompt
        }],
        max_tokens: 500,
        temperature: 0.3
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI conclusion:', error);
      return this.generateFallbackConclusion(shiftData, insights);
    }
  }

  // Helper methods for data analysis
  analyzePerformanceTrends(metrics, assets) {
    const avgAvailability = metrics.availability_percentage || 0;
    let trend = 'stable';
    
    if (avgAvailability >= 90) trend = 'excellent';
    else if (avgAvailability >= 80) trend = 'good';
    else if (avgAvailability >= 70) trend = 'concerning';
    else trend = 'critical';
    
    return {
      trend,
      avgAvailability,
      details: `Average availability of ${(avgAvailability || 0).toFixed(1)}% indicates ${trend} performance`
    };
  }

  analyzeEventPatterns(events) {
    if (!events || events.length === 0) {
      return { summary: 'No events recorded', criticalPatterns: 'None' };
    }
    
    const eventTypes = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    const criticalEvents = events.filter(e => e.duration > 300000); // > 5 minutes
    
    return {
      summary: `${events.length} total events with ${Object.keys(eventTypes).length} different types`,
      criticalPatterns: `${criticalEvents.length} events exceeded 5 minutes duration`,
      eventTypes
    };
  }

  analyzeAssetBehavior(assets, events) {
    const assetPerformance = assets.map(asset => ({
      name: asset.asset_name,
      availability: asset.availability || 0,
      stops: asset.stops || 0
    }));
    
    const bestPerformer = assetPerformance.reduce((best, asset) => 
      asset.availability > best.availability ? asset : best, assetPerformance[0] || {});
    
    return {
      summary: `${assets.length} assets monitored, best performer: ${bestPerformer.name} at ${(bestPerformer.availability || 0).toFixed(1)}%`,
      bestPerformer,
      assetPerformance
    };
  }

  detectAnomalies(shiftData) {
    const { metrics, assets, events } = shiftData;
    const anomalies = [];
    
    // Detect availability anomalies
    if (metrics.availability_percentage < 60) {
      anomalies.push({ type: 'low_availability', severity: 'high', description: 'Overall availability below 60%' });
    }
    
    // Detect asset anomalies
    assets.forEach(asset => {
      if (asset.availability < 50) {
        anomalies.push({ type: 'asset_failure', severity: 'high', description: `${asset.asset_name} availability critically low` });
      }
    });
    
    // Detect event anomalies
    const longEvents = events?.filter(e => e.duration > 1800000) || []; // > 30 minutes
    if (longEvents.length > 0) {
      anomalies.push({ type: 'extended_downtime', severity: 'medium', description: `${longEvents.length} events exceeded 30 minutes` });
    }
    
    return anomalies;
  }

  identifyEfficiencyFactors(shiftData) {
    const { metrics } = shiftData;
    const availability = metrics.availability_percentage || 0;
    
    let rating = 'Poor';
    if (availability >= 90) rating = 'Excellent';
    else if (availability >= 80) rating = 'Good';
    else if (availability >= 70) rating = 'Fair';
    
    return {
      rating,
      availability,
      factors: ['Asset reliability', 'Maintenance efficiency', 'Operator response time']
    };
  }

  async getContextualFactors(shift) {
    // This could be enhanced to pull from external systems (weather, schedules, etc.)
    const shiftHour = new Date(shift.start_time).getHours();
    let shiftType = 'Day';
    if (shiftHour >= 22 || shiftHour < 6) shiftType = 'Night';
    else if (shiftHour >= 14) shiftType = 'Evening';
    
    return {
      summary: `${shiftType} shift starting at ${new Date(shift.start_time).toLocaleTimeString()}`,
      shiftType,
      dayOfWeek: new Date(shift.start_time).toLocaleDateString('en-US', { weekday: 'long' })
    };
  }

  // Utility methods
  getEventDistribution(events) {
    if (!events || events.length === 0) return 'No events recorded';
    
    const distribution = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(distribution)
      .map(([type, count]) => `- ${type}: ${count} events`)
      .join('\n');
  }

  getAssetPerformanceRating(asset) {
    const availability = asset.availability || 0;
    if (availability >= 95) return 'Excellent';
    if (availability >= 85) return 'Good';
    if (availability >= 75) return 'Fair';
    if (availability >= 60) return 'Poor';
    return 'Critical';
  }

  summarizeEvents(events) {
    const byType = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    const critical = events.filter(event => 
      event.duration > 300000 || // > 5 minutes
      event.event_type === 'ALARM' ||
      event.event_type === 'ERROR'
    );
    
    const durations = events.filter(e => e.duration).map(e => e.duration);
    const durationRange = durations.length > 0 ? 
      `${Math.min(...durations)/60000}min - ${Math.max(...durations)/60000}min` : 'N/A';
    
    return { byType, critical, durationRange };
  }

  // Fallback methods for when AI is unavailable
  generateFallbackExecutiveSummary(shiftData, insights) {
    const { shift, metrics } = shiftData;
    return `**Executive Summary**\n\nShift ${shift.shift_name || 'Unknown Shift'} achieved ${(metrics.availability_percentage || 0).toFixed(1)}% overall availability during a ${((shift.duration_hours || 0)).toFixed(1)}-hour operational period. Performance trend indicates ${insights.performance_trends.trend} operational conditions with ${insights.anomalies.length} anomalies detected requiring attention.`;
  }

  generateFallbackShiftOverview(shiftData, insights) {
    const { shift, metrics, events } = shiftData;
    return `**Shift Overview**\n\nOperational period from ${new Date(shift.start_time).toLocaleString()} to ${shift.end_time ? new Date(shift.end_time).toLocaleString() : 'ongoing'} with ${events?.length || 0} recorded events. Total runtime of ${formatMinutesToHMS(metrics.runtime_minutes || 0)} against ${formatMinutesToHMS(metrics.downtime_minutes || 0)} of downtime.`;
  }

  generateFallbackAssetAnalysis(shiftData, insights) {
    const { assets } = shiftData;
    const bestAsset = assets.reduce((best, asset) => asset.availability > (best?.availability || 0) ? asset : best, null);
    return `**Asset Performance**\n\n${assets.length} assets monitored during this shift. Best performer: ${bestAsset?.asset_name || 'N/A'} with ${(bestAsset?.availability || 0).toFixed(1)}% availability. Asset behavior analysis indicates ${insights.asset_behavior.summary}.`;
  }

  generateFallbackEventsAnalysis(shiftData, insights) {
    const { events } = shiftData;
    return `**Key Events**\n\n${events?.length || 0} events recorded during the shift. Event pattern analysis shows ${insights.event_patterns.summary}. Critical events requiring attention: ${insights.event_patterns.criticalPatterns}.`;
  }

  generateFallbackRecommendations(shiftData, insights) {
    const { metrics } = shiftData;
    const recs = [];
    
    if (metrics.availability_percentage < 80) {
      recs.push('1. **Priority**: Investigate root causes of low availability and implement corrective actions.');
    }
    
    if (insights.anomalies.length > 0) {
      recs.push('2. **Anomaly Resolution**: Address detected anomalies to prevent recurrence.');
    }
    
    recs.push('3. **Continuous Improvement**: Review shift performance data to identify optimization opportunities.');
    
    return `**Recommendations**\n\n${recs.join('\n\n')}`;
  }

  generateFallbackConclusion(shiftData, insights) {
    const { shift, metrics } = shiftData;
    return `**Conclusion**\n\nShift ${shift.shift_name || shift.name} completed with ${((metrics.availability_percentage || 0)).toFixed(1)}% availability. Performance rating: ${insights.efficiency_factors.rating}. Continue monitoring and implementing recommended improvements for optimal operational efficiency.`;
  }
}

module.exports = AINaturalLanguageService;