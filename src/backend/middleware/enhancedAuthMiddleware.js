const jwt = require('jsonwebtoken');
const databaseService = require('../services/databaseService');
const permissionService = require('../services/permissionService');
const { User, TeamMember } = require('../models/database');

/**
 * Enhanced authentication middleware with granular permissions
 */
exports.authenticateWithPermissions = async (req, res, next) => {
  let token;
  
  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Get user with full permissions
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: TeamMember,
        as: 'teamMemberships',
        where: { status: 'active' },
        required: false,
        include: [{
          model: require('../models/database').Team,
          as: 'team'
        }]
      }]
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Set enhanced user object with permissions
    req.user = {
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      preferences: user.preferences,
      current_team_id: user.current_team_id,
      profile: user.profile,
      teams: user.teamMemberships || [],
      isActive: user.isActive,
      // Helper methods
      hasPermission: async (resource, action, context = {}) => {
        return await permissionService.hasPermission(user, resource, action, context);
      },
      canAccessResource: async (resourceType, resourceId, action = 'view') => {
        return await permissionService.canAccessResource(user, resourceType, resourceId, action);
      }
    };
    
    next();
  } catch (error) {
    console.error('Enhanced auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

/**
 * Middleware to check specific permissions
 */
exports.requirePermission = (resource, action, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const context = {
        teamId: req.params.teamId || req.body.teamId || options.teamId,
        resourceId: req.params.id || req.params.resourceId || options.resourceId,
        ...options.context
      };

      const hasPermission = await permissionService.hasPermission(
        req.user,
        resource,
        action,
        context
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions for ${action} on ${resource}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

/**
 * Middleware to check team membership
 */
exports.requireTeamMembership = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const teamId = req.params.teamId || req.body.teamId;
      if (!teamId) {
        return res.status(400).json({
          success: false,
          message: 'Team ID required'
        });
      }

      const membership = await TeamMember.findOne({
        where: {
          team_id: teamId,
          user_id: req.user.id,
          status: 'active'
        }
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'Team membership required'
        });
      }

      if (roles.length > 0 && !roles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: `Required team role: ${roles.join(' or ')}`
        });
      }

      req.teamMembership = membership;
      next();
    } catch (error) {
      console.error('Team membership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking team membership'
      });
    }
  };
};

/**
 * Middleware to check resource ownership or team access
 */
exports.requireResourceAccess = (resourceType, action = 'view') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const resourceId = req.params.id || req.params.resourceId;
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required'
        });
      }

      const canAccess = await permissionService.canAccessResource(
        req.user,
        resourceType,
        resourceId,
        action
      );

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: `Access denied for ${action} on ${resourceType}`
        });
      }

      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource access'
      });
    }
  };
};

/**
 * Middleware to filter data based on user permissions and team membership
 */
exports.applyDataFilters = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      // Get user's accessible teams
      const accessibleTeams = await permissionService.getAccessibleTeams(req.user.id);
      const teamIds = accessibleTeams.map(team => team.id);

      // Add team filter to query if user doesn't have global access
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        req.dataFilters = {
          teamIds,
          userId: req.user.id
        };
      }

      next();
    } catch (error) {
      console.error('Data filter error:', error);
      next(); // Continue without filters on error
    }
  };
};

/**
 * Middleware to validate permission updates
 */
exports.validatePermissionUpdate = () => {
  return (req, res, next) => {
    try {
      const { permissions } = req.body;
      
      if (permissions) {
        const validation = permissionService.validatePermissions(permissions);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.error
          });
        }
      }

      next();
    } catch (error) {
      console.error('Permission validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error validating permissions'
      });
    }
  };
};

/**
 * Middleware to log permission-based actions
 */
exports.logPermissionAction = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log successful permission-based actions
      if (res.statusCode < 400 && req.user) {
        console.log(`🔐 Permission Action: ${req.user.email} performed ${action} on ${req.originalUrl}`);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};