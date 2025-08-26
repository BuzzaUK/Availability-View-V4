import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const {
    alerts,
    notifications,
    unreadCount,
    acknowledgeAlert,
    clearAlert,
    clearNotification,
    markAsRead,
    getUnacknowledgedAlerts
  } = useNotifications();

  const open = Boolean(anchorEl);
  const unacknowledgedAlerts = getUnacknowledgedAlerts();
  const totalUnread = unacknowledgedAlerts.length + unreadCount;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    if (unreadCount > 0) {
      markAsRead();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewAllAlerts = () => {
    navigate('/alerts');
    handleClose();
  };

  const handleAcknowledgeAlert = async (alertId, event) => {
    event.stopPropagation();
    try {
      await acknowledgeAlert(alertId);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleClearAlert = async (alertId, event) => {
    event.stopPropagation();
    try {
      await clearAlert(alertId);
    } catch (error) {
      console.error('Error clearing alert:', error);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <InfoIcon color="info" />;
      case 'low':
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const recentAlerts = unacknowledgedAlerts.slice(0, 5);
  const recentNotifications = notifications.slice(0, 3);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{ mr: 1 }}
        >
          <Badge badgeContent={totalUnread} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            overflow: 'auto'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" component="div">
            Notifications
          </Typography>
        </Box>
        
        {recentAlerts.length > 0 && (
          <>
            <Box sx={{ px: 2, pb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Active Alerts ({unacknowledgedAlerts.length})
              </Typography>
            </Box>
            
            <List dense>
              {recentAlerts.map((alert) => (
                <ListItem
                  key={alert.id}
                  sx={{
                    borderLeft: 4,
                    borderLeftColor: `${getSeverityColor(alert.severity)}.main`,
                    mb: 1,
                    mx: 1,
                    borderRadius: 1,
                    bgcolor: 'action.hover'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getSeverityIcon(alert.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {alert.message}
                        </Typography>
                        <Chip
                          label={alert.severity}
                          size="small"
                          color={getSeverityColor(alert.severity)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(alert.timestamp)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleAcknowledgeAlert(alert.id, e)}
                            title="Acknowledge"
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => handleClearAlert(alert.id, e)}
                            title="Clear"
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
            
            {unacknowledgedAlerts.length > 5 && (
              <Box sx={{ px: 2, pb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  +{unacknowledgedAlerts.length - 5} more alerts
                </Typography>
              </Box>
            )}
          </>
        )}
        
        {recentNotifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Recent Notifications
              </Typography>
            </Box>
            
            <List dense>
              {recentNotifications.map((notification) => (
                <ListItem key={notification.id}>
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => clearNotification(notification.id)}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
        
        {recentAlerts.length === 0 && recentNotifications.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No new notifications
            </Typography>
          </Box>
        )}
        
        <Divider />
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleViewAllAlerts}
          >
            View All Alerts
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;