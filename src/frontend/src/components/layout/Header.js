import React, { useState, useContext } from 'react';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import Person from '@mui/icons-material/Person';
import AuthContext from '../../context/AuthContext';
import SocketContext from '../../context/SocketContext';

// Styled AppBar component
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open, sidebarWidth }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: sidebarWidth,
    width: `calc(100% - ${sidebarWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Header = ({ open, sidebarWidth, handleDrawerToggle, user }) => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const { connected, currentShift } = useContext(SocketContext);
  
  // User menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  
  // Handle user menu open
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle user menu close
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // Handle profile click
  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };
  
  // Handle settings click
  const handleSettings = () => {
    handleClose();
    navigate('/config');
  };
  
  // Handle logout click
  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  return (
    <StyledAppBar position="fixed" open={open} sidebarWidth={sidebarWidth}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={handleDrawerToggle}
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Industrial Monitoring Dashboard
          {currentShift && (
            <Typography variant="subtitle2" component="span" sx={{ ml: 2 }}>
              Current Shift: {currentShift.name}
            </Typography>
          )}
        </Typography>
        
        {/* Connection status indicator */}
        <Typography 
          variant="body2" 
          component="div" 
          sx={{ 
            mr: 2, 
            display: 'flex', 
            alignItems: 'center' 
          }}
        >
          <span 
            style={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              backgroundColor: connected ? '#4caf50' : '#f44336',
              display: 'inline-block',
              marginRight: 8
            }} 
          />
          {connected ? 'Connected' : 'Disconnected'}
        </Typography>
        
        {/* Notifications */}
        <IconButton color="inherit" sx={{ mr: 1 }}>
          <Badge badgeContent={0} color="secondary">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        
        {/* User menu */}
        <div>
          <IconButton
            onClick={handleMenu}
            color="inherit"
            size="large"
            aria-controls={menuOpen ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? 'true' : undefined}
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="account-menu"
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
                <Settings fontSize="small" />
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
        </div>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Header;