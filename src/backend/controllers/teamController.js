const { Team, TeamMember, User, TeamShiftAssignment, AuditLog, sequelize } = require('../models/database');
const { Op } = require('sequelize');

// Get all teams for a user
const getUserTeams = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const teams = await Team.findAll({
      include: [
        {
          model: TeamMember,
          as: 'members',
          where: { user_id: userId },
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      teams: teams.map(team => ({
        ...team.toJSON(),
        memberCount: team.members?.length || 0,
        userRole: team.members?.[0]?.role || 'viewer'
      }))
    });
  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teams' });
  }
};

// Get team details
const getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of the team
    const membership = await TeamMember.findOne({
      where: { team_id: teamId, user_id: userId, status: 'active' }
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const team = await Team.findByPk(teamId, {
      include: [
        {
          model: TeamMember,
          as: 'members',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profile']
          }]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    res.json({
      success: true,
      team: {
        ...team.toJSON(),
        userRole: membership.role,
        userPermissions: membership.permissions
      }
    });
  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch team details' });
  }
};

// Create a new team
const createTeam = async (req, res) => {
  try {
    const { name, description, settings } = req.body;
    const userId = req.user.id;

    // Check if user has permission to create teams
    if (!req.user.permissions?.teams?.create && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to create teams' });
    }

    // Create the team
    const team = await Team.create({
      name,
      description,
      owner_id: userId,
      settings: settings || {}
    });

    // Add the creator as the owner
    await TeamMember.create({
      team_id: team.id,
      user_id: userId,
      role: 'owner',
      status: 'active',
      permissions: {
        assets: { view: true, create: true, edit: true, delete: true },
        events: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true, edit: true, delete: true },
        analytics: { view: true, export: true },
        team: { invite: true, remove: true, editSettings: true }
      },
      joined_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ success: false, message: 'Failed to create team' });
  }
};

// Update team
const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description, settings } = req.body;
    const userId = req.user.id;

    // Check if user has permission to edit the team
    const membership = await TeamMember.findOne({
      where: { 
        team_id: teamId, 
        user_id: userId, 
        status: 'active',
        role: { [Op.in]: ['owner', 'admin'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to edit team' });
    }

    const team = await Team.findByPk(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    await team.update({ name, description, settings });

    res.json({
      success: true,
      message: 'Team updated successfully',
      team
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ success: false, message: 'Failed to update team' });
  }
};

// Invite user to team
const inviteToTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, role = 'member' } = req.body;
    const userId = req.user.id;

    // Check if user has permission to invite
    const membership = await TeamMember.findOne({
      where: { 
        team_id: teamId, 
        user_id: userId, 
        status: 'active'
      }
    });

    if (!membership || !membership.permissions?.team?.invite) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to invite users' });
    }

    // Find the user to invite
    const invitedUser = await User.findOne({ where: { email } });
    if (!invitedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user is already a member
    const existingMembership = await TeamMember.findOne({
      where: { team_id: teamId, user_id: invitedUser.id }
    });

    if (existingMembership) {
      return res.status(400).json({ success: false, message: 'User is already a member of this team' });
    }

    // Create the invitation
    const teamMember = await TeamMember.create({
      team_id: teamId,
      user_id: invitedUser.id,
      role,
      status: 'pending',
      invited_by: userId,
      invited_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'User invited successfully',
      invitation: teamMember
    });
  } catch (error) {
    console.error('Error inviting user to team:', error);
    res.status(500).json({ success: false, message: 'Failed to invite user' });
  }
};

// Accept team invitation
const acceptInvitation = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const membership = await TeamMember.findOne({
      where: { 
        team_id: teamId, 
        user_id: userId, 
        status: 'pending'
      }
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    await membership.update({
      status: 'active',
      joined_at: new Date()
    });

    res.json({
      success: true,
      message: 'Invitation accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ success: false, message: 'Failed to accept invitation' });
  }
};

// Remove team member
const removeMember = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const userId = req.user.id;

    // Check if user has permission to remove members
    const membership = await TeamMember.findOne({
      where: { 
        team_id: teamId, 
        user_id: userId, 
        status: 'active'
      }
    });

    if (!membership || !membership.permissions?.team?.remove) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to remove members' });
    }

    // Find the member to remove
    const memberToRemove = await TeamMember.findOne({
      where: { team_id: teamId, user_id: memberId }
    });

    if (!memberToRemove) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Cannot remove the owner
    if (memberToRemove.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot remove team owner' });
    }

    await memberToRemove.destroy();

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
};

