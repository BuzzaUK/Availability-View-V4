import React, { createContext, useState, useCallback } from 'react';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  // Generate a unique ID for each alert
  const generateId = () => {
    return Math.random().toString(36).substring(2, 9);
  };

  // Add a new alert
  const addAlert = useCallback((message, type = 'info', timeout = 5000) => {
    const id = generateId();
    const newAlert = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      timestamp: new Date()
    };

    setAlerts(prevAlerts => [...prevAlerts, newAlert]);

    // Auto-remove alert after timeout
    if (timeout > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, timeout);
    }

    return id;
  }, []);

  // Remove an alert by ID
  const removeAlert = useCallback((id) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  }, []);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Convenience methods for different alert types
  const success = useCallback((message, timeout = 5000) => {
    return addAlert(message, 'success', timeout);
  }, [addAlert]);

  const error = useCallback((message, timeout = 5000) => {
    return addAlert(message, 'error', timeout);
  }, [addAlert]);

  const warning = useCallback((message, timeout = 5000) => {
    return addAlert(message, 'warning', timeout);
  }, [addAlert]);

  const info = useCallback((message, timeout = 5000) => {
    return addAlert(message, 'info', timeout);
  }, [addAlert]);

  return (
    <AlertContext.Provider
      value={{
        alerts,
        addAlert,
        removeAlert,
        clearAlerts,
        success,
        error,
        warning,
        info
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export default AlertContext;