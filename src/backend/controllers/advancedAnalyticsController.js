const advancedAnalyticsService = require('../services/advancedAnalyticsService');
const databaseService = require('../services/databaseService');
const logger = require('../utils/logger');

/**
 * Advanced Analytics Controller
 * Handles predictive maintenance and advanced analytics endpoints
 */
class AdvancedAnalyticsController {
  /**
   * Get predictive maintenance report
   * GET /api/analytics/predictive-maintenance
   */
  async getPredictiveMaintenanceReport(req, res) {
    try {
      const { timeframe = 30, includeRecommendations = true } = req.query;
      
      logger.info('🔮 Generating predictive maintenance report', {
        timeframe: parseInt(timeframe),
        includeRecommendations: includeRecommendations === 'true'
      });

      // Get assets and events data
      const assets = await databaseService.getAllAssets();
      const events = await databaseService.getArchivedEvents({
        limit: 10000,
        timeframe: parseInt(timeframe)
      });

      if (!assets || assets.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No assets found for analysis'
        });
      }

      // Generate predictive maintenance report
      const report = await advancedAnalyticsService.generatePredictiveMaintenanceReport(
        assets,
        events || [],
        {
          timeframe: parseInt(timeframe),
          includeRecommendations: includeRecommendations === 'true'
        }
      );

      logger.info('✅ Predictive maintenance report generated successfully', {
        assetsAnalyzed: report.assets_analyzed,
        riskLevel: report.risk_assessment?.overall_risk_level,
        recommendationsCount: report.maintenance_recommendations?.length || 0
      });

