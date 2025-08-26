const { User, Team, TeamMember } = require('../models/database');

class PermissionService {
  constructor() {
    // Define permission hierarchies
    this.roleHierarchy = {
      'super_admin': 100,
      'admin': 80,
      'manager': 60,
      'operator': 40,
      'viewer': 20
    };

    // Define default permissions for each role
    this.defaultPermissions = {
      'super_admin': {
        system: {
          manageUsers: true,
          manageTeams: true,
          systemSettings: true,
          viewLogs: true,
          manageBackups: true
        },
        data: {
          viewAll: true,
          createAll: true,
          editAll: true,
          deleteAll: true,
          exportAll: true
        },
        teams: {
          create: true,
          join: true,
          invite: true,
          manage: true
        }
      },
      'admin': {
        system: {
          manageUsers: true,
          manageTeams: true,
          systemSettings: true,
          viewLogs: true,
          manageBackups: false
        },
        data: {
          viewAll: true,
          createAll: true,
          editAll: true,
          deleteAll: true,
          exportAll: true
        },
        teams: {
          create: true,
          join: true,
          invite: true,
          manage: true
        }
      },
      'manager': {
        system: {
          manageUsers: false,
          manageTeams: false,
          systemSettings: false,
          viewLogs: true,
          manageBackups: false
        },
        data: {
          viewAll: true,
          createAll: true,
          editAll: true,
          deleteAll: false,
          exportAll: true
        },
        teams: {
          create: true,
          join: true,
          invite: true,
          manage: false
        }
      },
      'operator': {
        system: {
          manageUsers: false,
          manageTeams: false,
          systemSettings: false,
          viewLogs: false,
          manageBackups: false
        },
        data: {
          viewAll: true,
          createAll: true,
          editAll: false,
          deleteAll: false,
          exportAll: false
        },
        teams: {
          create: false,
          join: true,
          invite: false,
          manage: false
        }
      },
      'viewer': {
        system: {
          manageUsers: false,
          manageTeams: false,
          systemSettings: false,
          viewLogs: false,
          manageBackups: false
        },
        data: {
          viewAll: true,
          createAll: false,
          editAll: false,
          deleteAll: false,
          exportAll: false
        },
        teams: {
          create: false,
          join: true,
          invite: false,
          manage: false
        }
      }
    };
  }

  /**
   * Check if user has a specific permission
   * @param {Object} user - User object
   * @param {string} resource - Resource type (system, data, teams)
   * @param {string} action - Action to check (view, create, edit, delete, etc.)
   * @param {Object} context - Additional context (teamId, resourceId, etc.)
   * @returns {boolean}
   */
  async hasPermission(user, resource, action, context = {}) {
    try {
      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return true;
      }

      // Check system-level permissions
      if (resource === 'system') {
        return this.checkSystemPermission(user, action);
      }

      // Check team-specific permissions
      if (context.teamId) {
        return await this.checkTeamPermission(user, resource, action, context.teamId);
      }

      // Check global permissions
      return this.checkGlobalPermission(user, resource, action);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check system-level permissions
   */
  checkSystemPermission(user, action) {
    const userPermissions = user.permissions || this.defaultPermissions[user.role] || {};
    const systemPermissions = userPermissions.system || {};
    
    return systemPermissions[action] === true;
  }

  /**
   * Check global data permissions
   */
  checkGlobalPermission(user, resource, action) {
    const userPermissions = user.permissions || this.defaultPermissions[user.role] || {};
    const resourcePermissions = userPermissions[resource] || {};
    
    return resourcePermissions[action] === true || resourcePermissions[`${action}All`] === true;
  }

  /**
   * Check team-specific permissions
   */
  async checkTeamPermission(user, resource, action, teamId) {
    try {
      // First check if user has global permission
      if (this.checkGlobalPermission(user, resource, action)) {
        return true;
      }

      // Check team membership and permissions
      const membership = await TeamMember.findOne({
        where: {
          team_id: teamId,
          user_id: user.id,
          status: 'active'
        }
      });

      if (!membership) {
        return false;
      }

      // Check team-specific permissions
      const teamPermissions = membership.permissions || {};
      const resourcePermissions = teamPermissions[resource] || {};
      
      return resourcePermissions[action] === true;
    } catch (error) {
      console.error('Error checking team permission:', error);
      return false;
    }
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(userId, teamId = null) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let permissions = user.permissions || this.defaultPermissions[user.role] || {};

      // If checking team-specific permissions
      if (teamId) {
        const membership = await TeamMember.findOne({
          where: {
            team_id: teamId,
            user_id: userId,
            status: 'active'
          }
        });

        if (membership) {
          // Merge team permissions with user permissions
          permissions = this.mergePermissions(permissions, membership.permissions || {});
        }
      }

      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {};
    }
  }

