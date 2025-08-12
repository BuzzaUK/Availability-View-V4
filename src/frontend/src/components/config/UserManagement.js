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
import axios from 'axios';

// Context
import AlertContext from '../../context/AlertContext';
import AuthContext from '../../context/AuthContext';

// Styled components
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const UserManagement = () => {
  const { error, success } = useContext(AlertContext);
  const { user } = useContext(AuthContext);
  
  // Check if user has permission to access user management
  const hasPermission = user && (user.role === 'admin' || user.role === 'manager');
  
  // State for users data
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for user dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'operator',
    isActive: true,
    password: '',
    confirmPassword: '',
    // Add shift report preferences
    shiftReportPreferences: {
      enabled: false,
      shifts: [], // Array of shift times user wants to receive reports for
      emailFormat: 'pdf'
    }
  });

  // Available shift times (should match the ones configured in NotificationSettings)
  const [availableShiftTimes, setAvailableShiftTimes] = useState(['0600', '1400', '2200']);

  // Invitation State
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer',
    receive_shift_reports: false
  });

  const fetchPendingInvitations = async () => {
    try {
      setInvitesLoading(true);
      const res = await axios.get('/api/invitations');
      setPendingInvitations(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleOpenInviteDialog = () => {
    setInviteForm({ email: '', role: 'viewer', receive_shift_reports: false });
    setInviteDialogOpen(true);
  };

  const handleSendInvitation = async () => {
    try {
      if (!inviteForm.email) {
        error('Please enter an email');
        return;
      }
      await axios.post('/api/invitations/send', inviteForm);
      success('Invitation sent');
      setInviteDialogOpen(false);
      fetchPendingInvitations();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleCancelInvitation = async (id) => {
    try {
      await axios.delete(`/api/invitations/${id}`);
      success('Invitation cancelled');
      fetchPendingInvitations();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to cancel invitation');
    }
  };
  
  // State for delete confirmation dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // Role options
  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Manager' },
    { value: 'operator', label: 'Operator' },
    { value: 'viewer', label: 'Viewer' },
  ];

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: page + 1, // API uses 1-based indexing
        limit: rowsPerPage,
        ...(searchQuery && { search: searchQuery }),
      };
      
      const response = await axios.get('/api/users', { params });
      
      setUsers(response.data.data || []); // Changed from response.data.users to response.data.data
      setTotalUsers(response.data.pagination?.total || 0); // Changed from response.data.total to response.data.pagination.total
    } catch (err) {
      error('Failed to fetch users: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Add user
  const addUser = async () => {
    try {
      if (userForm.password !== userForm.confirmPassword) {
        error('Passwords do not match');
        return;
      }
      
      await axios.post('/api/users', {
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
      error('Failed to add user: ' + (err.response?.data?.message || err.message));
    }
  };

  // Update user
  const updateUser = async () => {
    try {
      if (userForm.password && userForm.password !== userForm.confirmPassword) {
        error('Passwords do not match');
        return;
      }
      
      const userData = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        isActive: userForm.isActive,
        shiftReportPreferences: userForm.shiftReportPreferences
      };
      
      // Only include password if it's provided
      if (userForm.password) {
        userData.password = userForm.password;
      }
      
      await axios.put(`/api/users/${selectedUser.id}`, userData);
      
      success('User updated successfully');
      handleCloseDialog();
      fetchUsers();
    } catch (err) {
      error('Failed to update user: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete user
  const deleteUser = async () => {
    try {
      await axios.delete(`/api/users/${selectedUser.id}`);
      
      success('User deleted successfully');
      setOpenDeleteDialog(false);
      fetchUsers();
    } catch (err) {
      error('Failed to delete user: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle search
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  // Handle open add dialog
  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setUserForm({
      name: '',
      email: '',
      role: 'operator',
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

  // Handle open edit dialog
  const handleOpenEditDialog = (user) => {
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

  // Handle close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
  };

  // Handle open delete dialog
  const handleOpenDeleteDialog = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  // Handle form change
  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    
    if (name.startsWith('shiftReportPreferences.')) {
      const field = name.split('.')[1];
      setUserForm(prev => ({
        ...prev,
        shiftReportPreferences: {
          ...prev.shiftReportPreferences,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setUserForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Handle shift selection change
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

  // Fetch available shift times from notification settings
  const fetchShiftTimes = async () => {
    try {
      const response = await axios.get('/api/notifications/settings');
      if (response.data && response.data.shiftSettings && response.data.shiftSettings.shiftTimes) {
        setAvailableShiftTimes(response.data.shiftSettings.shiftTimes);
      }
    } catch (err) {
      console.error('Failed to fetch shift times:', err);
    }
  };

  // Format shift time for display
  const formatShiftTime = (time) => {
    if (time.length === 4) {
      return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
    }
    return time;
  };

  useEffect(() => {
    if (hasPermission) {
      fetchUsers();
      fetchShiftTimes();
      fetchPendingInvitations();
    }
  }, [page, rowsPerPage, searchQuery, hasPermission]);

  // Show unauthorized message if user doesn't have permission
  if (!hasPermission) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary">
          Access Restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          You need administrator or manager privileges to access user management.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Current role: <Chip label={user?.role || 'Unknown'} size="small" />
        </Typography>
        <Alert severity="info" sx={{ mt: 3, maxWidth: 500, mx: 'auto' }}>
          Contact your system administrator to request access to user management features.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
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
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Add User
          </Button>
          <Button
            variant="outlined"
            sx={{ ml: 2 }}
            onClick={handleOpenInviteDialog}
          >
            Invite User
          </Button>
        </Box>
      </Box>

      {/* Users Table */}
      <Paper>
        <TableContainer>
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
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <StyledTableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={user.role === 'admin' ? 'error' : user.role === 'manager' ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.shiftReportPreferences?.enabled ? (
                        <Chip
                          label={`${user.shiftReportPreferences.shifts?.length || 0} shifts`}
                          color="info"
                          size="small"
                        />
                      ) : (
                        <Chip label="Disabled" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditDialog(user)}
                        color="primary"
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
      </Paper>

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
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
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
                label="Active User"
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
                required={dialogMode === 'add' || userForm.password !== ''}
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
                    <InputLabel>Shifts to Receive Reports</InputLabel>
                    <Select
                      multiple
                      value={userForm.shiftReportPreferences.shifts}
                      onChange={handleShiftSelectionChange}
                      input={<OutlinedInput label="Shifts to Receive Reports" />}
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
                          <Checkbox checked={userForm.shiftReportPreferences.shifts.indexOf(time) > -1} />
                          <ListItemText primary={`${formatShiftTime(time)} Shift`} />
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

      {/* Pending Invitations Section */}
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
                      <Chip label={invitation.role} size="small" />
                    </TableCell>
                    <TableCell>{invitation.inviter?.name || 'System'}</TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
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
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user "{selectedUser?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
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
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
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
                onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                required
              >
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={inviteForm.receive_shift_reports}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, receive_shift_reports: e.target.checked }))}
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