      res.json({
        success: true,
        data: report,
        metadata: {
          generated_at: new Date().toISOString(),
          timeframe_days: parseInt(timeframe),
          data_points: events?.length || 0
        }
      });

    } catch (error) {
      logger.error('❌ Error generating predictive maintenance report', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate predictive maintenance report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get asset health scores
   * GET /api/analytics/asset-health
   */
  async getAssetHealthScores(req, res) {
    try {
      const { assetId, timeframe = 30 } = req.query;
      
      logger.info('🏥 Getting asset health scores', {
        assetId: assetId || 'all',
        timeframe: parseInt(timeframe)
      });

      // Get assets data
      const assets = assetId ? 
        [await databaseService.getAssetById(assetId)] : 
        await databaseService.getAllAssets();

      if (!assets || assets.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No assets found'
        });
      }

      // Get events for analysis
      const events = await databaseService.getArchivedEvents({
        limit: 10000,
        timeframe: parseInt(timeframe),
        assetId: assetId
      });

      // Generate health analysis for each asset
      const healthScores = [];
      for (const asset of assets.filter(a => a)) {
        const assetInsights = await advancedAnalyticsService.analyzeAssetPredictiveMetrics(
          asset,
          events || [],
          parseInt(timeframe)
        );
        
        healthScores.push({
          asset_id: asset.id,
          asset_name: asset.name,
          health_score: assetInsights.health_score,
          risk_level: assetInsights.risk_level,
          failure_probability: assetInsights.failure_probability,
          predicted_maintenance_date: assetInsights.predicted_maintenance_date,
          anomalies_count: assetInsights.anomalies_detected?.length || 0,
          degradation_indicators_count: assetInsights.degradation_indicators?.length || 0
        });
      }

      // Sort by health score (lowest first - most critical)
      healthScores.sort((a, b) => a.health_score - b.health_score);

      logger.info('✅ Asset health scores calculated', {
        assetsAnalyzed: healthScores.length,
        criticalAssets: healthScores.filter(h => h.risk_level === 'CRITICAL').length,
        highRiskAssets: healthScores.filter(h => h.risk_level === 'HIGH').length
      });

      res.json({
        success: true,
        data: {
          health_scores: healthScores,
          summary: {
            total_assets: healthScores.length,
            critical_assets: healthScores.filter(h => h.risk_level === 'CRITICAL').length,
            high_risk_assets: healthScores.filter(h => h.risk_level === 'HIGH').length,
            average_health_score: healthScores.length > 0 ? 
              healthScores.reduce((sum, h) => sum + h.health_score, 0) / healthScores.length : 0
          }
        },
        metadata: {
          generated_at: new Date().toISOString(),
          timeframe_days: parseInt(timeframe)
        }
      });

    } catch (error) {
      logger.error('❌ Error getting asset health scores', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get asset health scores',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get performance forecasts
   * GET /api/analytics/forecasts
   */
  async getPerformanceForecasts(req, res) {
    try {
      const { timeframe = 30, forecastPeriod = 30 } = req.query;
      
      logger.info('📈 Generating performance forecasts', {
        timeframe: parseInt(timeframe),
        forecastPeriod: parseInt(forecastPeriod)
      });

      // Get assets and events data
      const assets = await databaseService.getAllAssets();
      const events = await databaseService.getArchivedEvents({
        limit: 10000,
        timeframe: parseInt(timeframe)
      });

      if (!assets || assets.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No assets found for forecasting'
        });
      }

      // Generate trend analysis
      const trendAnalysis = await advancedAnalyticsService.performTrendAnalysis(
        assets,
        events || [],
        parseInt(timeframe)
      );

      // Generate forecasts
      const forecasts = advancedAnalyticsService.generatePerformanceForecasts(trendAnalysis);

      logger.info('✅ Performance forecasts generated', {
        assetsAnalyzed: assets.length,
        forecastPeriods: Object.keys(forecasts).length - 1 // Exclude confidence_intervals
      });

      res.json({
        success: true,
        data: {
          forecasts,
          trend_analysis: trendAnalysis,
          input_data: {
            assets_count: assets.length,
            events_count: events?.length || 0,
            analysis_period_days: parseInt(timeframe)
          }
        },
        metadata: {
          generated_at: new Date().toISOString(),
          forecast_period_days: parseInt(forecastPeriod)
        }
      });

    } catch (error) {
      logger.error('❌ Error generating performance forecasts', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate performance forecasts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get maintenance recommendations
   * GET /api/analytics/maintenance-recommendations
   */
  async getMaintenanceRecommendations(req, res) {
    try {
      const { priority, timeframe = 30 } = req.query;
      
      logger.info('🔧 Getting maintenance recommendations', {
        priority: priority || 'all',
        timeframe: parseInt(timeframe)
      });

      // Get full predictive maintenance report
      const assets = await databaseService.getAllAssets();
      const events = await databaseService.getArchivedEvents({
        limit: 10000,
        timeframe: parseInt(timeframe)
      });

      if (!assets || assets.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No assets found for recommendations'
        });
      }

      const report = await advancedAnalyticsService.generatePredictiveMaintenanceReport(
        assets,
        events || [],
        {
          timeframe: parseInt(timeframe),
          includeRecommendations: true
        }
      );

      let recommendations = report.maintenance_recommendations || [];

      // Filter by priority if specified
      if (priority && priority !== 'all') {
        recommendations = recommendations.filter(r => 
          r.priority.toLowerCase() === priority.toLowerCase()
        );
      }

      // Add additional context to recommendations
      const enrichedRecommendations = recommendations.map(rec => ({
        ...rec,
        created_at: new Date().toISOString(),
        status: 'PENDING',
        urgency_score: this.calculateUrgencyScore(rec.priority),
        estimated_cost: this.estimateMaintenanceCost(rec)
      }));

      logger.info('✅ Maintenance recommendations generated', {
        totalRecommendations: enrichedRecommendations.length,
        urgentCount: enrichedRecommendations.filter(r => r.priority === 'URGENT').length,
        highPriorityCount: enrichedRecommendations.filter(r => r.priority === 'HIGH').length
      });

      res.json({
        success: true,
        data: {
          recommendations: enrichedRecommendations,
          summary: {
            total_recommendations: enrichedRecommendations.length,
            by_priority: {
              urgent: enrichedRecommendations.filter(r => r.priority === 'URGENT').length,
              high: enrichedRecommendations.filter(r => r.priority === 'HIGH').length,
              medium: enrichedRecommendations.filter(r => r.priority === 'MEDIUM').length,
              low: enrichedRecommendations.filter(r => r.priority === 'LOW').length
            },
            estimated_total_cost: enrichedRecommendations.reduce((sum, r) => sum + (r.estimated_cost || 0), 0)
          }
        },
        metadata: {
          generated_at: new Date().toISOString(),
          analysis_timeframe_days: parseInt(timeframe)
        }
      });

    } catch (error) {
      logger.error('❌ Error getting maintenance recommendations', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get maintenance recommendations',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get anomaly detection results
   * GET /api/analytics/anomalies
   */
  async getAnomalyDetection(req, res) {
    try {
      const { assetId, timeframe = 7, severity } = req.query;
      
      logger.info('🚨 Detecting anomalies', {
        assetId: assetId || 'all',
        timeframe: parseInt(timeframe),
        severity: severity || 'all'
      });

      // Get assets data
      const assets = assetId ? 
        [await databaseService.getAssetById(assetId)] : 
        await databaseService.getAllAssets();

      if (!assets || assets.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No assets found'
        });
      }

      // Get recent events for anomaly detection
      const events = await databaseService.getArchivedEvents({
        limit: 5000,
        timeframe: parseInt(timeframe),
        assetId: assetId
      });

      // Detect anomalies for each asset
      const allAnomalies = [];
      for (const asset of assets.filter(a => a)) {
        const assetInsights = await advancedAnalyticsService.analyzeAssetPredictiveMetrics(
          asset,
          events || [],
          parseInt(timeframe)
        );
        
        const anomalies = assetInsights.anomalies_detected.map(anomaly => ({
          ...anomaly,
          asset_id: asset.id,
          asset_name: asset.name,
          detected_at: new Date().toISOString()
        }));
        
        allAnomalies.push(...anomalies);
      }

      // Filter by severity if specified
      let filteredAnomalies = allAnomalies;
      if (severity && severity !== 'all') {
        filteredAnomalies = allAnomalies.filter(a => 
          a.severity.toLowerCase() === severity.toLowerCase()
        );
      }

      // Sort by severity and timestamp
      const severityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
      filteredAnomalies.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      logger.info('✅ Anomaly detection completed', {
        totalAnomalies: filteredAnomalies.length,
        highSeverity: filteredAnomalies.filter(a => a.severity === 'HIGH').length,
        assetsWithAnomalies: new Set(filteredAnomalies.map(a => a.asset_id)).size
      });

      res.json({
        success: true,
        data: {
          anomalies: filteredAnomalies,
          summary: {
            total_anomalies: filteredAnomalies.length,
            by_severity: {
              high: filteredAnomalies.filter(a => a.severity === 'HIGH').length,
              medium: filteredAnomalies.filter(a => a.severity === 'MEDIUM').length,
              low: filteredAnomalies.filter(a => a.severity === 'LOW').length
            },
            assets_affected: new Set(filteredAnomalies.map(a => a.asset_id)).size,
            detection_period: `Last ${timeframe} days`
          }
        },
        metadata: {
          generated_at: new Date().toISOString(),
          detection_timeframe_days: parseInt(timeframe)
        }
      });

    } catch (error) {
      logger.error('❌ Error detecting anomalies', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to detect anomalies',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Helper methods
  calculateUrgencyScore(priority) {
    const scores = {
      'URGENT': 100,
      'HIGH': 75,
      'MEDIUM': 50,
      'LOW': 25
    };
    return scores[priority] || 0;
  }

  estimateMaintenanceCost(recommendation) {
    // Simplified cost estimation based on priority and impact
    const baseCosts = {
      'URGENT': 5000,
      'HIGH': 3000,
      'MEDIUM': 1500,
      'LOW': 500
    };
    
    const impactMultipliers = {
      'HIGH': 1.5,
      'MEDIUM': 1.0,
      'LOW': 0.7
    };
    
    const baseCost = baseCosts[recommendation.priority] || 1000;
    const multiplier = impactMultipliers[recommendation.cost_impact] || 1.0;
    
    return Math.round(baseCost * multiplier);
  }
}

module.exports = new AdvancedAnalyticsController();