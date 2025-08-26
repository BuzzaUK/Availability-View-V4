import React, { createContext, useContext, useReducer, useEffect } from 'react';
import notificationService from '../services/notificationService';
import AuthContext from './AuthContext';

const NotificationContext = createContext();

// Action types
const NOTIFICATION_ACTIONS = {
  SET_ALERTS: 'SET_ALERTS',
  ADD_ALERT: 'ADD_ALERT',
  UPDATE_ALERT: 'UPDATE_ALERT',
  REMOVE_ALERT: 'REMOVE_ALERT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_UNREAD_COUNT: 'SET_UNREAD_COUNT'
};

// Initial state
const initialState = {
  alerts: [],
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  connected: false
};

// Reducer
function notificationReducer(state, action) {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.SET_ALERTS:
      return {
        ...state,
        alerts: action.payload,
        loading: false,
        error: null
      };
    
    case NOTIFICATION_ACTIONS.ADD_ALERT:
      return {
        ...state,
        alerts: [action.payload, ...state.alerts],
        unreadCount: state.unreadCount + 1
      };
    
    case NOTIFICATION_ACTIONS.UPDATE_ALERT:
      return {
        ...state,
        alerts: state.alerts.map(alert => 
          alert.id === action.payload.id ? { ...alert, ...action.payload } : alert
        )
      };
    
    case NOTIFICATION_ACTIONS.REMOVE_ALERT:
      return {
        ...state,
        alerts: state.alerts.filter(alert => alert.id !== action.payload)
      };
    
    case NOTIFICATION_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications.slice(0, 49)], // Keep last 50
        unreadCount: state.unreadCount + 1
      };
    
    case NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(notif => notif.id !== action.payload)
      };
    
    case NOTIFICATION_ACTIONS.SET_UNREAD_COUNT:
      return {
        ...state,
        unreadCount: action.payload
      };
    
    case NOTIFICATION_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    
    case NOTIFICATION_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    
    default:
      return state;
  }
}

// Provider component
export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, token } = useContext(AuthContext);

  // Initialize notification service
  useEffect(() => {
    if (token && user) {
      // Connect to notification service
      notificationService.connect(token);
      
      // Request browser notification permission
      notificationService.requestNotificationPermission();
      
      // Set up event listeners
      const handleAlert = (alertData) => {
        dispatch({ type: NOTIFICATION_ACTIONS.ADD_ALERT, payload: alertData });
      };
      
      const handleAlertCleared = (alertData) => {
        dispatch({ type: NOTIFICATION_ACTIONS.REMOVE_ALERT, payload: alertData.id });
      };
      
      const handleNotification = (notification) => {
        dispatch({ type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION, payload: notification });
      };
      
      notificationService.on('alert', handleAlert);
      notificationService.on('alert_cleared', handleAlertCleared);
      notificationService.on('notification', handleNotification);
      
      // Load initial alerts
      loadActiveAlerts();
      
      return () => {
        notificationService.off('alert', handleAlert);
        notificationService.off('alert_cleared', handleAlertCleared);
        notificationService.off('notification', handleNotification);
        notificationService.disconnect();
      };
    }
  }, [token, user]);

  // Load active alerts
  const loadActiveAlerts = async () => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.SET_LOADING, payload: true });
      const alerts = await notificationService.getActiveAlerts();
      dispatch({ type: NOTIFICATION_ACTIONS.SET_ALERTS, payload: alerts });
    } catch (error) {
      dispatch({ type: NOTIFICATION_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId) => {
    try {
      await notificationService.acknowledgeAlert(alertId);
      dispatch({ 
        type: NOTIFICATION_ACTIONS.UPDATE_ALERT, 
        payload: { id: alertId, acknowledged: true, acknowledgedAt: new Date().toISOString() }
      });
    } catch (error) {
      dispatch({ type: NOTIFICATION_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Clear alert
  const clearAlert = async (alertId) => {
    try {
      await notificationService.clearAlert(alertId);
      dispatch({ type: NOTIFICATION_ACTIONS.REMOVE_ALERT, payload: alertId });
    } catch (error) {
      dispatch({ type: NOTIFICATION_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Mark notifications as read
  const markAsRead = () => {
    dispatch({ type: NOTIFICATION_ACTIONS.SET_UNREAD_COUNT, payload: 0 });
  };

  // Clear notification
  const clearNotification = (notificationId) => {
    dispatch({ type: NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION, payload: notificationId });
  };

  // Get alerts by severity
  const getAlertsBySeverity = (severity) => {
    return state.alerts.filter(alert => alert.severity === severity);
  };

  // Get unacknowledged alerts
  const getUnacknowledgedAlerts = () => {
    return state.alerts.filter(alert => !alert.acknowledged);
  };

  const value = {
    ...state,
    loadActiveAlerts,
    acknowledgeAlert,
    clearAlert,
    markAsRead,
    clearNotification,
    getAlertsBySeverity,
    getUnacknowledgedAlerts
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;