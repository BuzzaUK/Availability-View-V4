const databaseService = require('../services/databaseService');
const permissionService = require('../services/permissionService');
const dataFilterService = require('../services/dataFilterService');
const { User, TeamMember, Team } = require('../models/database');
const { Op } = require('sequelize');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin, Manager)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', teamId = '' } = req.query;
    
    // Check permissions
    const canViewAllUsers = await permissionService.hasPermission(
      req.user,
      'system',
      'manageUsers'
    );
    
    if (!canViewAllUsers) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view users'
      });
    }
    
    let users;
    
    // Super admins and admins can see all users
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      users = await User.findAll({
        attributes: { exclude: ['password'] },
        include: [{
          model: TeamMember,
          as: 'teamMemberships',
          include: [{
            model: Team,
            as: 'team',
            attributes: ['id', 'name']
          }],
          required: false
        }]
      });
    } else {
      // Managers can only see users in their teams
      const accessibleTeams = await permissionService.getAccessibleTeams(req.user.id);
      const teamIds = accessibleTeams.map(team => team.id);
      
      users = await User.findAll({
        attributes: { exclude: ['password'] },
        include: [{
          model: TeamMember,
          as: 'teamMemberships',
          where: {
            team_id: { [Op.in]: teamIds }
          },
          include: [{
            model: Team,
            as: 'team',
            attributes: ['id', 'name']
          }],
          required: true
        }]
      });
    }
    
    // Convert to plain objects for filtering
    users = users.map(user => user.toJSON());
    
    // Filter by search term
    if (search) {
      users = users.filter(user => {
        const fullName = `${user.name || ''}`.trim();
        return fullName.toLowerCase().includes(search.toLowerCase()) ||
               user.email.toLowerCase().includes(search.toLowerCase());
      });
    }
    
    // Filter by role
    if (role) {
      users = users.filter(user => user.role === role);
    }
    
    // Filter by team
    if (teamId) {
      users = users.filter(user => 
        user.teamMemberships && 
        user.teamMemberships.some(membership => membership.team_id === parseInt(teamId))
      );
    }
  
    // Enhance user data with team information
    users = users.map(user => ({
      ...user,
      teams: user.teamMemberships ? user.teamMemberships.map(membership => ({
        id: membership.team.id,
        name: membership.team.name,
        role: membership.role,
        status: membership.status
      })) : [],
      teamMemberships: undefined // Remove raw membership data
    }));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        pages: Math.ceil(users.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin, Manager)
