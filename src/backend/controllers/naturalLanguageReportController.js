const naturalLanguageReportService = require('../services/naturalLanguageReportService');

class NaturalLanguageReportController {
  /**
   * Generate natural language shift report
   */
  async generateShiftReport(req, res) {
    try {
      const { shiftId } = req.params;
      const { includeRawData = false, useAI = true } = req.query;

      if (!shiftId) {
        return res.status(400).json({
          success: false,
          message: 'Shift ID is required'
        });
      }

      const report = await naturalLanguageReportService.generateNaturalLanguageShiftReport(
        parseInt(shiftId),
        { 
          includeRawData: includeRawData === 'true',
          useAI: useAI === 'true'
        }
      );

      res.json(report);

    } catch (error) {
      console.error('Error generating natural language shift report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate natural language report',
        error: error.message
      });
    }
  }

  /**
   * Generate daily summary report
   */
  async generateDailySummary(req, res) {
    try {
      const { date } = req.params;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date is required (YYYY-MM-DD format)'
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      const report = await naturalLanguageReportService.generateDailySummaryReport(date);

      res.json(report);

    } catch (error) {
      console.error('Error generating daily summary report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate daily summary report',
        error: error.message
      });
    }
  }

  /**
   * Get available report types and their descriptions
   */
  async getReportTypes(req, res) {
    try {
      const reportTypes = {
        success: true,
        available_reports: [
          {
            type: 'shift_report',
            name: 'Natural Language Shift Report',
            description: 'Comprehensive narrative analysis of a single shift performance',
            endpoint: '/api/reports/natural-language/shift/:shiftId',
            parameters: {
              shiftId: 'Required - ID of the shift to analyze',
              includeRawData: 'Optional - Include raw metrics data (true/false)'
            },
            example: '/api/reports/natural-language/shift/123?includeRawData=true'
          },
          {
            type: 'daily_summary',
            name: 'Daily Summary Report',
            description: 'Natural language summary of all shifts for a specific date',
            endpoint: '/api/reports/natural-language/daily/:date',
            parameters: {
              date: 'Required - Date in YYYY-MM-DD format'
            },
            example: '/api/reports/natural-language/daily/2024-01-15'
          }
        ],
        features: [
          'Executive summaries with performance ratings',
          'Detailed asset performance analysis',
          'Key events timeline and insights',
          'Actionable recommendations',
          'Performance conclusions and next steps',
          'Automatic identification of best/worst performers',
          'Root cause analysis suggestions'
        ]
      };

      res.json(reportTypes);

    } catch (error) {
      console.error('Error getting report types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get report types',
        error: error.message
      });
    }
  }

  /**
   * Generate sample report for demonstration
   */
  async generateSampleReport(req, res) {
    try {
      const sampleReport = {
        success: true,
        shift_id: 'SAMPLE',
        report_type: 'shift',
        generated_at: new Date().toISOString(),
        narrative: {
          executive_summary: `**Shift Sample Performance Summary**

✅ **Excellent Performance**: The shift achieved 87.3% availability, exceeding industry standards. Over the 8.0-hour shift, there were 12 stops recorded. The Overall Equipment Effectiveness (OEE) was 78.5%.`,

          shift_overview: `**Shift Details**

• **Shift Name**: Morning Production Shift
• **Duration**: 6:00 AM to 2:00 PM (8.0 hours)
• **Total Runtime**: 418.2 minutes
• **Total Downtime**: 61.8 minutes
• **Total Stops**: 12
• **Short Stops**: 8

📊 **Notable Pattern**: 67% of stops were short stops, indicating potential issues with frequent minor interruptions that may benefit from root cause analysis.`,

          asset_performance: `**Asset Performance Analysis**

🏆 **Best Performer**: Packaging Line A achieved 92.1% availability with 3 stops during the shift.

⚠️ **Needs Attention**: Conveyor Belt 2 had 78.4% availability with 5 stops, requiring 18.3 minutes of downtime.

**Individual Asset Analysis:**

1. **Conveyor Belt 2**
   • Availability: 78.4% (Good)
   • Runtime: 376.3 minutes
   • Stops: 5 (3 short, 2 long)
   • Average stop duration: 3.7 minutes
   • Longest stop: 8.2 minutes
   • Insights: Long stop durations

2. **Assembly Station 1**
   • Availability: 85.6% (Excellent)
   • Runtime: 410.7 minutes
   • Stops: 4 (3 short, 1 long)
   • Average stop duration: 2.1 minutes
   • Longest stop: 5.1 minutes

3. **Packaging Line A**
   • Availability: 92.1% (Excellent)
   • Runtime: 441.8 minutes
   • Stops: 3 (2 short, 1 long)
   • Average stop duration: 1.8 minutes
   • Longest stop: 3.2 minutes
   • Insights: High performer`,

          key_events: `**Key Events During Shift**

📉 **Stop Events**: 12 stops were recorded during the shift.
🚨 **Significant Stops**: 3 stops lasted longer than 5 minutes:
   • 8:15 AM: Conveyor Belt 2 stopped for 8.2 minutes
   • 10:30 AM: Assembly Station 1 stopped for 5.1 minutes
   • 1:45 PM: Conveyor Belt 2 stopped for 6.8 minutes

✅ **Start Events**: 12 assets were started during the shift.

⏰ **Timeline of Critical Events**:
   • 8:15 AM: Conveyor Belt 2 - STOP (8.2 min)
   • 10:30 AM: Assembly Station 1 - STOP (5.1 min)
   • 1:45 PM: Conveyor Belt 2 - STOP (6.8 min)`,

          recommendations: `**Recommendations for Improvement**

1. 🔧 **Short Stop Analysis**: High frequency of short stops detected. Investigate common causes such as material flow issues, minor jams, or operator interventions.

2. ⏱️ **Response Time**: Conveyor Belt 2 have long average stop durations. Review maintenance response procedures.`,

          conclusion: `**Shift Performance Conclusion**

👍 **Solid Performance**: This shift showed good overall performance with some areas for improvement. Focus on the recommendations above to achieve excellence in future shifts.

**Next Steps**: Review this report with the operations team and implement priority recommendations before the next shift.`
        }
      };

      res.json(sampleReport);

    } catch (error) {
      console.error('Error generating sample report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate sample report',
        error: error.message
      });
    }
  }
}

module.exports = new NaturalLanguageReportController();