  /**
   * Merge permissions objects
   */
  mergePermissions(basePermissions, additionalPermissions) {
    const merged = JSON.parse(JSON.stringify(basePermissions));

    for (const resource in additionalPermissions) {
      if (!merged[resource]) {
        merged[resource] = {};
      }

      for (const action in additionalPermissions[resource]) {
        // Use OR logic - if either permission grants access, allow it
        merged[resource][action] = merged[resource][action] || additionalPermissions[resource][action];
      }
    }

    return merged;
  }

  /**
   * Check if user can access resource based on ownership
   */
  async canAccessResource(user, resourceType, resourceId, action = 'view') {
    try {
      // Super admin can access everything
      if (user.role === 'super_admin') {
        return true;
      }

      // Check global permissions first
      if (await this.hasPermission(user, 'data', action)) {
        return true;
      }

      // Check resource ownership or team membership
      return await this.checkResourceAccess(user, resourceType, resourceId, action);
    } catch (error) {
      console.error('Error checking resource access:', error);
      return false;
    }
  }

  /**
   * Check resource-specific access
   */
  async checkResourceAccess(user, resourceType, resourceId, action) {
    // This would be implemented based on specific resource types
    // For now, return basic access based on user role
    const roleLevel = this.roleHierarchy[user.role] || 0;
    
    switch (action) {
      case 'view':
        return roleLevel >= 20; // viewer and above
      case 'create':
        return roleLevel >= 40; // operator and above
      case 'edit':
        return roleLevel >= 60; // manager and above
      case 'delete':
        return roleLevel >= 80; // admin and above
      default:
        return false;
    }
  }

  /**
   * Get filtered data based on user permissions and team membership
   */
  async getAccessibleTeams(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return [];
      }

      // Super admin and admin can see all teams
      if (user.role === 'super_admin' || user.role === 'admin') {
        return await Team.findAll({
          include: [{
            model: TeamMember,
            as: 'members',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }]
          }]
        });
      }

      // Regular users can only see teams they're members of
      const memberships = await TeamMember.findAll({
        where: {
          user_id: userId,
          status: 'active'
        },
        include: [{
          model: Team,
          as: 'team',
          include: [{
            model: TeamMember,
            as: 'members',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }]
          }]
        }]
      });

      return memberships.map(membership => membership.team);
    } catch (error) {
      console.error('Error getting accessible teams:', error);
      return [];
    }
  }

  /**
   * Validate permission structure
   */
  validatePermissions(permissions) {
    const validResources = ['system', 'data', 'teams'];
    const validSystemActions = ['manageUsers', 'manageTeams', 'systemSettings', 'viewLogs', 'manageBackups'];
    const validDataActions = ['viewAll', 'createAll', 'editAll', 'deleteAll', 'exportAll'];
    const validTeamActions = ['create', 'join', 'invite', 'manage'];

    for (const resource in permissions) {
      if (!validResources.includes(resource)) {
        return { valid: false, error: `Invalid resource: ${resource}` };
      }

      const actions = permissions[resource];
      let validActions;

      switch (resource) {
        case 'system':
          validActions = validSystemActions;
          break;
        case 'data':
          validActions = validDataActions;
          break;
        case 'teams':
          validActions = validTeamActions;
          break;
      }

      for (const action in actions) {
        if (!validActions.includes(action)) {
          return { valid: false, error: `Invalid action '${action}' for resource '${resource}'` };
        }

        if (typeof actions[action] !== 'boolean') {
          return { valid: false, error: `Permission value must be boolean for '${resource}.${action}'` };
        }
      }
    }

    return { valid: true };
  }
}

module.exports = new PermissionService();