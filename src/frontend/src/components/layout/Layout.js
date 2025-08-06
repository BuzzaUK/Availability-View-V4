import React, { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';

// Layout components
import Sidebar from './Sidebar';
import Header from './Header';
import AlertDisplay from './AlertDisplay';

// Context
import AuthContext from '../../context/AuthContext';

// Styled components
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open, sidebarWidth }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: `${sidebarWidth}px`,
    }),
  }),
);

const Layout = () => {
  // Sidebar configuration
  const sidebarWidth = 240;
  const [open, setOpen] = useState(true);
  const { user } = useContext(AuthContext);

  // Toggle sidebar
  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* Header */}
      <Header 
        open={open} 
        sidebarWidth={sidebarWidth} 
        handleDrawerToggle={handleDrawerToggle} 
        user={user}
      />
      
      {/* Sidebar */}
      <Sidebar 
        open={open} 
        sidebarWidth={sidebarWidth} 
        handleDrawerToggle={handleDrawerToggle} 
        user={user}
      />
      
      {/* Main content */}
      <Main open={open} sidebarWidth={sidebarWidth}>
        <Box sx={{ height: 64 }} /> {/* Toolbar spacer */}
        
        {/* Alert display for notifications */}
        <AlertDisplay />
        
        {/* Page content (rendered by react-router) */}
        <Box sx={{ mt: 2 }}>
          <Outlet />
        </Box>
      </Main>
    </Box>
  );
};

export default Layout;