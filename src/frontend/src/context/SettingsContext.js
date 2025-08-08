import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { isAuthenticated, token } = useContext(AuthContext);
  
  const [settings, setSettings] = useState({
    companyName: 'Industrial Monitoring Corp',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
    theme: 'light',
    autoRefresh: true,
    refreshInterval: 30,
    enableNotifications: true,
    enableEmailAlerts: false,
    enableSmsAlerts: false,
    dataRetentionDays: 90,
    autoBackup: true,
    autoBackupFrequency: 'daily',
  });
  
  const [loading, setLoading] = useState(false);

  // Fetch settings from backend
  const fetchSettings = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const headers = {
        Authorization: `Bearer ${token}`
      };
      const response = await axios.get('/api/settings', { headers });
      console.log('🔍 FETCHED SETTINGS FROM BACKEND:', response.data);
      setSettings(response.data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      // Use default settings if fetch fails
    } finally {
      setLoading(false);
    }
  };

  // Update settings
  const updateSettings = async (newSettings) => {
    if (!isAuthenticated || !token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);
      const headers = {
        Authorization: `Bearer ${token}`
      };
      const response = await axios.put('/api/settings', newSettings, { headers });
      console.log('🔍 UPDATE RESPONSE FROM BACKEND:', response.data);
      if (response.data.success) {
        console.log('🔍 SETTING NEW SETTINGS:', response.data.data);
        setSettings(response.data.data);
        return { success: true };
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      return { success: false, error: err.response?.data?.message || 'Failed to update settings' };
    } finally {
      setLoading(false);
    }
  };

  // Load settings on mount
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchSettings();
    }
  }, [isAuthenticated, token]);

  const value = {
    settings,
    setSettings,
    loading,
    fetchSettings,
    updateSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;