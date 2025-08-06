import React, { useState, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockResetIcon from '@mui/icons-material/LockReset';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

// Context
import AuthContext from '../../context/AuthContext';
import AlertContext from '../../context/AlertContext';

// Validation schema
const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
});

const ForgotPassword = () => {
  const { requestPasswordReset } = useContext(AuthContext);
  const { success: displaySuccess, error: displayError } = useContext(AlertContext);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setFormError('');
    setFormSuccess('');
    const { email } = values;
    
    const result = await requestPasswordReset(email);
    
    if (result.success) {
      setFormSuccess('Password reset instructions have been sent to your email.');
      displaySuccess('Password reset instructions have been sent to your email.');
      resetForm();
    } else {
      setFormError(result.error);
      displayError(result.error);
    }
    
    setSubmitting(false);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={6} sx={{ mt: 8, p: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: '#1976d2' }}>
            <LockResetIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Forgot Password
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, mb: 3, textAlign: 'center' }}>
            Enter your email address and we'll send you instructions to reset your password.
          </Typography>
          
          {formError && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {formError}
            </Alert>
          )}
          
          {formSuccess && (
            <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
              {formSuccess}
            </Alert>
          )}
          
          <Formik
            initialValues={{ email: '' }}
            validationSchema={ForgotPasswordSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form noValidate sx={{ mt: 1, width: '100%' }}>
                <Field
                  as={TextField}
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} />
                  ) : (
                    'Send Reset Instructions'
                  )}
                </Button>
                <Grid container>
                  <Grid item xs>
                    <Link component={RouterLink} to="/login" variant="body2">
                      Back to Sign In
                    </Link>
                  </Grid>
                  <Grid item>
                    <Link component={RouterLink} to="/register" variant="body2">
                      Don't have an account? Sign Up
                    </Link>
                  </Grid>
                </Grid>
              </Form>
            )}
          </Formik>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;