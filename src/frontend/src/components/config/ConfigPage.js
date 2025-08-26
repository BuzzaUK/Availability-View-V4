import React, { useState, useContext } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import DevicesIcon from '@mui/icons-material/Devices';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BackupIcon from '@mui/icons-material/Backup';
import RouterIcon from '@mui/icons-material/Router';

// Components
import GeneralSettings from './GeneralSettings';
import UserManagement from './UserManagement';
import TeamManagement from '../TeamManagement';
import AssetManagement from './AssetManagement';
import LoggerManagement from './LoggerManagement';
import NotificationSettings from './NotificationSettings';
import BackupRestore from './BackupRestore';

// Context
import AlertContext from '../../context/AlertContext';

// Styled components
const TabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

const ConfigPage = () => {
  const { error, success } = useContext(AlertContext);
  
  // State for tab selection
  const [tabValue, setTabValue] = useState(0);
  
  // Tab labels and icons
  const tabs = [
    { label: 'General Settings', icon: <SettingsIcon /> },
    { label: 'User Management', icon: <PeopleIcon /> },
    { label: 'Team Management', icon: <GroupIcon /> },
    { label: 'Asset Management', icon: <DevicesIcon /> },
    { label: 'Logger Management', icon: <RouterIcon /> },
    { label: 'Notifications', icon: <NotificationsIcon /> },
    { label: 'Backup & Restore', icon: <BackupIcon /> },
  ];

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage system settings, users, assets, and more.
        </Typography>
      </Box>
      
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab 
              key={index} 
              label={tab.label} 
              icon={tab.icon} 
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>
      
      {/* General Settings Tab */}
      {tabValue === 0 && (
        <TabPanel>
          <GeneralSettings />
        </TabPanel>
      )}
      
      {/* User Management Tab */}
      {tabValue === 1 && (
        <TabPanel>
          <UserManagement />
        </TabPanel>
      )}
      
      {/* Team Management Tab */}
      {tabValue === 2 && (
        <TabPanel>
          <TeamManagement />
        </TabPanel>
      )}
      
      {/* Asset Management Tab */}
      {tabValue === 3 && (
        <TabPanel>
          <AssetManagement />
        </TabPanel>
      )}
      
      {/* Logger Management Tab */}
      {tabValue === 4 && (
        <TabPanel>
          <LoggerManagement />
        </TabPanel>
      )}
      
      {/* Notification Settings Tab */}
      {tabValue === 5 && (
        <TabPanel>
          <NotificationSettings />
        </TabPanel>
      )}
      
      {/* Backup & Restore Tab */}
      {tabValue === 6 && (
        <TabPanel>
          <BackupRestore />
        </TabPanel>
      )}
    </Box>
  );
};

export default ConfigPage;