require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const reportService = require('./reportService');
const databaseService = require('./databaseService');
const AINaturalLanguageService = require('./aiNaturalLanguageService');
const dataInterpretationService = require('./dataInterpretationService');

// Create AI service instance
const aiNaturalLanguageService = new AINaturalLanguageService();
const { formatMillisecondsToHMS, formatMinutesToHMS, formatTimestampToHMS, formatDuration, formatDurationNarrative } = require('../utils/timeFormatter');

class NaturalLanguageReportService {
  constructor() {
    this.reportService = reportService;
    this.databaseService = databaseService;
  }

  /**
   * Generate a natural language shift report
   */
  async generateNaturalLanguageShiftReport(shiftId, options = {}) {
    try {
      console.log(`Generating AI-enhanced natural language report for shift ${shiftId}`);
      
      // Get the detailed shift report data
      const reportData = await this.reportService.generateShiftReport(shiftId, {
        includeAnalysis: true,
        includeCsv: false,
        includeHtml: false
      });

      // Prepare data for AI analysis - ensure events are included
      const shiftData = {
        shift: reportData.shift,
        metrics: reportData.metrics,
        assets: reportData.assets,
        events: reportData.events || [] // Fix: Ensure events are properly passed
      };
      
      // Enhance data with advanced interpretation
      let enhancedShiftData = shiftData;
      try {
        const advancedAnalysis = await dataInterpretationService.analyzeShiftData(shiftData, true);
        enhancedShiftData = {
          ...shiftData,
          advancedAnalysis
        };
      } catch (interpretationError) {
        console.warn('Advanced data interpretation failed, using basic data:', interpretationError.message);
      }

      // Use AI service for intelligent report generation
      console.log('🔍 AI Check - useAI:', options.useAI, 'API Key present:', !!process.env.OPENAI_API_KEY, 'API Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
      if (options.useAI !== false && process.env.OPENAI_API_KEY) {
        console.log('🤖 Attempting AI report generation...');
        try {
          const aiReport = await aiNaturalLanguageService.generateIntelligentShiftReport(enhancedShiftData, options);
          console.log('🤖 AI Report Result:', { success: aiReport.success, report_type: aiReport.report_type });
          if (aiReport.success) {
            console.log('✅ AI report generation successful');
            return {
              ...aiReport,
              ai_used: true,
              data_quality_score: enhancedShiftData.advancedAnalysis?.confidence_score || 0.5
            };
          } else {
            console.warn('⚠️ AI report generation returned success=false');
          }
        } catch (aiError) {
          console.warn('❌ AI report generation failed, falling back to standard generation:', aiError.message);
          console.warn('Error stack:', aiError.stack);
        }
      } else {
        console.log('🚫 AI disabled or no API key - useAI:', options.useAI, 'API Key present:', !!process.env.OPENAI_API_KEY);
      }

      // Fallback to enhanced generation using enhanced shift data
      console.log('📝 Using fallback enhanced generation');
      
      const narrative = {
        executive_summary: this.generateEnhancedExecutiveSummary(enhancedShiftData),
        shift_overview: this.generateEnhancedShiftOverview(enhancedShiftData),
        asset_performance: this.generateEnhancedAssetPerformanceNarrative(enhancedShiftData),
        key_events: this.generateEnhancedKeyEventsNarrative(enhancedShiftData),
        recommendations: this.generateEnhancedRecommendations(enhancedShiftData),
        conclusion: this.generateEnhancedConclusion(enhancedShiftData),
        data_insights: enhancedShiftData.advancedAnalysis ? this.generateDataInsightsSummary(enhancedShiftData.advancedAnalysis) : null
      };
      
      return {
        success: true,
        shift_id: shiftId,
        report_type: 'enhanced_natural_language',
        generated_at: new Date().toISOString(),
        narrative: narrative,
        ai_used: false,
        raw_data: options.includeRawData ? reportData : null,
        data_quality_score: enhancedShiftData.advancedAnalysis?.confidence_score || 0.5
      };

    } catch (error) {
      console.error('Error generating natural language report:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive narrative for shift performance
   */
  generateShiftNarrative(reportData) {
    const { shift, metrics, assets } = reportData;
    
    const narrative = {
      executive_summary: this.generateExecutiveSummary(shift, metrics),
      shift_overview: this.generateShiftOverview(shift, metrics),
      asset_performance: this.generateAssetPerformanceNarrative(assets),
      key_events: this.generateKeyEventsNarrative(reportData.events),
      recommendations: this.generateRecommendations(metrics, assets),
      conclusion: this.generateConclusion(metrics, assets)
    };

    return narrative;
  }

  /**
   * Generate enhanced executive summary
   */
  generateEnhancedExecutiveSummary(shiftData) {
    const { shift, metrics, assets, advancedAnalysis } = shiftData;
    const availability = metrics.availability_percentage || 0;
    
    let summary = `**Executive Summary**\n\n`;
    summary += `Shift ${shift.shift_name || 'Unknown'} achieved ${(availability || 0).toFixed(1)}% overall availability`;
    summary += ` during the ${(shift.duration_hours || 0).toFixed(1)}-hour operational period.`;
    
    // Enhanced performance assessment with advanced analysis
    const performanceCategory = advancedAnalysis?.performance?.category || 'standard';
    const efficiencyScore = advancedAnalysis?.performance?.efficiency_score || 0;
    
    if (performanceCategory === 'world_class') {
      summary += ` This represents world-class operational performance with exceptional efficiency.`;
    } else if (performanceCategory === 'excellent') {
      summary += ` Performance exceeded industry standards demonstrating operational excellence.`;
    } else if (performanceCategory === 'good') {
      summary += ` Performance met expectations with identified optimization opportunities.`;
    } else if (performanceCategory === 'acceptable') {
      summary += ` Performance was within acceptable ranges but shows improvement potential.`;
    } else {
      summary += ` Performance requires systematic improvement across multiple operational areas.`;
    }
    
    if (efficiencyScore > 0) {
      summary += ` (Efficiency score: ${((efficiencyScore || 0)).toFixed(1)})`;
    }
    
    // Add advanced insights if available
    if (advancedAnalysis?.anomalies?.length > 0) {
      const criticalAnomalies = advancedAnalysis.anomalies.filter(a => a.severity === 'high').length;
      if (criticalAnomalies > 0) {
        summary += ` ${criticalAnomalies} critical anomalies detected requiring immediate attention.`;
      }
    }
    
    // Asset overview
    const totalAssets = assets.length;
    const highPerformingAssets = assets.filter(a => a.availability >= 90).length;
    const totalStops = metrics.total_stops || 0;
    const downtimeMinutes = metrics.downtime_minutes || 0;
    
    summary += ` Of ${totalAssets} monitored assets, ${highPerformingAssets} achieved availability targets above 90%.`;
    summary += ` Total operational stops: ${totalStops}, with ${formatMinutesToHMS(downtimeMinutes || 0)} of downtime recorded.`;
    
    return summary;
  }

  /**
   * Generate enhanced shift overview
   */
  generateEnhancedShiftOverview(shiftData) {
    const { shift, metrics, events, advancedAnalysis } = shiftData;
    let overview = `**Shift Overview**\n\n`;
    
    const startTime = new Date(shift.start_time).toLocaleString();
    const endTime = shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Ongoing';
    
    overview += `Shift ${shift.shift_name || 'Unknown'} operated from ${startTime} to ${endTime}, `;
    overview += `spanning ${(shift.duration_hours || 0).toFixed(1)} hours of scheduled operational time.\n\n`;
    
    // Enhanced overview with advanced analysis
    const timeAnalysis = advancedAnalysis?.performance?.time_analysis;
    if (timeAnalysis?.performance_context) {
      overview += `**Performance Context**: ${timeAnalysis.performance_context}\n\n`;
    }
    
    // Key availability metrics only
    overview += `**Key Performance Indicators:**\n`;
    overview += `- Overall Availability: ${((metrics.availability_percentage || 0)).toFixed(1)}%\n`;
    overview += `- Total Events: ${events?.length || 0}\n`;
    overview += `- Mean Time Between Failures (MTBF): ${((metrics.mtbf_hours || 0)).toFixed(1)} hours\n`;
    overview += `- Mean Time To Repair (MTTR): ${formatMinutesToHMS(metrics.mttr_minutes || 0)}\n\n`;
    
    // Enhanced time breakdown with efficiency insights
    const runtimeMinutes = metrics.runtime_minutes || 0;
    const downtimeMinutes = metrics.downtime_minutes || 0;
    const totalEvents = events?.length || 0;
    const efficiencyScore = advancedAnalysis?.performance?.efficiency_score;
    
    overview += `**Operational Summary:**\n`;
    overview += `- Runtime: ${formatMinutesToHMS(runtimeMinutes || 0)} (${(((runtimeMinutes || 0) / ((shift.duration_hours || 1) * 60)) * 100).toFixed(1)}%)\n`;
    overview += `- Downtime: ${formatMinutesToHMS(downtimeMinutes || 0)}\n`;
    overview += `- Total Events Recorded: ${totalEvents}\n`;
    
    if (efficiencyScore) {
      overview += `- Efficiency Score: ${(efficiencyScore || 0).toFixed(1)}\n`;
    }
    
    // Enhanced event distribution with temporal analysis
    if (events && events.length > 0) {
      const eventTypes = events.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {});
      
      overview += `\n**Event Distribution:**\n`;
      Object.entries(eventTypes).forEach(([type, count]) => {
        overview += `- ${type}: ${count} events\n`;
      });
      
      // Add temporal pattern insights
      const temporalAnalysis = advancedAnalysis?.events?.temporal_analysis;
      if (temporalAnalysis?.event_density_pattern) {
        const pattern = temporalAnalysis.event_density_pattern;
        if (pattern === 'clustered') {
          overview += `- Pattern: Events showed clustered timing patterns\n`;
        } else if (pattern === 'uniform') {
          overview += `- Pattern: Events were uniformly distributed\n`;
        }
      }
      
      // Add critical events insight
      const criticalEvents = advancedAnalysis?.events?.critical_events?.length || 0;
      if (criticalEvents > 0) {
        overview += `- Critical Events: ${criticalEvents} requiring immediate attention\n`;
      }
    }
    
    return overview;
  }

  /**
   * Generate enhanced asset performance narrative
   */
  generateEnhancedAssetPerformanceNarrative(shiftData) {
    const { assets, events } = shiftData;
    
    if (!assets || assets.length === 0) {
      return "**Asset Performance**\n\nNo asset data available for this shift.";
    }

    let narrative = `**Asset Performance Analysis**\n\n`;
    
    // Sort assets by availability (worst first for attention)
    const sortedAssets = [...assets].sort((a, b) => a.availability - b.availability);
    
    // Identify best and worst performers
    const worstPerformer = sortedAssets[0];
    const bestPerformer = sortedAssets[sortedAssets.length - 1];
    
    if (sortedAssets.length > 1) {
      narrative += `🏆 **Best Performer**: ${bestPerformer.asset_name} achieved ${(bestPerformer.availability || 0).toFixed(1)}% availability `;
      narrative += `with ${bestPerformer.stops} stops during the shift`;
      
      // Add MTBF/MTTR if available
      if (bestPerformer.mtbf_hours) {
        narrative += ` (MTBF: ${(bestPerformer.mtbf_hours || 0).toFixed(1)}h)`;
      }
      narrative += `.\n\n`;
      
      narrative += `⚠️ **Needs Attention**: ${worstPerformer.asset_name} had ${(worstPerformer.availability || 0).toFixed(1)}% availability `;
    narrative += `with ${worstPerformer.stops} stops, requiring ${formatMillisecondsToHMS(worstPerformer.downtime || 0)} of downtime`;
      
      if (worstPerformer.mttr_minutes) {
        narrative += ` (MTTR: ${formatMinutesToHMS(worstPerformer.mttr_minutes || 0)})`;
      }
      narrative += `.\n\n`;
    }

    // Asset event correlation
    if (events && events.length > 0) {
      const assetEventCounts = events.reduce((acc, event) => {
        const assetId = event.asset_id || event.asset;
        acc[assetId] = (acc[assetId] || 0) + 1;
        return acc;
      }, {});
      
      const mostActiveAsset = Object.entries(assetEventCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostActiveAsset) {
        const assetName = assets.find(a => a.asset_id === mostActiveAsset[0] || a.id === mostActiveAsset[0])?.asset_name || 'Unknown';
        narrative += `📊 **Event Activity**: ${assetName} generated ${mostActiveAsset[1]} events during the shift.\n\n`;
      }
    }

    // Detailed analysis for each asset
    narrative += `**Individual Asset Analysis:**\n\n`;
    
    sortedAssets.forEach((asset, index) => {
      narrative += `${index + 1}. **${asset.asset_name}**\n`;
      narrative += `   • Availability: ${(asset.availability || 0).toFixed(1)}% (${this.getPerformanceRating(asset.availability || 0)})
`;
      narrative += `   • Runtime: ${formatMillisecondsToHMS(asset.runtime || 0)}
`;
      narrative += `   • Stops: ${asset.stops} (${asset.short_stops} short, ${asset.long_stops} long)\n`;
      
      if (asset.stops > 0) {
        narrative += `   • Average stop duration: ${formatMillisecondsToHMS(asset.average_stop_duration || 0)}
`;
        
        narrative += `   • Longest stop: ${formatMillisecondsToHMS(asset.longest_stop || 0)}
`;
      }
      
      // Add insights
      const insights = this.generateAssetInsights(asset);
      if (insights.length > 0) {
        narrative += `   • Insights: ${insights.join(', ')}\n`;
      }
      
      narrative += `\n`;
    });

    return narrative;
  }

  /**
   * Generate enhanced key events narrative
   */
  generateEnhancedKeyEventsNarrative(shiftData) {
    const { events, assets } = shiftData;
    
    if (!events || events.length === 0) {
      return "**Key Events**\n\nNo significant events recorded during this shift.";
    }

    let narrative = `**Key Events During Shift**\n\n`;
    
    // Enhanced event categorization
    const eventTypes = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    narrative += `During this shift, ${events.length} events were recorded across all monitored assets. `;
    narrative += `Event types included: ${Object.entries(eventTypes).map(([type, count]) => `${count} ${type.toLowerCase()}`).join(', ')}.\n\n`;

    // Identify critical events with enhanced criteria
    const criticalEvents = events.filter(event => {
      return (event.duration && event.duration > 300000) || // > 5 minutes
             event.event_type === 'ALARM' ||
             event.event_type === 'ERROR' ||
             event.severity === 'HIGH';
    }).sort((a, b) => (b.duration || 0) - (a.duration || 0));
    
    if (criticalEvents.length > 0) {
      narrative += `🚨 **Critical Events**: ${criticalEvents.length} high-impact events identified:\n\n`;
      
      criticalEvents.slice(0, 5).forEach((event, index) => {
        const duration = formatDurationNarrative(event.duration || 0);
        const time = formatTimestampToHMS(event.timestamp);
        const assetName = event.asset_name || assets.find(a => a.asset_id === event.asset_id || a.id === event.asset)?.asset_name || `Asset ${event.asset_id || event.asset}`;
        
        narrative += `${index + 1}. **${time}**: ${assetName} - ${event.event_type} (${duration})\n`;
        
        if (event.description) {
          narrative += `   *${event.description}*\n`;
        }
        
        // Add impact assessment
        if (event.duration > 600000) { // > 10 minutes
          narrative += `   ⚠️ *Significant downtime impact*\n`;
        }
        
        narrative += `\n`;
      });
      
      if (criticalEvents.length > 5) {
        narrative += `*... and ${criticalEvents.length - 5} additional critical events*\n\n`;
      }
    }

    // Enhanced event pattern analysis
    const eventsByAsset = events.reduce((acc, event) => {
      const assetId = event.asset_id || event.asset;
      const assetName = event.asset_name || assets.find(a => a.asset_id === assetId || a.id === assetId)?.asset_name || `Asset ${assetId}`;
      acc[assetName] = (acc[assetName] || 0) + 1;
      return acc;
    }, {});
    
    const sortedAssetEvents = Object.entries(eventsByAsset).sort(([,a], [,b]) => b - a);
    
    if (sortedAssetEvents.length > 0) {
      narrative += `📊 **Event Distribution by Asset**:\n`;
      sortedAssetEvents.slice(0, 3).forEach(([assetName, count]) => {
        const percentage = (((count || 0) / (events.length || 1)) * 100).toFixed(1);
        narrative += `• ${assetName}: ${count} events (${percentage}%)\n`;
      });
      
      if (sortedAssetEvents.length > 3) {
        narrative += `• Other assets: ${sortedAssetEvents.slice(3).reduce((sum, [,count]) => sum + count, 0)} events\n`;
      }
    }

    // Time-based pattern analysis
    const eventsByHour = events.reduce((acc, event) => {
      const hour = new Date(event.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
    
    const peakHour = Object.entries(eventsByHour).sort(([,a], [,b]) => b - a)[0];
    if (peakHour && peakHour[1] > 1) {
      narrative += `\n⏰ **Peak Activity**: Hour ${peakHour[0]}:00 had the highest event activity with ${peakHour[1]} events.`;
    }

    return narrative;
  }

  /**
   * Generate enhanced recommendations based on availability-focused performance data
   */
  generateEnhancedRecommendations(shiftData) {
    const { shift, metrics, assets, events, advancedAnalysis } = shiftData;
    let recommendations = "**Recommendations**\n\n";
    
    const availability = metrics.availability_percentage || 0;
    const totalStops = metrics.total_stops || 0;
    const downtimeMinutes = metrics.downtime_minutes || 0;
    const mtbf = metrics.mtbf_hours || 0;
    const mttr = metrics.mttr_minutes || 0;
    
    // Enhanced performance assessment with advanced categorization
    const performanceCategory = advancedAnalysis?.performance?.category || 'standard';
    const efficiencyScore = advancedAnalysis?.performance?.efficiency_score || 0;
    const confidenceScore = advancedAnalysis?.confidence_score || 0;
    
    // Enhanced recommendations with predictive insights
    const predictions = advancedAnalysis?.predictions || [];
    const anomalies = advancedAnalysis?.anomalies || [];
    const assetRankings = advancedAnalysis?.assets?.rankings;
    
    // Predictive maintenance recommendations
    predictions.forEach(prediction => {
      if (prediction.type === 'asset_failure_risk') {
        recommendations += `🔮 **Predictive Alert**: ${prediction.prediction}. Schedule inspections for: ${prediction.assets?.join(', ')}.\n\n`;
      } else if (prediction.type === 'performance_prediction') {
        recommendations += `📈 **Performance Forecast**: ${prediction.prediction}. ${prediction.recommended_actions?.join(' ')}.\n\n`;
      } else if (prediction.type === 'recurring_event_prediction') {
        recommendations += `🔄 **Pattern Prevention**: ${prediction.prediction}. Focus on: ${prediction.patterns?.join(', ')}.\n\n`;
      }
    });
    
    // Anomaly-based recommendations
    anomalies.forEach(anomaly => {
      if (anomaly.severity === 'high') {
        recommendations += `🚨 **Critical Anomaly**: ${anomaly.description}. ${anomaly.recommendation}.\n\n`;
      } else if (anomaly.severity === 'medium') {
        recommendations += `⚠️ **Monitor**: ${anomaly.description}. ${anomaly.recommendation}.\n\n`;
      }
    });
    
    // Asset ranking-based recommendations
    if (assetRankings?.worst && assetRankings.worst.availability < 70) {
      recommendations += `🎯 **Priority Asset**: ${assetRankings.worst.asset_name} requires immediate maintenance intervention (${(assetRankings.worst.availability || 0).toFixed(1)}% availability).\n\n`;
    }
    
    // Availability-based recommendations
    if (availability < 70) {
      recommendations += "🚨 **Critical Priority - Immediate Action Required**:\n";
      recommendations += "• Conduct emergency root cause analysis for critically low availability\n";
      recommendations += "• Implement immediate containment actions to prevent further losses\n";
      recommendations += "• Review and expedite critical maintenance activities\n";
      recommendations += "• Consider temporary operational adjustments to stabilize performance\n\n";
    } else if (availability < 85) {
      recommendations += "⚠️ **High Priority - Performance Improvement**:\n";
      recommendations += "• Investigate recurring downtime patterns and failure modes\n";
      recommendations += "• Optimize preventive maintenance schedules based on MTBF data\n";
      recommendations += "• Implement condition-based monitoring for early fault detection\n";
      recommendations += "• Review operator training and response procedures\n\n";
    } else if (availability < 95) {
      recommendations += "📈 **Optimization Opportunities**:\n";
      recommendations += "• Fine-tune maintenance intervals to reduce planned downtime\n";
      recommendations += "• Analyze minor stop patterns for quick improvement wins\n";
      recommendations += "• Implement predictive maintenance technologies\n\n";
    }
    
    // MTBF/MTTR-based recommendations
    if (mtbf > 0 && mtbf < 24) {
      recommendations += "🔧 **Reliability Improvement**:\n";
      recommendations += `• Current MTBF of ${(mtbf || 0).toFixed(1)} hours is below target - focus on failure prevention\n`;
      recommendations += "• Implement robust preventive maintenance programs\n";
      recommendations += "• Consider equipment upgrades or replacements for chronic failure points\n\n";
    }
    
    if (mttr > 0 && mttr > 30) {
      recommendations += "⚡ **Maintenance Efficiency**:\n";
      recommendations += `• Current MTTR of ${formatMinutesToHMS(mttr || 0)} exceeds target - improve repair response\n`;
      recommendations += "• Enhance technician training and troubleshooting procedures\n";
      recommendations += "• Ensure spare parts availability and tool accessibility\n";
      recommendations += "• Consider mobile maintenance technologies for faster diagnosis\n\n";
    }
    
    // Asset-specific recommendations
    const poorPerformingAssets = assets.filter(asset => (asset.availability || 0) < 80);
    if (poorPerformingAssets.length > 0) {
      recommendations += "🎯 **Asset-Specific Actions**:\n";
      poorPerformingAssets.forEach(asset => {
        const assetEvents = events?.filter(e => e.asset_id === asset.asset_id || e.asset === asset.asset_id) || [];
        recommendations += `• **${asset.asset_name}**: ${((asset.availability || 0)).toFixed(1)}% availability`;
        recommendations += ` - ${asset.stops || 0} stops, ${assetEvents.length} events recorded\n`;
        
        if (asset.mttr_minutes > 45) {
          recommendations += `  - Priority: Reduce MTTR from ${formatMinutesToHMS(asset.mttr_minutes || 0)}\n`;
        }
        if (asset.mtbf_hours < 20) {
          recommendations += `  - Priority: Improve MTBF from ${(asset.mtbf_hours || 0).toFixed(1)} hours\n`;
        }
      });
      recommendations += "\n";
    }
    
    // Event pattern-based recommendations
    if (events && events.length > 0) {
      const criticalEvents = events.filter(e => e.duration > 300000 || e.event_type === 'ALARM');
      if (criticalEvents.length > 0) {
        recommendations += "📊 **Event Pattern Analysis**:\n";
        recommendations += `• ${criticalEvents.length} critical events identified - implement targeted countermeasures\n`;
        
        const eventsByType = events.reduce((acc, event) => {
          acc[event.event_type] = (acc[event.event_type] || 0) + 1;
          return acc;
        }, {});
        
        const dominantEventType = Object.entries(eventsByType).sort(([,a], [,b]) => b - a)[0];
        if (dominantEventType && dominantEventType[1] > events.length * 0.3) {
          recommendations += `• Focus on ${dominantEventType[0]} events (${dominantEventType[1]} occurrences) for maximum impact\n`;
        }
        
        recommendations += "\n";
      }
    }
    
    // Shift performance context recommendations
    const shiftHour = new Date(shift.start_time).getHours();
    if (shiftHour >= 22 || shiftHour < 6) {
      recommendations += "🌙 **Night Shift Considerations**:\n";
      recommendations += "• Ensure adequate lighting and safety measures for night operations\n";
      recommendations += "• Review staffing levels and expertise availability during night hours\n";
      recommendations += "• Consider automated monitoring systems for reduced supervision periods\n\n";
    }
    
    // General operational excellence
    recommendations += "💡 **Continuous Improvement**:\n";
    recommendations += "• Establish daily performance review meetings with operations team\n";
    recommendations += "• Document and standardize best practices from high-performing periods\n";
    recommendations += "• Implement real-time dashboards for proactive issue identification\n";
    recommendations += "• Schedule regular equipment health assessments and trend analysis\n";
    
    return recommendations;
  }

  /**
   * Generate enhanced conclusion based on availability-focused metrics
   */
  generateEnhancedConclusion(shiftData) {
    const { shift, metrics, assets, events, advancedAnalysis } = shiftData;
    let conclusion = "**Conclusion**\n\n";
    
    const availability = metrics.availability_percentage || 0;
    const totalStops = metrics.total_stops || 0;
    const downtimeMinutes = metrics.downtime_minutes || 0;
    const mtbf = metrics.mtbf_hours || 0;
    const mttr = metrics.mttr_minutes || 0;

    // Enhanced performance assessment with advanced categorization
    const performanceCategory = advancedAnalysis?.performance?.category || 'standard';
    const efficiencyScore = advancedAnalysis?.performance?.efficiency_score || 0;
    const confidenceScore = advancedAnalysis?.confidence_score || 0;

    // Enhanced overall performance assessment
    if (performanceCategory === 'world_class') {
      conclusion += `✅ **Outstanding Performance**: Shift ${shift.shift_name || shift.name} delivered world-class results with ${(availability || 0).toFixed(1)}% availability. `;
      conclusion += "This exceptional performance demonstrates operational excellence and sets the benchmark for future shifts.\n\n";
    } else if (performanceCategory === 'excellent') {
      conclusion += `👍 **Excellent Performance**: Shift ${shift.shift_name || shift.name} exceeded expectations with ${(availability || 0).toFixed(1)}% availability. `;
      conclusion += "Performance surpassed operational targets with strong efficiency metrics.\n\n";
    } else if (performanceCategory === 'good') {
      conclusion += `✓ **Good Performance**: Shift ${shift.shift_name || shift.name} achieved solid results with ${(availability || 0).toFixed(1)}% availability. `;
      conclusion += "Performance meets operational targets with identified opportunities for optimization.\n\n";
    } else if (performanceCategory === 'acceptable') {
      conclusion += `⚠️ **Acceptable Performance**: Shift ${shift.shift_name || shift.name} achieved ${(availability || 0).toFixed(1)}% availability. `;
      conclusion += "Performance is within acceptable ranges but shows improvement potential.\n\n";
    } else {
      conclusion += `🚨 **Performance Requires Attention**: Shift ${shift.shift_name || shift.name} experienced challenges with ${(availability || 0).toFixed(1)}% availability. `;
      conclusion += "Systematic improvement initiatives are required across multiple operational areas.\n\n";
    }
    
    // Add efficiency context
    if (efficiencyScore > 0) {
      conclusion += `**Efficiency Assessment**: Overall efficiency score of ${(efficiencyScore || 0).toFixed(1)} reflects `;
      if (efficiencyScore >= 90) {
        conclusion += "outstanding operational effectiveness.\n\n";
      } else if (efficiencyScore >= 80) {
        conclusion += "strong operational performance.\n\n";
      } else if (efficiencyScore >= 70) {
        conclusion += "adequate operational efficiency.\n\n";
      } else {
        conclusion += "opportunities for efficiency improvements.\n\n";
      }
    }
    
    // Reliability metrics assessment
    if (mtbf > 0 || mttr > 0) {
      conclusion += "**Reliability Metrics**: ";
      if (mtbf > 48) {
        conclusion += `Excellent MTBF of ${(mtbf || 0).toFixed(1)} hours indicates strong asset reliability. `;
      } else if (mtbf > 24) {
        conclusion += `Good MTBF of ${(mtbf || 0).toFixed(1)} hours with room for improvement. `;
      } else if (mtbf > 0) {
        conclusion += `MTBF of ${(mtbf || 0).toFixed(1)} hours requires attention to improve reliability. `;
      }
      
      if (mttr > 0) {
        if (mttr <= 15) {
          conclusion += `Excellent MTTR of ${formatMinutesToHMS(mttr || 0)} demonstrates efficient maintenance response.`;
    } else if (mttr < 30) {
      conclusion += `Good MTTR of ${formatMinutesToHMS(mttr || 0)} with opportunities for faster response.`;
    } else {
      conclusion += `MTTR of ${formatMinutesToHMS(mttr || 0)} indicates need for maintenance efficiency improvements.`;
        }
      }
      conclusion += "\n\n";
    }
    
    // Asset performance highlights
    const bestAsset = assets.reduce((best, asset) => 
      (asset.availability || 0) > (best.availability || 0) ? asset : best, assets[0] || {});
    
    const worstAsset = assets.reduce((worst, asset) => 
      (asset.availability || 0) < (worst.availability || 0) ? asset : worst, assets[0] || {});
    
    if (bestAsset.asset_name) {
      conclusion += `🏆 **Asset Excellence**: ${bestAsset.asset_name} achieved ${((bestAsset.availability || 0)).toFixed(1)}% availability, `;
      conclusion += "demonstrating best-in-class operational performance and serving as a model for other assets.\n\n";
    }
    
    if (worstAsset.asset_name && (worstAsset.availability || 0) < 80) {
      conclusion += `🔧 **Priority Focus**: ${worstAsset.asset_name} with ${((worstAsset.availability || 0)).toFixed(1)}% availability `;
      conclusion += "requires immediate attention and targeted improvement initiatives to restore optimal performance.\n\n";
    }
    
    // Event impact summary
    if (events && events.length > 0) {
      const criticalEvents = events.filter(e => e.duration > 300000).length;
      const totalEventTime = events.reduce((sum, e) => sum + (e.duration || 0), 0); // milliseconds
      
      conclusion += `**Event Impact**: ${events.length} total events recorded`;
      if (criticalEvents > 0) {
        conclusion += `, including ${criticalEvents} critical events`;
      }
      if (totalEventTime > 0) {
        conclusion += ` resulting in ${formatMillisecondsToHMS(totalEventTime || 0)} of event-related impact`;
      }
      conclusion += ".\n\n";
    }
    
    // Performance rating and outlook
    let performanceRating = 'Needs Improvement';
    if (availability >= 95) performanceRating = 'Excellent';
    else if (availability >= 85) performanceRating = 'Good';
    else if (availability >= 75) performanceRating = 'Fair';
    
    conclusion += `**Overall Rating**: ${performanceRating}\n\n`;
    
    // Enhanced forward-looking statement with predictive insights
    const predictions = advancedAnalysis?.predictions || [];
    const anomalies = advancedAnalysis?.anomalies || [];
    
    if (predictions.length > 0) {
      const riskPredictions = predictions.filter(p => p.type === 'asset_failure_risk').length;
      if (riskPredictions > 0) {
        conclusion += `**Predictive Outlook**: ${riskPredictions} assets identified at elevated failure risk requiring proactive maintenance.\n\n`;
      } else {
        conclusion += "**Predictive Outlook**: Indicators suggest stable operational forecast.\n\n";
      }
    }
    
    if (anomalies.filter(a => a.severity === 'high').length > 0) {
      conclusion += "**Critical Attention Required**: High-severity anomalies detected warrant immediate investigation and corrective action.\n\n";
    }
    
    // Analysis confidence statement
    if (confidenceScore >= 0.8) {
      conclusion += "**Analysis Confidence**: High data quality enables confident analysis and recommendations.\n\n";
    } else if (confidenceScore >= 0.6) {
      conclusion += "**Analysis Confidence**: Good data foundation supports reliable insights.\n\n";
    } else {
      conclusion += "**Analysis Note**: Based on available data; enhanced data collection recommended for improved insights.\n\n";
    }
    
    // Forward-looking statement with specific actions
    conclusion += "**Next Steps for Continuous Improvement**:\n";
    conclusion += "• Implement recommended actions from this analysis\n";
    conclusion += "• Continue real-time monitoring and proactive issue identification\n";
    conclusion += "• Share lessons learned and best practices across all shifts\n";
    conclusion += "• Schedule follow-up reviews to track improvement progress\n";
    conclusion += "• Maintain focus on availability optimization and reliability enhancement";
    
    return conclusion;
  }

  /**
   * Helper methods
   */
  getPerformanceRating(availability) {
    if (availability >= 85) return 'Excellent';
    if (availability >= 75) return 'Good';
    if (availability >= 65) return 'Fair';
    return 'Poor';
  }

  generateAssetInsights(asset) {
    const insights = [];
    
    if (asset.availability >= 90) {
      insights.push('High performer');
    } else if (asset.availability < 60) {
      insights.push('Requires immediate attention');
    }

    if (asset.short_stops > asset.stops * 0.8) {
      insights.push('Frequent short stops');
    }

    if (asset.average_stop_duration > 600) { // 10 minutes
      insights.push('Long stop durations');
    }

    if (asset.stops === 0) {
      insights.push('No stops recorded');
    }

    return insights;
  }

  /**
   * Generate summary of advanced data insights
   */
  generateDataInsightsSummary(advancedAnalysis) {
    const insights = [];
    
    // Performance insights
    if (advancedAnalysis.performance?.insights) {
      insights.push(...advancedAnalysis.performance.insights);
    }
    
    // Asset insights
    if (advancedAnalysis.assets?.insights) {
      insights.push(...advancedAnalysis.assets.insights);
    }
    
    // Event insights
    if (advancedAnalysis.events?.insights) {
      insights.push(...advancedAnalysis.events.insights);
    }
    
    // Anomaly insights
    if (advancedAnalysis.anomalies?.length > 0) {
      const criticalAnomalies = advancedAnalysis.anomalies.filter(a => a.severity === 'high');
      if (criticalAnomalies.length > 0) {
        insights.push(`${criticalAnomalies.length} critical anomalies detected requiring immediate attention`);
      }
    }
    
    // Predictive insights
    if (advancedAnalysis.predictions?.length > 0) {
      insights.push(`${advancedAnalysis.predictions.length} predictive insights generated for proactive management`);
    }
    
    return {
      summary: `Advanced analytics generated ${insights.length} key insights`,
      insights: insights,
      confidence_score: advancedAnalysis.confidence_score,
      analysis_depth: 'comprehensive'
    };
  }

  /**
   * Generate daily summary report
   */
  async generateDailySummaryReport(date, options = {}) {
    try {
      // Get all shifts for the specified date
      const shifts = await this.databaseService.getShiftsByDate(date);
      
      if (!shifts || shifts.length === 0) {
        return {
          success: true,
          date: date,
          message: "No shifts found for the specified date.",
          narrative: "**Daily Summary**\n\nNo production shifts were recorded for this date."
        };
      }

      let dailyNarrative = `**Daily Production Summary - ${new Date(date).toLocaleDateString()}**\n\n`;
      
      // Overall day statistics
      let totalAvailability = 0;
      let totalStops = 0;
      let totalRuntime = 0;
      
      dailyNarrative += `**Shifts Overview**\n`;
      dailyNarrative += `${shifts.length} shift(s) were completed during this day.\n\n`;

      // Process each shift
      for (const shift of shifts) {
        const shiftReport = await this.generateNaturalLanguageShiftReport(shift.id, { includeRawData: false });
        
        if (shiftReport.success) {
          dailyNarrative += `### ${shift.name}\n`;
          dailyNarrative += shiftReport.narrative.executive_summary + '\n\n';
          
          // Accumulate statistics
          const reportData = await this.reportService.generateShiftReport(shift.id);
          totalAvailability += reportData.metrics.average_availability;
          totalStops += reportData.metrics.total_stops;
          totalRuntime += reportData.metrics.total_runtime;
        }
      }

      // Daily summary
      const avgAvailability = totalAvailability / shifts.length;
      dailyNarrative += `**Daily Performance Summary**\n`;
      dailyNarrative += `• Average Availability: ${(avgAvailability || 0).toFixed(1)}%\n`;
    dailyNarrative += `• Total Events: ${totalEvents}\n`;
    dailyNarrative += `• Total Runtime: ${((totalRuntime || 0) / 3600000).toFixed(1)} hours\n\n`;

      if (avgAvailability >= 80) {
        dailyNarrative += `✅ **Excellent Day**: Overall performance exceeded targets.`;
      } else if (avgAvailability >= 70) {
        dailyNarrative += `👍 **Good Day**: Solid performance with room for improvement.`;
      } else {
        dailyNarrative += `⚠️ **Challenging Day**: Performance below targets, review needed.`;
      }

      return {
        success: true,
        date: date,
        shifts_count: shifts.length,
        average_availability: avgAvailability,
        total_stops: totalStops,
        narrative: dailyNarrative
      };

    } catch (error) {
      console.error('Error generating daily summary:', error);
      throw error;
    }
  }
}

module.exports = new NaturalLanguageReportService();