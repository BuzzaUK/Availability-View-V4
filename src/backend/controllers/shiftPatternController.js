const { ShiftPattern, TeamShiftAssignment, Team, User, AuditLog, sequelize } = require('../models/database');
const { Op } = require('sequelize');

// Get all shift patterns
const getShiftPatterns = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, pattern_type, is_active } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    
    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Pattern type filter
    if (pattern_type) {
      whereClause.pattern_type = pattern_type;
    }
    
    // Active status filter
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }
    
    const { count, rows: shiftPatterns } = await ShiftPattern.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: TeamShiftAssignment,
          as: 'teamAssignments',
          include: [{
            model: Team,
            as: 'team',
            attributes: ['id', 'name']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      data: shiftPatterns,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching shift patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shift patterns',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get shift pattern by ID
const getShiftPatternById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shiftPattern = await ShiftPattern.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: TeamShiftAssignment,
          as: 'teamAssignments',
          include: [{
            model: Team,
            as: 'team',
            attributes: ['id', 'name', 'description']
          }, {
            model: User,
            as: 'assignedBy',
            attributes: ['id', 'name', 'email']
          }]
        }
      ]
    });
    
    if (!shiftPattern) {
      return res.status(404).json({
        success: false,
        message: 'Shift pattern not found'
      });
    }
    
    res.json({
      success: true,
      data: shiftPattern
    });
    
  } catch (error) {
    console.error('Error fetching shift pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shift pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new shift pattern
const createShiftPattern = async (req, res) => {
  try {
    const {
      name,
      description,
      pattern_type,
      shift_duration_hours,
      start_time,
      end_time,
      break_duration_minutes,
      days_of_week,
      rotation_schedule,
      overtime_rules,
      is_active = true
    } = req.body;
    
    // Validation
    if (!name || !pattern_type || !shift_duration_hours) {
      return res.status(400).json({
        success: false,
        message: 'Name, pattern type, and shift duration are required'
      });
    }
    
    // Check for duplicate names
    const existingPattern = await ShiftPattern.findOne({
      where: { name: name.trim() }
    });
    
    if (existingPattern) {
      return res.status(400).json({
        success: false,
        message: 'A shift pattern with this name already exists'
      });
    }
    
    const shiftPattern = await ShiftPattern.create({
      name: name.trim(),
      description: description?.trim(),
      pattern_type,
      shift_duration_hours,
      start_time,
      end_time,
      break_duration_minutes,
      days_of_week,
      rotation_schedule,
      overtime_rules,
      is_active,
      created_by: req.user.id
    });
    
    // Log the creation
    await AuditLog.logAction({
      userId: req.user.id,
      action: 'CREATE',
      resourceType: 'shift_pattern',
      resourceId: shiftPattern.id,
      resourceName: shiftPattern.name,
      newValues: shiftPattern.toJSON(),
      metadata: {
        pattern_type,
        shift_duration_hours,
        is_active
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'medium'
    });
    
    // Fetch the created pattern with associations
    const createdPattern = await ShiftPattern.findByPk(shiftPattern.id, {
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name', 'email']
      }]
    });
    
    res.status(201).json({
      success: true,
      data: createdPattern,
      message: 'Shift pattern created successfully'
    });
    
  } catch (error) {
    console.error('Error creating shift pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shift pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update shift pattern
const updateShiftPattern = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      pattern_type,
      shift_duration_hours,
      start_time,
      end_time,
      break_duration_minutes,
      days_of_week,
      rotation_schedule,
      overtime_rules,
      is_active
    } = req.body;
    
    const shiftPattern = await ShiftPattern.findByPk(id);
    
    if (!shiftPattern) {
      return res.status(404).json({
        success: false,
        message: 'Shift pattern not found'
      });
    }
    
    // Check if user has permission to update
    const isCreator = shiftPattern.created_by === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator or administrators can update this shift pattern'
      });
    }
    
    // Check for duplicate names (excluding current pattern)
    if (name && name.trim() !== shiftPattern.name) {
      const existingPattern = await ShiftPattern.findOne({
        where: { 
          name: name.trim(),
          id: { [Op.ne]: id }
        }
      });
      
      if (existingPattern) {
        return res.status(400).json({
          success: false,
          message: 'A shift pattern with this name already exists'
        });
      }
    }
    
    // Store old values for audit log
    const oldValues = shiftPattern.toJSON();
    
    // Update fields
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (pattern_type !== undefined) updates.pattern_type = pattern_type;
    if (shift_duration_hours !== undefined) updates.shift_duration_hours = shift_duration_hours;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (break_duration_minutes !== undefined) updates.break_duration_minutes = break_duration_minutes;
    if (days_of_week !== undefined) updates.days_of_week = days_of_week;
    if (rotation_schedule !== undefined) updates.rotation_schedule = rotation_schedule;
    if (overtime_rules !== undefined) updates.overtime_rules = overtime_rules;
    if (is_active !== undefined) updates.is_active = is_active;
    
    await shiftPattern.update(updates);
    
    // Log the update
    await AuditLog.logAction({
      userId: req.user.id,
      action: 'UPDATE',
      resourceType: 'shift_pattern',
      resourceId: shiftPattern.id,
      resourceName: shiftPattern.name,
      oldValues,
      newValues: shiftPattern.toJSON(),
      metadata: {
        updatedFields: Object.keys(updates)
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'medium'
    });
    
    // Fetch updated pattern with associations
    const updatedPattern = await ShiftPattern.findByPk(id, {
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name', 'email']
      }]
    });
    
    res.json({
      success: true,
      data: updatedPattern,
      message: 'Shift pattern updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating shift pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shift pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete shift pattern
const deleteShiftPattern = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { confirmationText, reason } = req.body;
    
    const shiftPattern = await ShiftPattern.findByPk(id, {
      include: [{
        model: TeamShiftAssignment,
        as: 'teamAssignments',
        include: [{
          model: Team,
          as: 'team',
          attributes: ['id', 'name']
        }]
      }],
      transaction
    });
    
    if (!shiftPattern) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Shift pattern not found'
      });
    }
    
    // Check permissions
    const isCreator = shiftPattern.created_by === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    
    if (!isCreator && !isAdmin) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only the creator or administrators can delete this shift pattern'
      });
    }
    
    // Require confirmation
    if (confirmationText !== shiftPattern.name) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Confirmation text must match shift pattern name exactly'
      });
    }
    
    // Check if pattern is in use
    if (shiftPattern.teamAssignments && shiftPattern.teamAssignments.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete shift pattern that is assigned to teams',
        assignedTeams: shiftPattern.teamAssignments.map(ta => ta.team.name)
      });
    }
    
    // Store data for audit log
    const auditData = {
      userId: req.user.id,
      action: 'DELETE',
      resourceType: 'shift_pattern',
      resourceId: shiftPattern.id,
      resourceName: shiftPattern.name,
      oldValues: shiftPattern.toJSON(),
      metadata: {
        reason: reason || 'No reason provided',
        pattern_type: shiftPattern.pattern_type,
        was_active: shiftPattern.is_active
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'high'
    };
    
    // Delete the shift pattern
    await shiftPattern.destroy({ transaction });
    
    // Log the deletion
    await AuditLog.logAction(auditData);
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Shift pattern deleted successfully'
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting shift pattern:', error);
    
    // Log failed deletion
    try {
      await AuditLog.logAction({
        userId: req.user?.id,
        action: 'DELETE',
        resourceType: 'shift_pattern',
        resourceId: req.params.id,
        resourceName: 'Unknown Shift Pattern',
        metadata: {
          error: error.message,
          reason: req.body.reason || 'No reason provided'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high',
        status: 'failed',
        errorMessage: error.message
      });
    } catch (auditError) {
      console.error('Failed to log deletion error:', auditError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete shift pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Assign shift pattern to team
const assignShiftPatternToTeam = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { shiftPatternId, teamId } = req.params;
    const {
      effective_from,
      effective_until,
      priority = 1,
      custom_overrides,
      notes
    } = req.body;
    
    // Validate shift pattern exists
    const shiftPattern = await ShiftPattern.findByPk(shiftPatternId, { transaction });
    if (!shiftPattern) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Shift pattern not found'
      });
    }
    
    // Validate team exists and user has permission
    const team = await Team.findByPk(teamId, {
      include: [{
        model: TeamMember,
        as: 'members',
        where: { user_id: req.user.id }
      }],
      transaction
    });
    
    if (!team) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Team not found or you do not have access to it'
      });
    }
    
    // Check if user can manage team
    const userMembership = team.members[0];
    const canManage = userMembership.role === 'owner' || 
                     userMembership.role === 'admin' ||
                     req.user.role === 'admin' || 
                     req.user.role === 'super_admin';
    
    if (!canManage) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to assign shift patterns to this team'
      });
    }
    
    // Check for existing active assignment
    const existingAssignment = await TeamShiftAssignment.findOne({
      where: {
        team_id: teamId,
        shift_pattern_id: shiftPatternId,
        is_active: true
      },
      transaction
    });
    
    if (existingAssignment) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'This shift pattern is already assigned to the team'
      });
    }
    
    // Create the assignment
    const assignment = await TeamShiftAssignment.create({
      team_id: teamId,
      shift_pattern_id: shiftPatternId,
      effective_from: effective_from || new Date(),
      effective_until,
      priority,
      custom_overrides,
      assigned_by: req.user.id,
      notes
    }, { transaction });
    
    // Log the assignment
    await AuditLog.logAction({
      userId: req.user.id,
      action: 'CREATE',
      resourceType: 'team_shift_assignment',
      resourceId: assignment.id,
      resourceName: `${team.name} - ${shiftPattern.name}`,
      newValues: assignment.toJSON(),
      metadata: {
        team_name: team.name,
        shift_pattern_name: shiftPattern.name,
        effective_from,
        effective_until,
        priority
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'medium'
    });
    
    await transaction.commit();
    
    // Fetch the created assignment with associations
    const createdAssignment = await TeamShiftAssignment.findByPk(assignment.id, {
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'description']
        },
        {
          model: ShiftPattern,
          as: 'shiftPattern',
          attributes: ['id', 'name', 'pattern_type', 'shift_duration_hours']
        },
        {
          model: User,
          as: 'assignedBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: createdAssignment,
      message: 'Shift pattern assigned to team successfully'
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error assigning shift pattern to team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign shift pattern to team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove shift pattern assignment from team
const removeShiftPatternFromTeam = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { assignmentId } = req.params;
    const { reason } = req.body;
    
    const assignment = await TeamShiftAssignment.findByPk(assignmentId, {
      include: [
        {
          model: Team,
          as: 'team',
          include: [{
            model: TeamMember,
            as: 'members',
            where: { user_id: req.user.id }
          }]
        },
        {
          model: ShiftPattern,
          as: 'shiftPattern'
        }
      ],
      transaction
    });
    
    if (!assignment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Shift pattern assignment not found'
      });
    }
    
    // Check permissions
    const userMembership = assignment.team.members[0];
    const canManage = userMembership.role === 'owner' || 
                     userMembership.role === 'admin' ||
                     req.user.role === 'admin' || 
                     req.user.role === 'super_admin';
    
    if (!canManage) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to remove this assignment'
      });
    }
    
    // Store data for audit log
    const auditData = {
      userId: req.user.id,
      action: 'DELETE',
      resourceType: 'team_shift_assignment',
      resourceId: assignment.id,
      resourceName: `${assignment.team.name} - ${assignment.shiftPattern.name}`,
      oldValues: assignment.toJSON(),
      metadata: {
        reason: reason || 'No reason provided',
        team_name: assignment.team.name,
        shift_pattern_name: assignment.shiftPattern.name
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'medium'
    };
    
    // Delete the assignment
    await assignment.destroy({ transaction });
    
    // Log the removal
    await AuditLog.logAction(auditData);
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Shift pattern assignment removed successfully'
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error removing shift pattern assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove shift pattern assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get team shift assignments
const getTeamShiftAssignments = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { active_only = 'true' } = req.query;
    
    const whereClause = { team_id: teamId };
    if (active_only === 'true') {
      whereClause.is_active = true;
    }
    
    const assignments = await TeamShiftAssignment.findAll({
      where: whereClause,
      include: [
        {
          model: ShiftPattern,
          as: 'shiftPattern'
        },
        {
          model: User,
          as: 'assignedBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['priority', 'DESC'], ['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      data: assignments
    });
    
  } catch (error) {
    console.error('Error fetching team shift assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team shift assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getShiftPatterns,
  getShiftPatternById,
  createShiftPattern,
  updateShiftPattern,
  deleteShiftPattern,
  assignShiftPatternToTeam,
  removeShiftPatternFromTeam,
  getTeamShiftAssignments
};