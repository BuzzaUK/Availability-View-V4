import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { isAuthenticated, token } = useContext(AuthContext);
  
  // Default settings
  const defaultSettings = {
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
  };

  // Initialize settings from localStorage or defaults
  const getInitialSettings = () => {
    try {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Merge with defaults to ensure all properties exist
        return { ...defaultSettings, ...parsed };
      }
    } catch (err) {
      console.error('Failed to parse saved settings:', err);
    }
    return defaultSettings;
  };

  const [settings, setSettings] = useState(getInitialSettings);
  const [loading, setLoading] = useState(false);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings to localStorage:', err);
    }
  }, [settings]);

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
      
      // Merge backend settings with current settings to preserve any local changes
      const mergedSettings = { ...settings, ...response.data };
      setSettings(mergedSettings);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      // Keep current settings if fetch fails
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

  // Load settings from backend when authenticated, but don't reset local settings
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