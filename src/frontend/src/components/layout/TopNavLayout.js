import React, { useState, useContext, useEffect } from 'react';
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
  Chip,
  Button
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
  Refresh as RefreshIcon,
  Group as GroupIcon
} from '@mui/icons-material';

// Context
import AuthContext from '../../context/AuthContext';
import SocketContext from '../../context/SocketContext';
import SettingsContext from '../../context/SettingsContext';
import AlertDisplay from './AlertDisplay';
import AlertContext from '../../context/AlertContext';

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
  const { connected } = useContext(SocketContext);
  const { settings } = useContext(SettingsContext);
  const { error, success } = useContext(AlertContext);

  // Auto-refresh state (moved from EventsPage)
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [showRefreshNotice, setShowRefreshNotice] = useState(false);

  // Access fetchAllData from socket context to preserve functionality
  const { fetchAllData } = useContext(SocketContext);

  // Update countdown when settings change
  useEffect(() => {
    if (settings?.refreshInterval) {
      setRefreshCountdown(settings.refreshInterval);
    }
  }, [settings?.refreshInterval]);

  // Auto-refresh countdown effect
  useEffect(() => {
    if (settings?.autoRefresh) {
      const interval = setInterval(() => {
        setRefreshCountdown(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            // Trigger refresh
            fetchAllData();
            setShowRefreshNotice(true);
            setTimeout(() => setShowRefreshNotice(false), 2000);
            return settings?.refreshInterval || 30;
          }
          return newValue;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // Reset countdown when auto-refresh is disabled
      setRefreshCountdown(settings?.refreshInterval || 30);
    }
  }, [settings?.autoRefresh, settings?.refreshInterval, fetchAllData]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchAllData();
    setShowRefreshNotice(true);
    setTimeout(() => setShowRefreshNotice(false), 2000);
    setRefreshCountdown(settings?.refreshInterval || 30);
  };
  // User menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  // Navigation tabs
  const navigationTabs = [
    { label: 'Dashboard', value: '/', icon: <DashboardIcon /> },
    { label: 'Events', value: '/events', icon: <EventIcon /> },
    { label: 'Archives', value: '/archives', icon: <ArchiveIcon /> },
    { label: 'Analytics', value: '/analytics', icon: <AnalyticsIcon /> },
    { label: 'Config', value: '/config', icon: <SettingsIcon /> },
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

            {/* Auto-refresh controls (moved from EventsPage) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Auto-refresh in:
              </Typography>
              <Chip
                icon={<RefreshIcon />}
                label={settings?.autoRefresh ? `${refreshCountdown}s` : 'Off'}
                size="small"
                variant="outlined"
                sx={{
                  color: settings?.autoRefresh ? '#10b981' : '#94a3b8',
                  borderColor: settings?.autoRefresh ? '#10b981' : '#64748b',
                  minWidth: '60px',
                  '& .MuiChip-label': { minWidth: '32px', textAlign: 'center' },
                  '& .MuiChip-icon': { color: settings?.autoRefresh ? '#10b981' : '#94a3b8' }
                }}
              />
              <Button
                size="small"
                onClick={handleManualRefresh}
                sx={{ color: showRefreshNotice ? '#ef4444' : '#94a3b8', '&:hover': { color: '#ffffff' } }}
              >
                Refresh Now
              </Button>
            </Box>

            {/* Connection status - only show when connected */}
            {connected && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Connected
                </Typography>
              </Box>
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
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={menuOpen}
              onClose={handleClose}
            >
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

      {/* Alert Display */}
      <AlertDisplay />

      {/* Main Content */}
      <MainContent>
        <Outlet />
      </MainContent>
    </Box>
  );
};

export default TopNavLayout;