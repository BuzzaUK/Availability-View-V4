import { io } from 'socket.io-client';

class NotificationService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Notification service connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Notification service disconnected');
      this.isConnected = false;
    });

    this.socket.on('alert', (alertData) => {
      this.handleAlert(alertData);
    });

    this.socket.on('alert_cleared', (alertData) => {
      this.handleAlertCleared(alertData);
    });

    this.socket.on('notification', (notification) => {
      this.handleNotification(notification);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  handleAlert(alertData) {
    // Emit to all alert listeners
    this.emit('alert', alertData);
    
    // Show browser notification if permission granted
    this.showBrowserNotification({
      title: `${alertData.severity.toUpperCase()} Alert`,
      body: alertData.message,
      icon: this.getAlertIcon(alertData.severity),
      tag: alertData.id
    });
  }

  handleAlertCleared(alertData) {
    this.emit('alert_cleared', alertData);
  }

  handleNotification(notification) {
    this.emit('notification', notification);
    
    if (notification.showBrowser) {
      this.showBrowserNotification({
        title: notification.title,
        body: notification.message,
        icon: notification.icon,
        tag: notification.id
      });
    }
  }

  showBrowserNotification(options) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
        requireInteraction: true
      });
    }
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      return Notification.requestPermission();
    }
    return Promise.resolve(Notification.permission);
  }

  getAlertIcon(severity) {
    const icons = {
      critical: '/icons/alert-critical.png',
      high: '/icons/alert-high.png',
      medium: '/icons/alert-medium.png',
      low: '/icons/alert-low.png'
    };
    return icons[severity] || '/icons/alert-default.png';
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in notification listener:', error);
        }
      });
    }
  }

  // API methods for alert management
  async getActiveAlerts() {
    try {
      const response = await fetch('/api/alerts/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId) {
    try {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  async clearAlert(alertId) {
    try {
      const response = await fetch(`/api/alerts/${alertId}/clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error clearing alert:', error);
      throw error;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;