import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  InputAdornment,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  LockReset as LockResetIcon,
} from '@mui/icons-material';
import { employeeService } from '../../../services/employeeService';

export default function CredentialsDialog({ open, employee, onClose }) {
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (open && employee) {
      loadCredentials();
    } else {
      setCredentials(null);
      setError('');
      setInfo('');
      setShowPassword(false);
    }
  }, [open, employee]);

  const loadCredentials = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await employeeService.getCredentials(employee.uuid);
      setCredentials(data);
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to load credentials';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError('');
    setInfo('');
    try {
      await employeeService.resetPassword(employee.uuid);
      setInfo('Password has been reset. The user must change it on next login.');
      await loadCredentials();
    } catch (err) {
      const message = err.response?.data?.error?.description || 'Failed to reset password';
      setError(message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Login Credentials{employee ? ` — ${employee.name}` : ''}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : credentials ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Username"
              value={credentials.username}
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Password"
              value={credentials.password}
              type={showPassword ? 'text' : 'password'}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((p) => !p)} edge="end">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {credentials.mustChangePassword && (
              <Box>
                <Chip
                  label="Must change password on next login"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Box>
            )}
            <Typography variant="caption" color="text.secondary">
              Passwords are shown in plain text. Treat this screen as sensitive.
            </Typography>
          </Box>
        ) : (
          !error && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No login found for this employee.
            </Typography>
          )
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button
          startIcon={<LockResetIcon />}
          color="warning"
          onClick={handleReset}
          disabled={resetting || loading || !credentials}
        >
          {resetting ? 'Resetting...' : 'Reset Password'}
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
