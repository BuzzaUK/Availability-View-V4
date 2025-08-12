import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Collapse from '@mui/material/Collapse';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import WarningIcon from '@mui/icons-material/Warning';
import PauseIcon from '@mui/icons-material/Pause';
import HelpIcon from '@mui/icons-material/Help';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import { format } from 'date-fns';

// Styled expand button
const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

// Helper function to format duration in hours:minutes:seconds
const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '00:00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
};

// Get status icon and color based on asset state
const getStatusInfo = (state) => {
  switch (state) {
    case 'RUNNING':
      return { 
        icon: <PlayArrowIcon />, 
        color: '#4caf50', 
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        label: 'Running'
      };
    case 'STOPPED':
      return { 
        icon: <StopIcon />, 
        color: '#f44336', 
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        label: 'Stopped'
      };
    case 'WARNING':
      return { 
        icon: <WarningIcon />, 
        color: '#ff9800', 
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        label: 'Warning'
      };
    case 'IDLE':
      return { 
        icon: <PauseIcon />, 
        color: '#9e9e9e', 
        backgroundColor: 'rgba(158, 158, 158, 0.1)',
        label: 'Idle'
      };
    default:
      return { 
        icon: <HelpIcon />, 
        color: '#9e9e9e', 
        backgroundColor: 'rgba(158, 158, 158, 0.1)',
        label: 'Unknown'
      };
  }
};

const AssetStatusCard = ({ asset }) => {
  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Get status information based on asset state
  const statusInfo = getStatusInfo(asset.state);
  
  // Handle expand click
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  // Handle menu open
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card 
      sx={{ 
        maxWidth: 345,
        borderLeft: `4px solid ${statusInfo.color}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardHeader
        avatar={
          <Avatar 
            sx={{ 
              bgcolor: statusInfo.backgroundColor,
              color: statusInfo.color
            }}
            aria-label="asset status"
          >
            {statusInfo.icon}
          </Avatar>
        }
        action={
          <IconButton aria-label="settings" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
        }
        title={
          <Typography variant="h6" component="div">
            {asset.name}
          </Typography>
        }
        subheader={
          <Chip 
            label={statusInfo.label} 
            size="small" 
            sx={{ 
              backgroundColor: statusInfo.backgroundColor,
              color: statusInfo.color,
              fontWeight: 'bold',
              mt: 0.5
            }} 
          />
        }
      />
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View History</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Configure</ListItemText>
        </MenuItem>
      </Menu>
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Runtime:
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {formatDuration(asset.runtime)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Downtime:
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {formatDuration(asset.downtime)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Last Updated:
          </Typography>
          <Typography variant="body2">
            {asset.updatedAt ? format(new Date(asset.updatedAt), 'HH:mm:ss') : 'N/A'}
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions disableSpacing>
        <Typography variant="body2" color="text.secondary">
          Details
        </Typography>
        <ExpandMore
          expand={expanded}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <ExpandMoreIcon />
        </ExpandMore>
      </CardActions>
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          <Typography paragraph variant="body2" fontWeight="bold">
            Asset Information:
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              ID:
            </Typography>
            <Typography variant="body2">
              {asset.id}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Pin Number:
            </Typography>
            <Typography variant="body2">
              {asset.pinNumber}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Created:
            </Typography>
            <Typography variant="body2">
              {asset.createdAt ? format(new Date(asset.createdAt), 'yyyy-MM-dd HH:mm') : 'N/A'}
            </Typography>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default AssetStatusCard;