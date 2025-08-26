import React, { useState, useEffect, useContext } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
  OutlinedInput,
  FormGroup,
  Grid,
  Divider,
  FormHelperText,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import api, { userAPI } from '../../services/api';

// Import contexts
import AlertContext from '../../context/AlertContext';
import AuthContext from '../../context/AuthContext';
import SocketContext from '../../context/SocketContext';

// Styled components
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const UserManagement = () => {
  const { success, error, warning, info } = useContext(AlertContext);
  const { user, isAuthenticated, hasPermission } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  // State variables
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [availableShiftTimes, setAvailableShiftTimes] = useState([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'user',
    isActive: true,
    password: '',
    confirmPassword: '',
    shiftReportPreferences: {
      enabled: false,
      shifts: [],
      emailFormat: 'pdf'
    }
  });

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user',
    receive_shift_reports: false
  });

  // Fetch available shift times from notification settings
  const fetchShiftTimes = async () => {
    if (!isAuthenticated || !user) {
      console.log('🔍 SHIFT_DEBUG: User not authenticated, skipping shift times fetch');
      return;
    }
    
    try {
      console.log('🔍 SHIFT_DEBUG: Starting fetchShiftTimes...');
      console.log('🔍 SHIFT_DEBUG: Current user:', user?.name);
      console.log('🔍 SHIFT_DEBUG: Is authenticated:', isAuthenticated);
      
      // Use the correct notifications settings endpoint
      const response = await api.get('/notifications/settings');
      console.log('🔍 SHIFT_DEBUG: Full API response:', JSON.stringify(response.data, null, 2));
      console.log('🔍 SHIFT_DEBUG: Response structure check:');
      console.log('  - response.data exists:', !!response.data);
      console.log('  - response.data.data exists:', !!response.data?.data);
      console.log('  - response.data.data.shiftSettings exists:', !!response.data?.data?.shiftSettings);
      console.log('  - response.data.data.shiftSettings.shiftTimes exists:', !!response.data?.data?.shiftSettings?.shiftTimes);
      
      // The /api/notifications/settings endpoint returns {success: true, data: settings}
      // So the shift times are at response.data.data.shiftSettings.shiftTimes
      const shiftTimes = response.data?.data?.shiftSettings?.shiftTimes;
      
      if (Array.isArray(shiftTimes) && shiftTimes.length > 0) {
        console.log('✅ SHIFT_DEBUG: Found shift times:', shiftTimes);
        console.log('✅ SHIFT_DEBUG: Setting available shift times to:', shiftTimes);
        setAvailableShiftTimes(shiftTimes);
      } else {
        console.warn('⚠️ SHIFT_DEBUG: No valid shift times found');
        console.warn('⚠️ SHIFT_DEBUG: Shift times value:', shiftTimes);
        console.warn('⚠️ SHIFT_DEBUG: Is array?', Array.isArray(shiftTimes));
        console.warn('⚠️ SHIFT_DEBUG: Length:', shiftTimes?.length);
        setAvailableShiftTimes([]);
      }
    } catch (err) {
      console.error('❌ SHIFT_DEBUG: Failed to fetch shift times:', err.message);
      console.error('❌ SHIFT_DEBUG: Error response:', err.response?.data);
      console.error('❌ SHIFT_DEBUG: Error status:', err.response?.status);
      if (err.response?.status === 401) {
        console.error('❌ SHIFT_DEBUG: Authentication failed - user may need to log in again');
      }
      setAvailableShiftTimes([]); // Ensure it's always an array
    }
  };

  // Format shift time for display
  const formatShiftTime = (time) => {
    if (time && time.length === 4) {
      return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
    }
    return time;
  };

  // Listen for settings updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleSettingsUpdate = (payload) => {
      console.log('🔄 Settings updated via socket:', payload);
      if (payload?.type === 'shiftSettings') {
        console.log('🔄 Shift settings updated, refreshing shift times...');
        fetchShiftTimes();
      }
    };

    socket.on('settings_updated', handleSettingsUpdate);

    return () => {
      socket.off('settings_updated', handleSettingsUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (hasPermission(['super_admin', 'admin', 'manager']) && isAuthenticated) {
      fetchUsers();
      fetchPendingInvitations();
      fetchShiftTimes();
    }
  }, [page, rowsPerPage, searchQuery, hasPermission, isAuthenticated]);

  // Debug log for availableShiftTimes changes
  useEffect(() => {
    console.log('🔍 availableShiftTimes updated:', availableShiftTimes);
  }, [availableShiftTimes]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching users with params:', {
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery
      });
      
      const response = await userAPI.getUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery
      });
      
      console.log('✅ Users API response:', response.data);
      
      // Backend returns data in response.data.data, not response.data.users
      const users = response.data.data || [];
      const total = response.data.pagination?.total || 0;
      
      console.log('✅ Setting users:', users.length, 'users');
      console.log('✅ Setting total:', total);
      
      setUsers(users);
      setTotalUsers(total);
    } catch (err) {
      console.error('❌ Failed to fetch users:', err);
      console.error('❌ Error response:', err.response?.data);
      error('Failed to fetch users');
      setUsers([]); // Ensure it's always an array
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      // Note: This should be updated to use a proper invitations API when available
      const response = await userAPI.getUsers(); // Placeholder
      setPendingInvitations(response.data.invitations || []);
    } catch (err) {
      console.error('Failed to fetch pending invitations:', err);
      setPendingInvitations([]); // Ensure it's always an array
    }
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setUserForm({
      name: '',
      email: '',
      role: 'user',
      isActive: true,
      password: '',
      confirmPassword: '',
      shiftReportPreferences: {
        enabled: false,
        shifts: [],
        emailFormat: 'pdf'
      }
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = async (user) => {
    // Fetch shift times if not already available
    if (availableShiftTimes.length === 0) {
      await fetchShiftTimes();
    }
    
    setDialogMode('edit');
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: '',
      confirmPassword: '',
      shiftReportPreferences: user.shiftReportPreferences || {
        enabled: false,
        shifts: [],
        emailFormat: 'pdf'
      }
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
  };

  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setUserForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setUserForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleShiftSelectionChange = (event) => {
    const value = event.target.value;
    setUserForm(prev => ({
      ...prev,
      shiftReportPreferences: {
        ...prev.shiftReportPreferences,
        shifts: typeof value === 'string' ? value.split(',') : value
      }
    }));
  };

  const addUser = async () => {
    try {
      if (userForm.password && userForm.password !== userForm.confirmPassword) {
        error('Passwords do not match');
        return;
      }

      await userAPI.createUser({
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        isActive: userForm.isActive,
        password: userForm.password,
        shiftReportPreferences: userForm.shiftReportPreferences
      });
      
      success('User added successfully');
      handleCloseDialog();
      fetchUsers();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to add user');
    }
  };

  const updateUser = async () => {
    try {
      if (userForm.password && userForm.password !== userForm.confirmPassword) {
        error('Passwords do not match');
        return;
      }

      const updateData = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        isActive: userForm.isActive,
        shiftReportPreferences: userForm.shiftReportPreferences
      };

      if (userForm.password) {
        updateData.password = userForm.password;
      }

      await userAPI.updateUser(selectedUser.id, updateData);
      
      success('User updated successfully');
      handleCloseDialog();
      fetchUsers();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleOpenDeleteDialog = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const deleteUser = async () => {
    try {
      await userAPI.deleteUser(selectedUser.id);
      success('User deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleOpenInviteDialog = () => {
    setInviteForm({
      email: '',
      role: 'user',
      receive_shift_reports: false
    });
    setInviteDialogOpen(true);
  };

  const handleInviteFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    setInviteForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSendInvitation = async () => {
    try {
      // Note: This should be updated to use a proper invitations API when available
      await userAPI.createUser(inviteForm); // Placeholder
      success('Invitation sent successfully');
      setInviteDialogOpen(false);
      fetchPendingInvitations();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      // Note: This should be updated to use a proper invitations API when available
      await userAPI.deleteUser(invitationId); // Placeholder
      success('Invitation cancelled successfully');
      fetchPendingInvitations();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      // Note: This should be updated to use a proper invitations API when available
      await userAPI.updateUser(invitationId, {}); // Placeholder
      success('Invitation resent successfully');
      fetchPendingInvitations();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to resend invitation');
    }
  };

  // Check if user is not authenticated at all
  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <LockIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
        <Typography variant="h5" color="text.primary" gutterBottom>
          Authentication Required
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Please log in to access the User Management page.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.href = '/login'}
          sx={{ mr: 2 }}
        >
          Go to Login
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Use admin credentials: admin@example.com / admin123
        </Typography>
      </Box>
    );
  }

  // Check if user doesn't have required permissions
  if (!hasPermission(['super_admin', 'admin', 'manager'])) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" color="text.secondary">
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          You don't have permission to access user management.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Current role: {user?.role || 'Unknown'} | Required: Super Admin, Admin or Manager
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Debug Panel - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Debug Info:</strong> User: {user?.name || 'None'} | Role: {user?.role || 'None'} | 
            Authenticated: {isAuthenticated ? 'Yes' : 'No'} | 
            Token: {localStorage.getItem('token') ? 'Present' : 'Missing'}
          </Typography>
        </Alert>
      )}
      
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      {/* Search and Add User */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Add User
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenInviteDialog}
          >
            Invite User
          </Button>
        </Box>
      </Box>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Shift Reports</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No users found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <StyledTableRow key={user.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {user.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      size="small" 
                      variant="outlined"
                      color={
                        user.role === 'admin' ? 'error' :
                        user.role === 'manager' ? 'warning' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.isActive ? 'Active' : 'Inactive'} 
                      size="small" 
                      color={user.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {user.shiftReportPreferences?.enabled ? (
                      <Chip 
                        label={`${user.shiftReportPreferences.shifts?.length || 0} shifts`}
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Chip 
                        label="Disabled"
                        size="small" 
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEditDialog(user)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDeleteDialog(user)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </StyledTableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalUsers}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New User' : 'Edit User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={userForm.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={userForm.email}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Role"
                name="role"
                value={userForm.role}
                onChange={handleFormChange}
                required
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                {user?.role === 'super_admin' && (
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userForm.isActive}
                    onChange={handleFormChange}
                    name="isActive"
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={userForm.password}
                onChange={handleFormChange}
                required={dialogMode === 'add'}
                helperText={dialogMode === 'edit' ? 'Leave blank to keep current password' : ''}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={userForm.confirmPassword}
                onChange={handleFormChange}
                required={dialogMode === 'add'}
              />
            </Grid>

            {/* Shift Report Preferences */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Shift Report Preferences
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userForm.shiftReportPreferences.enabled}
                    onChange={handleFormChange}
                    name="shiftReportPreferences.enabled"
                  />
                }
                label="Enable Shift Report Emails"
              />
              <FormHelperText>
                When enabled, this user will receive automated shift reports via email
              </FormHelperText>
            </Grid>

            {userForm.shiftReportPreferences.enabled && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Shifts to Receive Reports For</InputLabel>
                    <Select
                      multiple
                      value={userForm.shiftReportPreferences.shifts || []}
                      onChange={handleShiftSelectionChange}
                      input={<OutlinedInput label="Shifts to Receive Reports For" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={formatShiftTime(value)} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {availableShiftTimes.map((time) => (
                        <MenuItem key={time} value={time}>
                          <Checkbox checked={userForm.shiftReportPreferences.shifts?.indexOf(time) > -1} />
                          <ListItemText primary={formatShiftTime(time)} />
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Select which shift end times this user should receive reports for
                    </FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="Email Format"
                    name="shiftReportPreferences.emailFormat"
                    value={userForm.shiftReportPreferences.emailFormat}
                    onChange={handleFormChange}
                  >
                    <MenuItem value="pdf">PDF Attachment</MenuItem>
                    <MenuItem value="html">HTML Email</MenuItem>
                  </TextField>
                  <FormHelperText>
                    PDF format is recommended for archival purposes
                  </FormHelperText>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Note:</strong> Shift reports are automatically sent when each shift ends based on the times configured in Notification Settings. 
                      This user will receive reports for the selected shifts only if they have a valid email address.
                    </Typography>
                  </Alert>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={dialogMode === 'add' ? addUser : updateUser}
            variant="contained"
          >
            {dialogMode === 'add' ? 'Add User' : 'Update User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Pending Invitations
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Invited By</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Chip label={invitation.role} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{invitation.invitedBy}</TableCell>
                    <TableCell>
                      {format(new Date(invitation.createdAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => handleResendInvitation(invitation.id)}
                        sx={{ mr: 1 }}
                      >
                        Resend
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user "{selectedUser?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={deleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={inviteForm.email}
                onChange={handleInviteFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Role"
                name="role"
                value={inviteForm.role}
                onChange={handleInviteFormChange}
                required
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={inviteForm.receive_shift_reports}
                    onChange={handleInviteFormChange}
                    name="receive_shift_reports"
                  />
                }
                label="Enable Shift Report Emails"
              />
              <FormHelperText>
                When enabled, this user will receive automated shift reports via email
              </FormHelperText>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSendInvitation}
            variant="contained"
          >
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;