const getUserById = async (req, res) => {
  try {
    // Check permissions
    const canViewUser = await permissionService.hasPermission(
      req.user,
      'system',
      'manageUsers'
    ) || req.user.id === parseInt(req.params.id);
    
    if (!canViewUser) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view this user'
      });
    }
    
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: TeamMember,
        as: 'teamMemberships',
        include: [{
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'description']
        }],
        required: false
      }]
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Convert to plain object and enhance with team data
    const userData = user.toJSON();
    userData.teams = userData.teamMemberships ? userData.teamMemberships.map(membership => ({
      id: membership.team.id,
      name: membership.team.name,
      description: membership.team.description,
      role: membership.role,
      status: membership.status,
      permissions: membership.permissions,
      joined_at: membership.joined_at
    })) : [];
    delete userData.teamMemberships;
    
    res.json({ success: true, data: userData });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async (req, res) => {
  try {
    // Check permissions
    const canCreateUser = await permissionService.hasPermission(
      req.user,
      'system',
      'manageUsers'
    );
    
    if (!canCreateUser) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create users'
      });
    }
    
    const { 
      name, 
      email, 
      password, 
      role = 'operator', 
      isActive = true, 
      shiftReportPreferences,
      permissions,
      preferences,
      profile,
      teamId
    } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a name' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }
    
    // Validate role permissions
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can create super admin users'
      });
    }
    
    // Get default permissions for role
    const defaultPermissions = permissionService.getDefaultPermissions(role);
    
    // Create user data
    const userData = {
      name,
      email,
      password,
      role,
      isActive,
      permissions: permissions || defaultPermissions,
      preferences: preferences || {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          reports: true
        },
        dashboard: {
          defaultView: 'overview',
          refreshInterval: 30
        }
      },
      profile: profile || {},
      receive_reports: shiftReportPreferences?.enabled || false,
      shiftReportPreferences: shiftReportPreferences || {
        enabled: false,
        shifts: [],
        emailFormat: 'pdf'
      }
    };
    
    // Create user
    const newUser = await User.create(userData);
    
    // Add to team if specified
    if (teamId) {
      const canManageTeam = await permissionService.hasPermission(
        req.user,
        'team',
        'manage_members',
        { teamId }
      );
      
      if (canManageTeam) {
        await TeamMember.create({
          team_id: teamId,
          user_id: newUser.id,
          role: 'member',
          status: 'active',
          invited_by: req.user.id,
          joined_at: new Date()
        });
      }
    }
    
    // Get user with team data
    const userWithTeams = await User.findByPk(newUser.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: TeamMember,
        as: 'teamMemberships',
        include: [{
          model: Team,
          as: 'team',
          attributes: ['id', 'name']
        }],
        required: false
      }]
    });
    
    const userData_response = userWithTeams.toJSON();
    userData_response.teams = userData_response.teamMemberships ? userData_response.teamMemberships.map(membership => ({
      id: membership.team.id,
      name: membership.team.name,
      role: membership.role,
      status: membership.status
    })) : [];
    delete userData_response.teamMemberships;
    
    res.status(201).json({ success: true, data: userData_response });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { 
      name, 
      email, 
      role, 
      isActive, 
      shiftReportPreferences,
      permissions,
      preferences,
      profile,
      current_team_id
    } = req.body;
    
    // Check permissions
    const canUpdateUser = await permissionService.hasPermission(
      req.user,
      'system',
      'manageUsers'
    ) || req.user.id === parseInt(userId);
    
    if (!canUpdateUser) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update this user'
      });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Validate role change permissions
    if (role && role !== user.role) {
      if (role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only super admins can assign super admin role'
        });
      }
      
      if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only super admins can modify super admin users'
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (current_team_id !== undefined) updateData.current_team_id = current_team_id;
    
    // Handle permissions (only admins can modify permissions)
    if (permissions !== undefined && (req.user.role === 'super_admin' || req.user.role === 'admin')) {
      const validation = permissionService.validatePermissions(permissions);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      updateData.permissions = permissions;
    }
    
    // Handle preferences (users can update their own preferences)
    if (preferences !== undefined) {
      updateData.preferences = {
        ...user.preferences,
        ...preferences
      };
    }
    
    // Handle profile (users can update their own profile)
    if (profile !== undefined) {
      updateData.profile = {
        ...user.profile,
        ...profile
      };
    }
    
    if (shiftReportPreferences !== undefined) {
      updateData.receive_reports = shiftReportPreferences.enabled;
      updateData.shiftReportPreferences = shiftReportPreferences;
    }
    
    // Update user
    await user.update(updateData);
    
    // Get updated user with team data
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: TeamMember,
        as: 'teamMemberships',
        include: [{
          model: Team,
          as: 'team',
          attributes: ['id', 'name']
        }],
        required: false
      }]
    });
    
    const userData = updatedUser.toJSON();
    userData.teams = userData.teamMemberships ? userData.teamMemberships.map(membership => ({
      id: membership.team.id,
      name: membership.team.name,
      role: membership.role,
      status: membership.status
    })) : [];
    delete userData.teamMemberships;
    
    res.json({ success: true, data: userData });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check permissions
    const canDeleteUser = await permissionService.hasPermission(
      req.user,
      'system',
      'manageUsers'
    );
    
    if (!canDeleteUser) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete users'
      });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Prevent deleting super admin users (only super admins can delete super admins)
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can delete super admin users'
      });
    }
    
    // Prevent deleting the last admin or super admin
    const adminCount = await User.count({ where: { role: 'admin', isActive: true } });
    const superAdminCount = await User.count({ where: { role: 'super_admin', isActive: true } });
    
    if (user.role === 'admin' && adminCount === 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete the last admin user' 
      });
    }
    
    if (user.role === 'super_admin' && superAdminCount === 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete the last super admin user' 
      });
    }
    
    // Prevent self-deletion
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    // Remove user from all teams first
    await TeamMember.destroy({
      where: { user_id: userId }
    });
    
    // Delete user
    await user.destroy();
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: TeamMember,
        as: 'teamMemberships',
        where: { status: 'active' },
        include: [{
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'description']
        }],
        required: false
      }]
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userData = user.toJSON();
    userData.teams = userData.teamMemberships ? userData.teamMemberships.map(membership => ({
      id: membership.team.id,
      name: membership.team.name,
      description: membership.team.description,
      role: membership.role,
      permissions: membership.permissions
    })) : [];
    delete userData.teamMemberships;
    
    // Add data visibility scope
    userData.dataScope = await dataFilterService.getDataVisibilityScope(user);
    
    res.json({ success: true, data: userData });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private
const updateCurrentUser = async (req, res) => {
  try {
    const { name, preferences, profile } = req.body;
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    
    if (preferences !== undefined) {
      updateData.preferences = {
        ...user.preferences,
        ...preferences
      };
    }
    
    if (profile !== undefined) {
      updateData.profile = {
        ...user.profile,
        ...profile
      };
    }
    
    await user.update(updateData);
    
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating current user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
  updateCurrentUser
};