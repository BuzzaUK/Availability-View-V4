import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Components
import TopNavLayout from './components/layout/TopNavLayout';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import AcceptInvitation from './components/auth/AcceptInvitation';

// Dashboard Components
import Dashboard from './components/dashboard/Dashboard';
import EventsPage from './components/events/EventsPage';
import ArchivesPage from './components/archives/ArchivesPage';
import AnalyticsPage from './components/analytics/AnalyticsPage';
import AdvancedAnalyticsPage from './components/analytics/AdvancedAnalyticsPage';
import AlertManagementPage from './components/alerts/AlertManagementPage';
import ConfigPage from './components/config/ConfigPage';
import UserManagement from './components/config/UserManagement';
import TeamManagement from './components/TeamManagement';

// Context
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AlertProvider } from './context/AlertContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';

// Debug Components
import ShiftDebugLogger from './components/common/ShiftDebugLogger';

// Routes
import PrivateRoute from './components/routing/PrivateRoute';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#dc004e',
      light: '#f06292',
      dark: '#c51162',
      contrastText: '#fff',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
      contrastText: '#fff',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#000',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
      contrastText: '#fff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#fff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#fff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  components: {
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#1976d2',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AlertProvider>
        <AuthProvider>
          <NotificationProvider>
            <SettingsProvider>
              <SocketProvider>
              <ShiftDebugLogger />
              <Router>
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                
                {/* Protected Routes */}
                <Route path="/" element={<PrivateRoute><TopNavLayout /></PrivateRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="events" element={<EventsPage />} />
                  <Route path="archives" element={<ArchivesPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="advanced-analytics" element={<AdvancedAnalyticsPage />} />
                  <Route path="alerts" element={<AlertManagementPage />} />
                  <Route path="config" element={<ConfigPage />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="teams" element={<Navigate to="/config" replace />} />
                  <Route path="system" element={<div>System Page</div>} />
                </Route>
                
                {/* Redirect any unknown routes to dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Router>
              </SocketProvider>
            </SettingsProvider>
          </NotificationProvider>
        </AuthProvider>
      </AlertProvider>
  </ThemeProvider>
  );
}

export default App;