// Leave team
const leaveTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const membership = await TeamMember.findOne({
      where: { team_id: teamId, user_id: userId }
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    // Owner cannot leave the team
    if (membership.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Team owner cannot leave the team' });
    }

    await membership.destroy();

    res.json({
      success: true,
      message: 'Left team successfully'
    });
  } catch (error) {
    console.error('Error leaving team:', error);
    res.status(500).json({ success: false, message: 'Failed to leave team' });
  }
};

// Delete team with cascading deletion and audit logging
const deleteTeam = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const { confirmationText, reason } = req.body;
    
    // Get team details for audit logging
    const team = await Team.findByPk(teamId, {
      include: [
        {
          model: TeamMember,
          as: 'members',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        },
        {
          model: TeamShiftAssignment,
          as: 'shiftAssignments'
        }
      ],
      transaction
    });
    
    if (!team) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    
    // Check if user has permission to delete the team
    const userMembership = team.members?.find(m => m.user_id === userId);
    const isOwner = team.owner_id === userId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    
    if (!isOwner && !isAdmin) {
      await transaction.rollback();
      return res.status(403).json({ 
        success: false, 
        message: 'Only team owners or system administrators can delete teams' 
      });
    }
    
    // Require confirmation text for safety
    if (confirmationText !== team.name) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Confirmation text must match team name exactly' 
      });
    }
    
    // Prepare audit log data
    const auditData = {
      userId,
      action: 'DELETE',
      resourceType: 'team',
      resourceId: team.id,
      resourceName: team.name,
      oldValues: {
        name: team.name,
        description: team.description,
        owner_id: team.owner_id,
        memberCount: team.members?.length || 0,
        shiftAssignmentCount: team.shiftAssignments?.length || 0,
        settings: team.settings
      },
      metadata: {
        reason: reason || 'No reason provided',
        memberIds: team.members?.map(m => m.user_id) || [],
        memberNames: team.members?.map(m => m.user.name) || [],
        shiftAssignmentIds: team.shiftAssignments?.map(sa => sa.id) || [],
        deletedAt: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'high'
    };
    
    // Step 1: Delete team shift assignments
    if (team.shiftAssignments && team.shiftAssignments.length > 0) {
      await TeamShiftAssignment.destroy({
        where: { team_id: teamId },
        transaction
      });
      
      // Log shift assignment deletions
      for (const assignment of team.shiftAssignments) {
        await AuditLog.logAction({
          userId,
          action: 'DELETE',
          resourceType: 'team_shift_assignment',
          resourceId: assignment.id,
          resourceName: `Team ${team.name} - Shift Assignment`,
          oldValues: assignment.toJSON(),
          metadata: {
            reason: 'Cascading deletion due to team deletion',
            parentTeamId: teamId,
            parentTeamName: team.name
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });
      }
    }
    
    // Step 2: Delete team members
    if (team.members && team.members.length > 0) {
      await TeamMember.destroy({
        where: { team_id: teamId },
        transaction
      });
      
      // Log member removals
      for (const member of team.members) {
        await AuditLog.logAction({
          userId,
          action: 'DELETE',
          resourceType: 'team_member',
          resourceId: member.id,
          resourceName: `${member.user.name} from ${team.name}`,
          oldValues: {
            user_id: member.user_id,
            role: member.role,
            status: member.status,
            permissions: member.permissions
          },
          metadata: {
            reason: 'Cascading deletion due to team deletion',
            parentTeamId: teamId,
            parentTeamName: team.name,
            userName: member.user.name,
            userEmail: member.user.email
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });
      }
    }
    
    // Step 3: Delete the team itself
    await team.destroy({ transaction });
    
    // Step 4: Create main audit log entry
    await AuditLog.logAction(auditData);
    
    // Commit the transaction
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Team deleted successfully',
      deletedResources: {
        team: 1,
        members: team.members?.length || 0,
        shiftAssignments: team.shiftAssignments?.length || 0
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting team:', error);
    
    // Log the failed deletion attempt
    try {
      await AuditLog.logAction({
        userId: req.user?.id,
        action: 'DELETE',
        resourceType: 'team',
        resourceId: req.params.teamId,
        resourceName: 'Unknown Team',
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
      message: 'Failed to delete team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getUserTeams,
  getTeamById,
  createTeam,
  updateTeam,
  inviteToTeam,
  acceptInvitation,
  removeMember,
  leaveTeam,
  deleteTeam
};