const { Op } = require('sequelize');
const { User, Team, TeamMember, Asset, Event, Shift } = require('../models/database');
const permissionService = require('./permissionService');

/**
 * Service for applying team-based data filtering
 */
class DataFilterService {
  /**
   * Get base query filters for a user based on their permissions and team membership
   */
  static async getBaseFilters(user, resourceType) {
    try {
      // Super admins and admins can see all data
      if (user.role === 'super_admin' || user.role === 'admin') {
        return {};
      }

      // Get user's accessible teams
      const accessibleTeams = await permissionService.getAccessibleTeams(user.id);
      const teamIds = accessibleTeams.map(team => team.id);

      // Base filters for team-based access
      const filters = {
        [Op.or]: [
          // Data owned by the user
          { created_by: user.id },
          // Data shared with user's teams (if team_id field exists)
          ...(teamIds.length > 0 ? [{ team_id: { [Op.in]: teamIds } }] : [])
        ]
      };

      return filters;
    } catch (error) {
      console.error('Error getting base filters:', error);
      return { created_by: user.id }; // Fallback to user-only data
    }
  }

  /**
   * Apply team-based filters to asset queries
   */
  static async filterAssets(user, baseQuery = {}) {
    try {
      const baseFilters = await this.getBaseFilters(user, 'assets');
      
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          ...baseFilters
        },
        include: [
          ...(baseQuery.include || []),
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          }
        ]
      };
    } catch (error) {
      console.error('Error filtering assets:', error);
      return baseQuery;
    }
  }

  /**
   * Apply team-based filters to event queries
   */
  static async filterEvents(user, baseQuery = {}) {
    try {
      const baseFilters = await this.getBaseFilters(user, 'events');
      
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          ...baseFilters
        },
        include: [
          ...(baseQuery.include || []),
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Asset,
            as: 'asset',
            attributes: ['id', 'name', 'type']
          }
        ]
      };
    } catch (error) {
      console.error('Error filtering events:', error);
      return baseQuery;
    }
  }

  /**
   * Apply team-based filters to shift queries
   */
  static async filterShifts(user, baseQuery = {}) {
    try {
      const baseFilters = await this.getBaseFilters(user, 'shifts');
      
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          ...baseFilters
        },
        include: [
          ...(baseQuery.include || []),
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      };
    } catch (error) {
      console.error('Error filtering shifts:', error);
      return baseQuery;
    }
  }

  /**
   * Get teams accessible to a user for data sharing
   */
  static async getAccessibleTeamsForSharing(userId) {
    try {
      const teams = await Team.findAll({
        include: [{
          model: TeamMember,
          as: 'members',
          where: {
            user_id: userId,
            status: 'active',
            role: { [Op.in]: ['owner', 'admin', 'member'] }
          },
          required: true
        }]
      });

      return teams.map(team => ({
        id: team.id,
        name: team.name,
        role: team.members[0].role,
        canShare: ['owner', 'admin'].includes(team.members[0].role)
      }));
    } catch (error) {
      console.error('Error getting accessible teams for sharing:', error);
      return [];
    }
  }

  /**
   * Check if user can share data with a specific team
   */
  static async canShareWithTeam(userId, teamId) {
    try {
      const membership = await TeamMember.findOne({
        where: {
          user_id: userId,
          team_id: teamId,
          status: 'active',
          role: { [Op.in]: ['owner', 'admin', 'member'] }
        }
      });

      return !!membership;
    } catch (error) {
      console.error('Error checking team sharing permission:', error);
      return false;
    }
  }

  /**
   * Apply analytics filters based on user permissions
   */
  static async filterAnalyticsData(user, dataType, baseQuery = {}) {
    try {
      // Check if user has analytics permissions
      const hasAnalyticsAccess = await permissionService.hasPermission(
        user,
        'data',
        'analytics'
      );

      if (!hasAnalyticsAccess) {
        throw new Error('Insufficient permissions for analytics data');
      }

      // Apply team-based filters for non-admin users
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        const accessibleTeams = await permissionService.getAccessibleTeams(user.id);
        const teamIds = accessibleTeams.map(team => team.id);

        return {
          ...baseQuery,
          where: {
            ...baseQuery.where,
            [Op.or]: [
              { created_by: user.id },
              ...(teamIds.length > 0 ? [{ team_id: { [Op.in]: teamIds } }] : [])
            ]
          }
        };
      }

      return baseQuery;
    } catch (error) {
      console.error('Error filtering analytics data:', error);
      throw error;
    }
  }

  /**
   * Get data visibility scope for a user
   */
  static async getDataVisibilityScope(user) {
    try {
      if (user.role === 'super_admin' || user.role === 'admin') {
        return {
          scope: 'global',
          description: 'Access to all system data'
        };
      }

      const accessibleTeams = await permissionService.getAccessibleTeams(user.id);
      
      if (accessibleTeams.length > 0) {
        return {
          scope: 'team',
          description: `Access to data from ${accessibleTeams.length} team(s)`,
          teams: accessibleTeams.map(team => ({
            id: team.id,
            name: team.name,
            role: team.TeamMember?.role
          }))
        };
      }

      return {
        scope: 'personal',
        description: 'Access to personal data only'
      };
    } catch (error) {
      console.error('Error getting data visibility scope:', error);
      return {
        scope: 'personal',
        description: 'Access to personal data only'
      };
    }
  }

  /**
   * Apply filters to search queries based on user permissions
   */
  static async filterSearchResults(user, searchResults, resourceType) {
    try {
      if (user.role === 'super_admin' || user.role === 'admin') {
        return searchResults;
      }

      const accessibleTeams = await permissionService.getAccessibleTeams(user.id);
      const teamIds = accessibleTeams.map(team => team.id);

      return searchResults.filter(result => {
        // User owns the resource
        if (result.created_by === user.id || result.user_id === user.id) {
          return true;
        }

        // Resource belongs to accessible team
        if (result.team_id && teamIds.includes(result.team_id)) {
          return true;
        }

        return false;
      });
    } catch (error) {
      console.error('Error filtering search results:', error);
      return searchResults.filter(result => 
        result.created_by === user.id || result.user_id === user.id
      );
    }
  }

  /**
   * Get team-based aggregation filters
   */
  static async getAggregationFilters(user, resourceType) {
    try {
      const baseFilters = await this.getBaseFilters(user, resourceType);
      
      return {
        where: baseFilters,
        group: user.role === 'super_admin' || user.role === 'admin' 
          ? ['team_id', 'created_by'] 
          : ['created_by']
      };
    } catch (error) {
      console.error('Error getting aggregation filters:', error);
      return {
        where: { created_by: user.id },
        group: ['created_by']
      };
    }
  }
}

module.exports = DataFilterService;