import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set auth token in axios headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user data if token exists
  useEffect(() => {
    const loadUser = async () => {
      console.log('🔐 AuthContext: Loading user, token exists:', !!token);
      if (!token) {
        console.log('🔐 AuthContext: No token found, setting unauthenticated');
        setLoading(false);
        return;
      }

      try {
        console.log('🔐 AuthContext: Attempting to load user with token');
        const res = await axios.get('/api/auth/me');
        console.log('🔐 AuthContext: User loaded successfully:', res.data.data.name, '(' + res.data.data.role + ')');
        setUser(res.data.data);
        setIsAuthenticated(true);
        console.log('🔐 AuthContext: Authentication state set to true');
      } catch (err) {
        console.error('🔐 AuthContext: Error loading user:', err.response?.data?.message || err.message);
        console.log('🔐 AuthContext: Clearing authentication state due to error');
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setError('Authentication failed. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Register user
  const register = async (formData) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/register', formData);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return { success: false, error: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Attempting login for:', email);
      setLoading(true);
      const res = await axios.post('/api/auth/login', { email, password });
      console.log('🔐 AuthContext: Login successful, storing token');
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      console.log('🔐 AuthContext: Token set, authentication should trigger');
      return { success: true };
    } catch (err) {
      console.error('🔐 AuthContext: Login failed:', err.response?.data?.message || err.message);
      setError(err.response?.data?.message || 'Invalid credentials');
      return { success: false, error: err.response?.data?.message || 'Invalid credentials' };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      const res = await axios.put('/api/auth/update-details', userData);
      setUser(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      return { success: false, error: err.response?.data?.message || 'Failed to update profile' };
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      await axios.put('/api/auth/update-password', { currentPassword, newPassword });
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
      return { success: false, error: err.response?.data?.message || 'Failed to change password' };
    } finally {
      setLoading(false);
    }
  };

  // Request password reset
  const requestPasswordReset = async (email) => {
    try {
      setLoading(true);
      await axios.post('/api/auth/forgot-password', { email });
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset');
      return { success: false, error: err.response?.data?.message || 'Failed to request password reset' };
    } finally {
      setLoading(false);
    }
  };

  // Reset password with token
  const resetPassword = async (token, newPassword) => {
    try {
      setLoading(true);
      await axios.post(`/api/auth/reset-password/${token}`, { password: newPassword });
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
      return { success: false, error: err.response?.data?.message || 'Failed to reset password' };
    } finally {
      setLoading(false);
    }
  };

  // Clear any auth errors
  const clearError = () => setError(null);

  // Login with existing JWT (used after invitation acceptance)
  const loginWithToken = async (jwtToken) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setIsAuthenticated(true);
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      setUser(res.data.data);
    } catch (err) {
      console.error('Failed to load user after token login:', err);
    }
  };

  // Check if user has permission based on role
  const hasPermission = (requiredRoles = []) => {
    if (!isAuthenticated || !user) return false;
    
    // If no specific roles required, just check if authenticated
    if (requiredRoles.length === 0) return true;
    
    // Check if user's role is in the required roles
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        error,
        register,
        login,
        logout,
        updateProfile,
        changePassword,
        requestPasswordReset,
        resetPassword,
        loginWithToken,
        clearError,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;