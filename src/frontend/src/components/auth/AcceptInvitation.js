import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api from '../../services/api';

import AuthContext from '../../context/AuthContext';
import AlertContext from '../../context/AlertContext';

const AcceptInvitation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useContext(AuthContext);
  const { success, error } = useContext(AlertContext);

  const [verifying, setVerifying] = useState(true);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!token || !email) {
        setVerifyError('Invalid invitation link. Missing token or email.');
        setVerifying(false);
        return;
      }

      try {
        const res = await api.get(`/invitations/verify/${token}`, {
          params: { email }
        });
        setInviteInfo(res.data.data);
      } catch (err) {
        setVerifyError(err.response?.data?.message || 'Invalid or expired invitation.');
      } finally {
        setVerifying(false);
      }
    };

    verifyInvitation();
  }, [token, email]);

  const handleAccept = async () => {
    if (!name.trim()) {
      error('Please enter your full name');
      return;
    }
    if (!password || password.length < 6) {
      error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/invitations/accept', {
        token,
        email,
        name,
        password
      });

      const jwt = res.data.token;
      if (jwt) {
        await loginWithToken(jwt);
      }

      success('Welcome! Your account has been created.');
      navigate('/', { replace: true });
    } catch (err) {
      error(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5', p: 2 }}>
      <Paper sx={{ maxWidth: 600, width: '100%', p: 4 }} elevation={3}>
        <Typography variant="h4" gutterBottom>
          Accept Invitation
        </Typography>

        {verifying ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : verifyError ? (
          <Alert icon={<ErrorIcon fontSize="inherit" />} severity="error" sx={{ mb: 2 }}>
            {verifyError}
          </Alert>
        ) : (
          <>
            <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success" sx={{ mb: 3 }}>
              Invitation verified for <strong>{inviteInfo?.email || email}</strong>
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Role: <strong>{inviteInfo?.role || 'Viewer'}</strong></Typography>
              <Typography variant="body2" color="text.secondary">
                This invitation will expire on {inviteInfo?.expires_at ? new Date(inviteInfo.expires_at).toLocaleString() : 'soon'}
              </Typography>
            </Box>

            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
              Create Your Account
            </Typography>
            <TextField
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Minimum 6 characters"
            />
            <TextField
              fullWidth
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleAccept}
              disabled={submitting}
              fullWidth
              size="large"
            >
              {submitting ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                Already have an account?{' '}
                <Link component={RouterLink} to="/login">Sign in</Link>
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AcceptInvitation;