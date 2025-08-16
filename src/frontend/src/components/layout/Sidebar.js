import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ArchiveIcon from '@mui/icons-material/Archive';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';

// Context
import AuthContext from '../../context/AuthContext';
import SocketContext from '../../context/SocketContext';
import AlertContext from '../../context/AlertContext';
import axios from 'axios';

// Styled drawer header
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const Sidebar = ({ open, sidebarWidth, handleDrawerToggle }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { currentShift, connected } = useContext(SocketContext);
  const { error, success } = useContext(AlertContext);
  const [shiftLoading, setShiftLoading] = useState(false);
  
  // Navigation items
  const mainNavItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Events', icon: <EventNoteIcon />, path: '/events' },
    { text: 'Archives', icon: <ArchiveIcon />, path: '/archives' },
    { text: 'Analytics', icon: <InsightsIcon />, path: '/analytics' },
  ];
  
  // Admin navigation items
  const adminNavItems = [
    { text: 'Configuration', icon: <SettingsIcon />, path: '/config' },
  ];
  
  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
  };
  
  // Check if a path is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };

  // Start or End shift action
  const handleShiftAction = async () => {
    if (shiftLoading) return;
    setShiftLoading(true);
    try {
      if (currentShift) {
        await axios.post('/api/shifts/end', { notes: '' });
        success('Shift ended successfully');
      } else {
        await axios.post('/api/shifts/start', {});
        success('Shift started successfully');
      }
      // currentShift state will be updated via socket 'shift_update' event
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Operation failed';
      if (currentShift) {
        error('Failed to end shift: ' + msg);
      } else {
        error('Failed to start shift: ' + msg);
      }
    } finally {
      setShiftLoading(false);
    }
  };

  return (
    <Drawer
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: sidebarWidth,
          boxSizing: 'border-box',
        },
      }}
      variant="persistent"
      anchor="left"
      open={open}
    >
      <DrawerHeader>
        <IconButton onClick={handleDrawerToggle}>
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>
      
      <Divider />
      
      {/* Main navigation */}
      <List>
        {mainNavItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      {/* System Status Section */}
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          System Status
        </Typography>
        
        {/* Connection status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {connected ? <WifiIcon sx={{ color: '#10b981', fontSize: 16 }} /> : <WifiOffIcon sx={{ color: '#ef4444', fontSize: 16 }} />}
          <Typography variant="body2" sx={{ color: connected ? '#10b981' : '#ef4444' }}>
            {connected ? 'Connected' : 'Disconnected'}
          </Typography>
        </Box>
        
        {/* Current shift */}
        {currentShift && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Current Shift:
            </Typography>
            <Chip
              label={currentShift.name}
              size="small"
              sx={{ 
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontWeight: 500
              }}
            />
          </Box>
        )}
      </Box>
      
      <Divider />
      
      {/* Shift controls */}
      <List>
        <ListItem disablePadding>
          <Tooltip title={currentShift ? 'End Current Shift' : 'Start New Shift'}>
            <ListItemButton onClick={handleShiftAction} disabled={shiftLoading}>
              <ListItemIcon>
                {currentShift ? <StopIcon sx={{ color: '#f44336' }} /> : <PlayArrowIcon sx={{ color: '#4caf50' }} />}
              </ListItemIcon>
              <ListItemText primary={currentShift ? (shiftLoading ? 'Ending...' : 'End Shift') : (shiftLoading ? 'Starting...' : 'Start Shift')} />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
      
      <Divider />
      
      {/* Admin navigation - only shown for admin users */}
      {user && user.role === 'admin' && (
        <List>
          {adminNavItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive(item.path)}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      
      {/* Version info at bottom */}
      <Box sx={{ mt: 'auto', p: 2, opacity: 0.7 }}>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ fontSize: '0.75rem', textAlign: 'center' }}>
          Version 0.1.0
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;