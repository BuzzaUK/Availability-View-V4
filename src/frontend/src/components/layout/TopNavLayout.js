import React, { useState, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Badge,
  Button,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Event as EventIcon,
  Archive as ArchiveIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Computer as SystemIcon,
  AccountCircle,
  Notifications as NotificationsIcon,
  Logout,
  Person,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Context
import AuthContext from '../../context/AuthContext';
import SocketContext from '../../context/SocketContext';
import AlertDisplay from './AlertDisplay';

// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#1e293b',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTabs-indicator': {
    backgroundColor: '#3b82f6',
    height: 3,
  },
  '& .MuiTab-root': {
    color: '#94a3b8',
    fontWeight: 500,
    textTransform: 'none',
    fontSize: '0.875rem',
    minHeight: 48,
    '&.Mui-selected': {
      color: '#ffffff',
    },
    '&:hover': {
      color: '#e2e8f0',
    },
  },
}));

const MainContent = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  backgroundColor: '#f8fafc',
  minHeight: 'calc(100vh - 64px)',
  marginTop: 64,
}));

const TopNavLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const { connected, currentShift } = useContext(SocketContext);
  
  // User menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  // Navigation tabs
  const navigationTabs = [
    { label: 'Dashboard', value: '/', icon: <DashboardIcon /> },
    { label: 'Events', value: '/events', icon: <EventIcon /> },
    { label: 'Archives', value: '/archives', icon: <ArchiveIcon /> },
    { label: 'Analytics', value: '/analytics', icon: <AnalyticsIcon /> },
    { label: 'User Management', value: '/users', icon: <PeopleIcon /> },
    { label: 'Config', value: '/config', icon: <SettingsIcon /> },
    { label: 'System', value: '/system', icon: <SystemIcon /> },
  ];

  // Get current tab value
  const getCurrentTab = () => {
    const currentPath = location.pathname;
    const tab = navigationTabs.find(tab => 
      tab.value === currentPath || 
      (tab.value !== '/' && currentPath.startsWith(tab.value))
    );
    return tab ? tab.value : '/';
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    navigate(newValue);
  };

  // Handle user menu
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleSettings = () => {
    handleClose();
    navigate('/config');
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <StyledAppBar position="fixed">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left side - Title and Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 600,
                color: '#ffffff',
                mr: 4,
                fontSize: '1.1rem'
              }}
            >
              Asset Availability Dashboard
            </Typography>
            
            <StyledTabs
              value={getCurrentTab()}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              {navigationTabs.map((tab) => (
                <Tab
                  key={tab.value}
                  label={tab.label}
                  value={tab.value}
                  icon={tab.icon}
                  iconPosition="start"
                  sx={{ minWidth: 120 }}
                />
              ))}
            </StyledTabs>
          </Box>

          {/* Right side - Status and User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Auto-refresh indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Auto-refresh in:
              </Typography>
              <Chip 
                icon={<RefreshIcon />}
                label="30s"
                size="small"
                variant="outlined"
                sx={{ 
                  color: '#10b981',
                  borderColor: '#10b981',
                  '& .MuiChip-icon': { color: '#10b981' }
                }}
              />
              <Button
                size="small"
                onClick={handleRefresh}
                sx={{ 
                  color: '#94a3b8',
                  '&:hover': { color: '#ffffff' }
                }}
              >
                Refresh Now
              </Button>
            </Box>

            {/* Connection status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: connected ? '#10b981' : '#ef4444',
                }}
              />
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                {connected ? 'Connected' : 'Disconnected'}
              </Typography>
            </Box>

            {/* Current shift */}
            {currentShift && (
              <Chip
                label={`Shift: ${currentShift.name}`}
                size="small"
                sx={{ 
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontWeight: 500
                }}
              />
            )}

            {/* Notifications */}
            <IconButton color="inherit" sx={{ color: '#94a3b8' }}>
              <Badge badgeContent={0} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            {/* User menu */}
            <IconButton
              onClick={handleMenu}
              color="inherit"
              sx={{ color: '#94a3b8' }}
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {user && (
                <MenuItem disabled>
                  <Typography variant="body2">
                    Signed in as <strong>{user.name}</strong>
                  </Typography>
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={handleProfile}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={handleSettings}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </StyledAppBar>

      {/* Main content */}
      <MainContent>
        <AlertDisplay />
        <Outlet />
      </MainContent>
    </Box>
  );
};

export default TopNavLayout;