import React, { useContext } from 'react';
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

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ArchiveIcon from '@mui/icons-material/Archive';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

// Context
import AuthContext from '../../context/AuthContext';
import SocketContext from '../../context/SocketContext';

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
  const { currentShift } = useContext(SocketContext);
  
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
      
      {/* Shift controls */}
      <List>
        <ListItem disablePadding>
          <Tooltip title={currentShift ? 'End Current Shift' : 'Start New Shift'}>
            <ListItemButton>
              <ListItemIcon>
                {currentShift ? <StopIcon sx={{ color: '#f44336' }} /> : <PlayArrowIcon sx={{ color: '#4caf50' }} />}
              </ListItemIcon>
              <ListItemText primary={currentShift ? 'End Shift' : 'Start Shift'} />
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