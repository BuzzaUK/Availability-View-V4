import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Grid,
  Paper,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Tooltip,
  Badge,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import AuthContext from '../context/AuthContext';
import { teamAPI, userAPI, shiftPatternAPI } from '../services/api';

const TeamManagement = () => {
  const { user } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [teamSettingsOpen, setTeamSettingsOpen] = useState(false);
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [shiftPatternOpen, setShiftPatternOpen] = useState(false);
  
  // Shift pattern states
  const [shiftPatterns, setShiftPatterns] = useState([]);
  const [teamShiftAssignments, setTeamShiftAssignments] = useState([]);
  const [shiftPatternLoading, setShiftPatternLoading] = useState(false);
  
  // Form states
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    maxMembers: 50
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member'
  });
  const [teamSettings, setTeamSettings] = useState({
    allowMemberInvites: true,
    enableDataSharing: true,
    enableNotifications: true
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [selectedShiftPattern, setSelectedShiftPattern] = useState('');
  const [shiftAssignmentForm, setShiftAssignmentForm] = useState({
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: '',
    priority: 1,
    notes: ''
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  // Fetch shift patterns when dialog opens
  useEffect(() => {
    if (shiftPatternOpen) {
      fetchShiftPatterns();
    }
  }, [shiftPatternOpen]);

  // Fetch team shift assignments when team is selected
  useEffect(() => {
    if (selectedTeam?.id) {
      fetchTeamShiftAssignments(selectedTeam.id);
    }
  }, [selectedTeam?.id]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await teamAPI.getTeams();
      setTeams(response.data.teams || []);
      if (response.data.teams?.length > 0 && !selectedTeam) {
        setSelectedTeam(response.data.teams[0]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamDetails = async (teamId) => {
    try {
      const response = await teamAPI.getTeam(teamId);
      setSelectedTeam(response.data.team);
    } catch (error) {
      console.error('Error fetching team details:', error);
      setError('Failed to load team details');
    }
  };

  const handleCreateTeam = async () => {
    try {
      const response = await teamAPI.createTeam(teamForm);
      setTeams([...teams, response.data.team]);
      setCreateTeamOpen(false);
      setTeamForm({ name: '', description: '', maxMembers: 50 });
      setSuccess('Team created successfully');
    } catch (error) {
      console.error('Error creating team:', error);
      setError(error.response?.data?.message || 'Failed to create team');
    }
  };

  const handleUpdateTeam = async () => {
    try {
      const response = await teamAPI.updateTeam(selectedTeam.id, teamForm);
      setSelectedTeam(response.data.team);
      setTeams(teams.map(team => 
        team.id === selectedTeam.id ? response.data.team : team
      ));
      setEditTeamOpen(false);
      setSuccess('Team updated successfully');
    } catch (error) {
      console.error('Error updating team:', error);
      setError(error.response?.data?.message || 'Failed to update team');
    }
  };

  const handleInviteMember = async () => {
    try {
      await teamAPI.inviteToTeam(selectedTeam.id, inviteForm);
      setInviteMemberOpen(false);
      setInviteForm({ email: '', role: 'member' });
      fetchTeamDetails(selectedTeam.id);
      setSuccess('Invitation sent successfully');
    } catch (error) {
      console.error('Error inviting member:', error);
      setError(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await teamAPI.removeTeamMember(selectedTeam.id, memberId);
      fetchTeamDetails(selectedTeam.id);
      setSuccess('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      await teamAPI.updateTeamMember(selectedTeam.id, memberId, { role: newRole });
      fetchTeamDetails(selectedTeam.id);
      setSuccess('Member role updated successfully');
    } catch (error) {
      console.error('Error updating member role:', error);
      setError(error.response?.data?.message || 'Failed to update member role');
    }
  };

  const handleUpdateTeamSettings = async () => {
    try {
      const response = await teamAPI.updateTeam(selectedTeam.id, {
        settings: teamSettings
      });
      setSelectedTeam(response.data.team);
      setTeamSettingsOpen(false);
      setSuccess('Team settings updated successfully');
    } catch (error) {
      console.error('Error updating team settings:', error);
      setError(error.response?.data?.message || 'Failed to update team settings');
    }
  };

  const handleDeleteTeam = async () => {
    if (deleteConfirmation !== selectedTeam.name) {
      setError('Team name confirmation does not match');
      return;
    }

    try {
      await teamAPI.deleteTeam(selectedTeam.id, {
        confirmation: deleteConfirmation
      });
      setTeams(teams.filter(team => team.id !== selectedTeam.id));
      setSelectedTeam(null);
      setDeleteTeamOpen(false);
      setDeleteConfirmation('');
      setSuccess('Team deleted successfully');
    } catch (error) {
      console.error('Error deleting team:', error);
      setError(error.response?.data?.message || 'Failed to delete team');
    }
  };

  const fetchShiftPatterns = async () => {
    try {
      setShiftPatternLoading(true);
      const response = await shiftPatternAPI.getShiftPatterns();
      setShiftPatterns(response.data.patterns || []);
    } catch (error) {
      console.error('Error fetching shift patterns:', error);
      setError('Failed to load shift patterns');
    } finally {
      setShiftPatternLoading(false);
    }
  };

  const fetchTeamShiftAssignments = async (teamId) => {
    try {
      const response = await shiftPatternAPI.getTeamAssignments(teamId);
      setTeamShiftAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Error fetching team shift assignments:', error);
      setError('Failed to load shift assignments');
    }
  };

  const handleAssignShiftPattern = async () => {
    if (!selectedShiftPattern) {
      setError('Please select a shift pattern');
      return;
    }

    try {
      await shiftPatternAPI.assignToTeam(selectedShiftPattern, selectedTeam.id, shiftAssignmentForm);
      setShiftPatternOpen(false);
      setSelectedShiftPattern('');
      setShiftAssignmentForm({
        effective_from: new Date().toISOString().split('T')[0],
        effective_until: '',
        priority: 1,
        notes: ''
      });
      fetchTeamShiftAssignments(selectedTeam.id);
      setSuccess('Shift pattern assigned successfully');
    } catch (error) {
      console.error('Error assigning shift pattern:', error);
      setError(error.response?.data?.message || 'Failed to assign shift pattern');
    }
  };

  const handleRemoveShiftAssignment = async (patternId) => {
    try {
      await shiftPatternAPI.removeFromTeam(patternId, selectedTeam.id);
      fetchTeamShiftAssignments(selectedTeam.id);
      setSuccess('Shift pattern assignment removed successfully');
    } catch (error) {
      console.error('Error removing shift assignment:', error);
      setError(error.response?.data?.message || 'Failed to remove shift assignment');
    }
  };

  const openShiftPatternDialog = () => {
    fetchShiftPatterns();
    fetchTeamShiftAssignments(selectedTeam.id);
    setShiftPatternOpen(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'error';
      case 'admin': return 'warning';
      case 'member': return 'primary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const canManageTeam = (team) => {
    if (!team || !user) return false;
    const userMembership = team.members?.find(m => m.user_id === user.id);
    return team.owner_id === user.id || 
           userMembership?.role === 'admin' || 
           userMembership?.role === 'manager' ||
           user?.role === 'admin';
  };

  const canDeleteTeam = (team) => {
    if (!team) return false;
    // Only team owners and admins can delete teams
    return team.owner_id === user?.id || user?.role === 'admin';
  };

  const canInviteMembers = (team) => {
    if (!team || !user) return false;
    const userMembership = team.members?.find(m => m.user_id === user.id);
    return userMembership && ['owner', 'admin', 'member'].includes(userMembership.role) && 
           team.settings?.allowMemberInvites;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading teams...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Team Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateTeamOpen(true)}
        >
          Create Team
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Teams List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom>
              Your Teams ({teams.length})
            </Typography>
            <List>
              {teams.map((team) => (
                <ListItem
                  key={team.id}
                  button
                  selected={selectedTeam?.id === team.id}
                  onClick={() => {
                    setSelectedTeam(team);
                    fetchTeamDetails(team.id);
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <GroupIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={team.name}
                    secondary={
                      <>
                        <span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>
                          {team.members?.length || 0} members
                        </span>
                        <br />
                        <Chip
                          size="small"
                          label={team.members?.find(m => m.user_id === user?.id)?.role || 'member'}
                          color={getRoleColor(team.members?.find(m => m.user_id === user?.id)?.role)}
                        />
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Team Details */}
        <Grid item xs={12} md={8}>
          {selectedTeam && selectedTeam.id ? (
            <Paper sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {selectedTeam?.name || 'Loading...'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedTeam?.description || 'No description'}
                  </Typography>
                </Box>
                <Box>
                  {canManageTeam(selectedTeam) && (
                    <>
                      <Tooltip title="Shift Patterns">
                        <IconButton
                          onClick={openShiftPatternDialog}
                        >
                          <ScheduleIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Team Settings">
                        <IconButton
                          onClick={() => {
                            setTeamSettings({
                              allowMemberInvites: selectedTeam?.settings?.allowMemberInvites ?? true,
                              enableDataSharing: selectedTeam?.settings?.enableDataSharing ?? true,
                              enableNotifications: selectedTeam?.settings?.enableNotifications ?? true
                            });
                            setTeamSettingsOpen(true);
                          }}
                        >
                          <SettingsIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Team">
                        <IconButton
                          onClick={() => {
                            setTeamForm({
                              name: selectedTeam?.name || '',
                      description: selectedTeam?.description || '',
                      maxMembers: selectedTeam?.maxMembers || 50
                            });
                            setEditTeamOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {canDeleteTeam(selectedTeam) && (
                        <Tooltip title="Delete Team">
                          <IconButton
                            color="error"
                            onClick={() => setDeleteTeamOpen(true)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  )}
                  {canInviteMembers(selectedTeam) && (
                    <Button
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => setInviteMemberOpen(true)}
                      sx={{ ml: 1 }}
                    >
                      Invite Member
                    </Button>
                  )}
                </Box>
              </Box>

              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Members" />
                <Tab label="Shift Patterns" />
                <Tab label="Permissions" />
                <Tab label="Activity" />
              </Tabs>

              {/* Members Tab */}
              {tabValue === 0 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Team Members ({selectedTeam.members?.length || 0})
                  </Typography>
                  <List>
                    {selectedTeam.members?.map((member, index) => (
                      <ListItem key={member?.id || `member-${index}`}>
                        <ListItemAvatar>
                          <Avatar src={member.user?.profile?.avatar}>
                            {member.user?.name?.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={member.user?.name}
                          secondary={
                            <>
                              <span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>
                                {member.user?.email}
                              </span>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <Chip
                                  size="small"
                                  label={member.role}
                                  color={getRoleColor(member.role)}
                                />
                                <Chip
                                  size="small"
                                  label={member.status}
                                  color={getStatusColor(member.status)}
                                />
                              </div>
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          {canManageTeam(selectedTeam) && member.user_id !== user?.id && (
                            <Box>
                              <FormControl size="small" sx={{ minWidth: 100, mr: 1 }}>
                                <Select
                                  value={member.role}
                                  onChange={(e) => handleUpdateMemberRole(member.user_id, e.target.value)}
                                >
                                  <MenuItem value="viewer">Viewer</MenuItem>
                                  <MenuItem value="member">Member</MenuItem>
                                  <MenuItem value="admin">Admin</MenuItem>
                                  {member.role === 'owner' && (
                                    <MenuItem value="owner">Owner</MenuItem>
                                  )}
                                </Select>
                              </FormControl>
                              <IconButton
                                color="error"
                                onClick={() => handleRemoveMember(member.user_id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Shift Patterns Tab */}
              {tabValue === 1 && (
                <Box mt={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Shift Pattern Assignments
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AssignmentIcon />}
                      onClick={openShiftPatternDialog}
                      size="small"
                    >
                      Assign Pattern
                    </Button>
                  </Box>
                  {teamShiftAssignments.length > 0 ? (
                    <List>
                      {teamShiftAssignments.map((assignment) => (
                        <ListItem key={assignment.id}>
                          <ListItemAvatar>
                            <Avatar>
                              <ScheduleIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={assignment.ShiftPattern?.name || 'Unknown Pattern'}
                            secondary={
                              <>
                                <Typography variant="body2" color="textSecondary">
                                  {assignment.ShiftPattern?.description}
                                </Typography>
                                <Box display="flex" gap={1} mt={1}>
                                  <Chip
                                    size="small"
                                    label={`Priority: ${assignment.priority}`}
                                    color="primary"
                                  />
                                  <Chip
                                    size="small"
                                    label={assignment.is_active ? 'Active' : 'Inactive'}
                                    color={assignment.is_active ? 'success' : 'default'}
                                  />
                                  {assignment.effective_from && (
                                    <Chip
                                      size="small"
                                      label={`From: ${new Date(assignment.effective_from).toLocaleDateString()}`}
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              </>
                            }
                          />
                          <ListItemSecondaryAction>
                            {canManageTeam(selectedTeam) && (
                              <IconButton
                                color="error"
                                onClick={() => handleRemoveShiftAssignment(assignment.shift_pattern_id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                      <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="textSecondary">
                        No shift patterns assigned to this team
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Click "Assign Pattern" to add shift schedules
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}

              {/* Permissions Tab */}
              {tabValue === 2 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Team Permissions
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Team permissions are inherited by all members and can be overridden at the individual level.
                  </Alert>
                  {/* Add permission management UI here */}
                  <Typography variant="body2" color="textSecondary">
                    Permission management interface coming soon...
                  </Typography>
                </Box>
              )}

              {/* Activity Tab */}
              {tabValue === 3 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Recent Activity
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Activity feed coming soon...
                  </Typography>
                </Box>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                Select a team to view details
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Create Team Dialog */}
      <Dialog open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Team</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Team Name"
            fullWidth
            variant="outlined"
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={teamForm.description}
            onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Maximum Members"
            type="number"
            fullWidth
            variant="outlined"
            value={teamForm.maxMembers}
            onChange={(e) => setTeamForm({ ...teamForm, maxMembers: parseInt(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTeam} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={editTeamOpen} onClose={() => setEditTeamOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Team</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Team Name"
            fullWidth
            variant="outlined"
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={teamForm.description}
            onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Maximum Members"
            type="number"
            fullWidth
            variant="outlined"
            value={teamForm.maxMembers}
            onChange={(e) => setTeamForm({ ...teamForm, maxMembers: parseInt(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTeamOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateTeam} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteMemberOpen} onClose={() => setInviteMemberOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>Role</InputLabel>
            <Select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              label="Role"
            >
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteMemberOpen(false)}>Cancel</Button>
          <Button onClick={handleInviteMember} variant="contained">Send Invitation</Button>
        </DialogActions>
      </Dialog>

      {/* Team Settings Dialog */}
      <Dialog open={teamSettingsOpen} onClose={() => setTeamSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Team Settings</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={teamSettings.allowMemberInvites}
                onChange={(e) => setTeamSettings({ ...teamSettings, allowMemberInvites: e.target.checked })}
              />
            }
            label="Allow members to invite others"
            sx={{ mb: 2, display: 'block' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={teamSettings.enableDataSharing}
                onChange={(e) => setTeamSettings({ ...teamSettings, enableDataSharing: e.target.checked })}
              />
            }
            label="Enable data sharing within team"
            sx={{ mb: 2, display: 'block' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={teamSettings.enableNotifications}
                onChange={(e) => setTeamSettings({ ...teamSettings, enableNotifications: e.target.checked })}
              />
            }
            label="Enable team notifications"
            sx={{ display: 'block' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamSettingsOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateTeamSettings} variant="contained">Save Settings</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Team Dialog */}
      <Dialog open={deleteTeamOpen} onClose={() => setDeleteTeamOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="error" />
            Delete Team
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone. All team data, members, and shift assignments will be permanently deleted.
          </Alert>
          <Typography variant="body1" gutterBottom>
            To confirm deletion, please type the team name: <strong>{selectedTeam?.name}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Team Name Confirmation"
            fullWidth
            variant="outlined"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            error={deleteConfirmation && deleteConfirmation !== selectedTeam?.name}
            helperText={deleteConfirmation && deleteConfirmation !== selectedTeam?.name ? 'Team name does not match' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteTeamOpen(false);
            setDeleteConfirmation('');
          }}>Cancel</Button>
          <Button 
            onClick={handleDeleteTeam} 
            variant="contained" 
            color="error"
            disabled={deleteConfirmation !== selectedTeam?.name}
          >
            Delete Team
          </Button>
        </DialogActions>
      </Dialog>

      {/* Shift Pattern Assignment Dialog */}
      <Dialog open={shiftPatternOpen} onClose={() => setShiftPatternOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Assign Shift Pattern</DialogTitle>
        <DialogContent>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Select Shift Pattern</InputLabel>
            <Select
              value={selectedShiftPattern}
              onChange={(e) => setSelectedShiftPattern(e.target.value)}
              label="Select Shift Pattern"
              disabled={shiftPatternLoading}
            >
              {shiftPatterns.map((pattern) => (
                <MenuItem key={pattern.id} value={pattern.id}>
                  {pattern.name} - {pattern.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Effective From"
                type="date"
                fullWidth
                variant="outlined"
                value={shiftAssignmentForm.effective_from}
                onChange={(e) => setShiftAssignmentForm({ ...shiftAssignmentForm, effective_from: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Effective Until (Optional)"
                type="date"
                fullWidth
                variant="outlined"
                value={shiftAssignmentForm.effective_until}
                onChange={(e) => setShiftAssignmentForm({ ...shiftAssignmentForm, effective_until: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Priority"
                type="number"
                fullWidth
                variant="outlined"
                value={shiftAssignmentForm.priority}
                onChange={(e) => setShiftAssignmentForm({ ...shiftAssignmentForm, priority: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes (Optional)"
                fullWidth
                multiline
                rows={2}
                variant="outlined"
                value={shiftAssignmentForm.notes}
                onChange={(e) => setShiftAssignmentForm({ ...shiftAssignmentForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShiftPatternOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignShiftPattern} variant="contained">Assign Pattern</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeamManagement;