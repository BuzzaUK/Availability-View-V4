import React, { useState, useEffect, useContext } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { format } from 'date-fns';
import axios from 'axios';

// Context
import AlertContext from '../../context/AlertContext';

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
  });
  
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
      
      setUsers(response.data.users || []);
      setTotalUsers(response.data.total || 0);
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
      };
      
      // Only include password if it's provided
      if (userForm.password) {
        userData.password = userForm.password;
      }
      
      await axios.put(`/api/users/${selectedUser._id}`, userData);
      
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
      await axios.delete(`/api/users/${selectedUser._id}`);
      
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
  };

  // Apply search
  const applySearch = () => {
    setPage(0); // Reset to first page when searching
    fetchUsers();
  };

  // Handle key press in search field
  const handleSearchKeyPress = (event) => {
    if (event.key === 'Enter') {
      applySearch();
    }
  };

  // Open add user dialog
  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setUserForm({
      name: '',
      email: '',
      role: 'operator',
      isActive: true,
      password: '',
      confirmPassword: '',
    });
    setOpenDialog(true);
  };

  // Open edit user dialog
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
    });
    setOpenDialog(true);
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  // Close user dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle form input change
  const handleFormChange = (event) => {
    const { name, value, checked } = event.target;
    setUserForm(prev => ({
      ...prev,
      [name]: event.target.type === 'checkbox' ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmitForm = () => {
    if (dialogMode === 'add') {
      addUser();
    } else {
      updateUser();
    }
  };

  // Fetch users when component mounts or when page, rowsPerPage changes
  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage]);

  // Render loading state
  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="div">
          User Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Add User
        </Button>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearch}
          onKeyPress={handleSearchKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button onClick={applySearch} size="small">
                  Search
                </Button>
              </InputAdornment>
            ),
          }}
          variant="outlined"
          size="small"
        />
      </Box>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="users table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <StyledTableRow key={user._id}>
                  <TableCell component="th" scope="row">
                    {user.name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role.charAt(0).toUpperCase() + user.role.slice(1)} 
                      color={
                        user.role === 'admin' ? 'primary' :
                        user.role === 'manager' ? 'secondary' :
                        user.role === 'operator' ? 'info' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.isActive ? 'Active' : 'Inactive'} 
                      color={user.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell>
                    {user.lastLogin 
                      ? format(new Date(user.lastLogin), 'yyyy-MM-dd HH:mm')
                      : 'Never'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => handleOpenEditDialog(user)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleOpenDeleteDialog(user)}
                    >
                      <DeleteIcon fontSize="small" />
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New User' : 'Edit User'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={userForm.name}
            onChange={handleFormChange}
            required
          />
          <TextField
            margin="dense"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={userForm.email}
            onChange={handleFormChange}
            required
          />
          <TextField
            select
            margin="dense"
            name="role"
            label="Role"
            fullWidth
            variant="outlined"
            value={userForm.role}
            onChange={handleFormChange}
            required
          >
            {roles.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            name="password"
            label={dialogMode === 'add' ? 'Password' : 'New Password (leave blank to keep current)'}
            type="password"
            fullWidth
            variant="outlined"
            value={userForm.password}
            onChange={handleFormChange}
            required={dialogMode === 'add'}
          />
          <TextField
            margin="dense"
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            fullWidth
            variant="outlined"
            value={userForm.confirmPassword}
            onChange={handleFormChange}
            required={dialogMode === 'add' || userForm.password !== ''}
          />
          <FormControlLabel
            control={
              <Switch
                checked={userForm.isActive}
                onChange={handleFormChange}
                name="isActive"
                color="primary"
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmitForm} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add User' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user "{selectedUser?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={deleteUser} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;