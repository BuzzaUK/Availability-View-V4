const reportService = require('./reportService');
const databaseService = require('./databaseService');

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
      // Get the detailed shift report data
      const reportData = await this.reportService.generateShiftReport(shiftId, {
        includeAnalysis: true,
        includeCsv: false,
        includeHtml: false
      });

      // Generate natural language narrative
      const narrative = this.generateShiftNarrative(reportData);
      
      return {
        success: true,
        shift_id: shiftId,
        report_type: 'natural_language',
        generated_at: new Date().toISOString(),
        narrative: narrative,
        raw_data: options.includeRawData ? reportData : null
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
   * Generate executive summary
   */
  generateExecutiveSummary(shift, metrics) {
    const availability = metrics.average_availability;
    const oee = metrics.oee_percentage;
    const totalStops = metrics.total_stops;
    const duration = shift.duration_hours;

    let summary = `**Shift ${shift.shift_number} Performance Summary**\n\n`;
    
    if (availability >= 85) {
      summary += `✅ **Excellent Performance**: The shift achieved ${availability.toFixed(1)}% availability, `;
      summary += `exceeding industry standards. `;
    } else if (availability >= 70) {
      summary += `⚠️ **Good Performance with Opportunities**: The shift achieved ${availability.toFixed(1)}% availability, `;
      summary += `which is within acceptable range but has room for improvement. `;
    } else {
      summary += `🚨 **Performance Below Target**: The shift achieved only ${availability.toFixed(1)}% availability, `;
      summary += `significantly below target levels and requiring immediate attention. `;
    }

    summary += `Over the ${duration.toFixed(1)}-hour shift, there were ${totalStops} stops recorded. `;
    summary += `The Overall Equipment Effectiveness (OEE) was ${oee.toFixed(1)}%.`;

    return summary;
  }

  /**
   * Generate detailed shift overview
   */
  generateShiftOverview(shift, metrics) {
    const startTime = new Date(shift.start_time).toLocaleString();
    const endTime = shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Ongoing';
    const runtime = (metrics.total_runtime / 60000).toFixed(1); // Convert to minutes
    const downtime = (metrics.total_downtime / 60000).toFixed(1);

    let overview = `**Shift Details**\n\n`;
    overview += `• **Shift Name**: ${shift.name}\n`;
    overview += `• **Duration**: ${startTime} to ${endTime} (${shift.duration_hours.toFixed(1)} hours)\n`;
    overview += `• **Total Runtime**: ${runtime} minutes\n`;
    overview += `• **Total Downtime**: ${downtime} minutes\n`;
    overview += `• **Total Stops**: ${metrics.total_stops}\n`;
    overview += `• **Short Stops**: ${metrics.total_short_stops}\n\n`;

    // Add performance context
    if (metrics.total_short_stops > metrics.total_stops * 0.7) {
      overview += `📊 **Notable Pattern**: ${((metrics.total_short_stops / metrics.total_stops) * 100).toFixed(0)}% of stops were short stops, `;
      overview += `indicating potential issues with frequent minor interruptions that may benefit from root cause analysis.\n\n`;
    }

    return overview;
  }

  /**
   * Generate asset performance narrative
   */
  generateAssetPerformanceNarrative(assets) {
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
      narrative += `🏆 **Best Performer**: ${bestPerformer.asset_name} achieved ${bestPerformer.availability.toFixed(1)}% availability `;
      narrative += `with ${bestPerformer.stops} stops during the shift.\n\n`;
      
      narrative += `⚠️ **Needs Attention**: ${worstPerformer.asset_name} had ${worstPerformer.availability.toFixed(1)}% availability `;
      narrative += `with ${worstPerformer.stops} stops, requiring ${(worstPerformer.downtime / 60).toFixed(1)} minutes of downtime.\n\n`;
    }

    // Detailed analysis for each asset
    narrative += `**Individual Asset Analysis:**\n\n`;
    
    sortedAssets.forEach((asset, index) => {
      narrative += `${index + 1}. **${asset.asset_name}**\n`;
      narrative += `   • Availability: ${asset.availability.toFixed(1)}% (${this.getPerformanceRating(asset.availability)})\n`;
      narrative += `   • Runtime: ${(asset.runtime / 60).toFixed(1)} minutes\n`;
      narrative += `   • Stops: ${asset.stops} (${asset.short_stops} short, ${asset.long_stops} long)\n`;
      
      if (asset.stops > 0) {
        narrative += `   • Average stop duration: ${(asset.average_stop_duration / 60).toFixed(1)} minutes\n`;
        narrative += `   • Longest stop: ${(asset.longest_stop / 60).toFixed(1)} minutes\n`;
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
   * Generate key events narrative
   */
  generateKeyEventsNarrative(events) {
    if (!events || events.length === 0) {
      return "**Key Events**\n\nNo significant events recorded during this shift.";
    }

    let narrative = `**Key Events During Shift**\n\n`;
    
    // Group events by type
    const eventsByType = events.reduce((acc, event) => {
      if (!acc[event.event_type]) acc[event.event_type] = [];
      acc[event.event_type].push(event);
      return acc;
    }, {});

    // Analyze stop events
    if (eventsByType.STOP) {
      const stops = eventsByType.STOP;
      const longStops = stops.filter(stop => (stop.duration || 0) > 300000); // > 5 minutes
      
      narrative += `📉 **Stop Events**: ${stops.length} stops were recorded during the shift.\n`;
      
      if (longStops.length > 0) {
        narrative += `🚨 **Significant Stops**: ${longStops.length} stops lasted longer than 5 minutes:\n`;
        longStops.forEach(stop => {
          const duration = (stop.duration / 60000).toFixed(1);
          const time = new Date(stop.timestamp).toLocaleTimeString();
          narrative += `   • ${time}: ${stop.asset_name} stopped for ${duration} minutes\n`;
        });
        narrative += `\n`;
      }
    }

    // Analyze start events
    if (eventsByType.START) {
      narrative += `✅ **Start Events**: ${eventsByType.START.length} assets were started during the shift.\n\n`;
    }

    // Timeline of critical events
    const criticalEvents = events
      .filter(event => event.duration > 180000 || event.event_type === 'ALARM') // > 3 minutes or alarms
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(0, 5); // Top 5 critical events

    if (criticalEvents.length > 0) {
      narrative += `⏰ **Timeline of Critical Events**:\n`;
      criticalEvents.forEach(event => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        const duration = event.duration ? ` (${(event.duration / 60000).toFixed(1)} min)` : '';
        narrative += `   • ${time}: ${event.asset_name} - ${event.event_type}${duration}\n`;
      });
      narrative += `\n`;
    }

    return narrative;
  }

  /**
   * Generate recommendations based on performance data
   */
  generateRecommendations(metrics, assets) {
    let recommendations = `**Recommendations for Improvement**\n\n`;
    const recs = [];

    // Overall availability recommendations
    if (metrics.average_availability < 75) {
      recs.push("🎯 **Priority Action**: Overall availability is below target. Focus on reducing unplanned downtime through preventive maintenance.");
    }

    // Short stop recommendations
    if (metrics.total_short_stops > metrics.total_stops * 0.6) {
      recs.push("🔧 **Short Stop Analysis**: High frequency of short stops detected. Investigate common causes such as material flow issues, minor jams, or operator interventions.");
    }

    // Asset-specific recommendations
    const poorPerformers = assets.filter(asset => asset.availability < 70);
    if (poorPerformers.length > 0) {
      recs.push(`⚠️ **Asset Focus**: ${poorPerformers.map(a => a.asset_name).join(', ')} require immediate attention due to low availability.`);
    }

    // OEE recommendations
    if (metrics.oee_percentage < 60) {
      recs.push("📈 **OEE Improvement**: Consider implementing lean manufacturing principles to improve Overall Equipment Effectiveness.");
    }

    // Stop duration recommendations
    const assetsWithLongStops = assets.filter(asset => asset.average_stop_duration > 600); // > 10 minutes
    if (assetsWithLongStops.length > 0) {
      recs.push(`⏱️ **Response Time**: ${assetsWithLongStops.map(a => a.asset_name).join(', ')} have long average stop durations. Review maintenance response procedures.`);
    }

    if (recs.length === 0) {
      recs.push("✅ **Excellent Performance**: Current performance levels are meeting targets. Continue with existing maintenance and operational procedures.");
    }

    recommendations += recs.map((rec, index) => `${index + 1}. ${rec}`).join('\n\n');

    return recommendations;
  }

  /**
   * Generate conclusion
   */
  generateConclusion(metrics, assets) {
    const availability = metrics.average_availability;
    const oee = metrics.oee_percentage;
    
    let conclusion = `**Shift Performance Conclusion**\n\n`;
    
    if (availability >= 85 && oee >= 70) {
      conclusion += `🎉 **Outstanding Shift**: This shift demonstrated excellent performance across all key metrics. `;
      conclusion += `The team successfully maintained high availability and equipment effectiveness. `;
      conclusion += `Continue current practices and consider this shift as a benchmark for future operations.`;
    } else if (availability >= 70 && oee >= 60) {
      conclusion += `👍 **Solid Performance**: This shift showed good overall performance with some areas for improvement. `;
      conclusion += `Focus on the recommendations above to achieve excellence in future shifts.`;
    } else {
      conclusion += `📋 **Improvement Needed**: This shift highlighted several opportunities for performance enhancement. `;
      conclusion += `Implementing the recommended actions should lead to significant improvements in future shifts. `;
      conclusion += `Consider scheduling a team review to discuss the findings and develop action plans.`;
    }

    conclusion += `\n\n**Next Steps**: Review this report with the operations team and implement priority recommendations before the next shift.`;

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
      dailyNarrative += `• Average Availability: ${avgAvailability.toFixed(1)}%\n`;
      dailyNarrative += `• Total Stops: ${totalStops}\n`;
      dailyNarrative += `• Total Runtime: ${(totalRuntime / 3600000).toFixed(1)} hours\n\n`;

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