import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Link,
} from '@mui/material';
import {
  Person as EmployeeIcon,
  School as StudentIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getSchoolCode } from '../config/api';
import { useIsMobile } from '../hooks/useIsMobile';
import TurnstileWidget from '../components/TurnstileWidget';

const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY || '';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Mobile surface (phones, < sm breakpoint) is employee-only — students get a
  // dedicated app. Larger screens keep both login options. Falls back to employee
  // if the viewport shrinks below the breakpoint while 'student' was selected.
  const isMobile = useIsMobile();
  const [userType, setUserType] = useState('employee');
  const effectiveUserType = isMobile ? 'employee' : userType;

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Turnstile token + a key we bump to force a fresh widget after a failed attempt
  // (tokens are single-use).
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);

  const schoolCode = getSchoolCode();
  const from = location.state?.from?.pathname || '/';

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleUserTypeChange = (event, newType) => {
    if (newType !== null) {
      setUserType(newType);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.username, formData.password, effectiveUserType, turnstileToken);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Login failed. Please try again.';
      setError(message);
      // A used/failed attempt burns the token — reset the widget for a fresh one.
      setTurnstileToken('');
      setTurnstileKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#edf1f7',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ color: '#222b45', fontWeight: 700 }}>
              ItsMySkool
            </Typography>
            <Typography variant="body2" sx={{ color: '#8f9bb3', mt: 1 }}>
              Staff Portal
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'inline-block',
                mt: 2,
                px: 2,
                py: 0.5,
                backgroundColor: '#f0f3ff',
                color: '#3366ff',
                borderRadius: 1,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {schoolCode}
            </Typography>
          </Box>

          {!isMobile && (
            <ToggleButtonGroup
              value={effectiveUserType}
              exclusive
              onChange={handleUserTypeChange}
              fullWidth
              sx={{ mb: 3 }}
            >
              <ToggleButton value="student" sx={{ py: 1.5 }}>
                <StudentIcon sx={{ mr: 1 }} />
                Student
              </ToggleButton>
              <ToggleButton value="employee" sx={{ py: 1.5 }}>
                <EmployeeIcon sx={{ mr: 1 }} />
                Employee
              </ToggleButton>
            </ToggleButtonGroup>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              margin="normal"
              required
              autoFocus
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
            />
            <TurnstileWidget
              key={turnstileKey}
              sitekey={TURNSTILE_SITEKEY}
              onToken={setTurnstileToken}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              underline="hover"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot username or password?
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
