import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getSchoolCode } from '../config/api';
import { useIsMobile } from '../hooks/useIsMobile';
import TurnstileWidget from '../components/TurnstileWidget';
import {
  authPageSx, authCardSx, authFieldSx, authCtaSx,
  BrandHeader, FieldCaption, UserTypeToggle,
} from '../components/auth/authKit';

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

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
    <Box sx={authPageSx}>
      <Card sx={authCardSx}>
        <CardContent sx={{ p: 4 }}>
          <BrandHeader title="ItsMySkool" sub="Staff Portal" badge={schoolCode} />

          {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            {!isMobile && (
              <Box sx={{ mb: 2.5 }}>
                <FieldCaption>Sign in as</FieldCaption>
                <UserTypeToggle
                  value={userType}
                  onChange={(v) => { setUserType(v); setError(''); }}
                  disabled={loading}
                />
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <FieldCaption>Username</FieldCaption>
              <TextField
                fullWidth hiddenLabel
                name="username"
                placeholder="Your login ID"
                value={formData.username}
                onChange={handleChange}
                required autoFocus disabled={loading}
                sx={authFieldSx}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <FieldCaption>Password</FieldCaption>
              <TextField
                fullWidth hiddenLabel
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={formData.password}
                onChange={handleChange}
                required disabled={loading}
                sx={authFieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

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
              sx={authCtaSx}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
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
