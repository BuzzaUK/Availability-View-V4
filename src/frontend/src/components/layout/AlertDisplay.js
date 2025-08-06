import React, { useContext } from 'react';
import { styled } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Collapse from '@mui/material/Collapse';
import Box from '@mui/material/Box';

// Context
import AlertContext from '../../context/AlertContext';

// Styled alert container
const AlertContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: theme.spacing(9),
  right: theme.spacing(2),
  zIndex: theme.zIndex.snackbar,
  maxWidth: '400px',
  width: '100%',
}));

const AlertDisplay = () => {
  const { alerts, removeAlert } = useContext(AlertContext);

  // If no alerts, don't render anything
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <AlertContainer>
      {alerts.map((alert, index) => (
        <Collapse key={alert.id} in={true}>
          <Alert
            severity={alert.type}
            sx={{
              mb: 2,
              boxShadow: 3,
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => removeAlert(alert.id)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {alert.title && <AlertTitle>{alert.title}</AlertTitle>}
            {alert.message}
          </Alert>
        </Collapse>
      ))}
    </AlertContainer>
  );
};

export default AlertDisplay;