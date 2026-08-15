import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Stack,
} from '@mui/material';
import {
  Person as EmployeeIcon,
  School as StudentIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import api, { getSchoolCode } from '../config/api';
import { useIsMobile } from '../hooks/useIsMobile';

// Self-service account recovery for the staff portal. Mirrors the Login screen's
// user-type toggle (desktop = Student|Employee, mobile = Employee-only) and maps it
// onto the auth module's recovery userType (employee -> staff, student -> parent).
// Two purposes share one OTP challenge: reveal the username, or set a new password.
// All three calls go through the shared axios `api`, which injects X-School-Code.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const schoolCode = getSchoolCode();

  const [userType, setUserType] = useState('employee');
  const effectiveUserType = isMobile ? 'employee' : userType;
  const recoverUserType = effectiveUserType === 'student' ? 'parent' : 'staff';

  const [purpose, setPurpose] = useState('password'); // 'username' | 'password'
  const [phone, setPhone] = useState('');

  // step: identify -> otp -> setpw -> done
  const [step, setStep] = useState('identify');
  const [otpId, setOtpId] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [usernames, setUsernames] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const apiError = (err, fallback) =>
    err.response?.data?.error?.description || fallback;

  const requestOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setInfo('');
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid registered mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/recover/request-otp', {
        userType: recoverUserType,
        purpose,
        phone: phone.replace(/\D/g, ''),
      });
      setOtpId(res.data.otpId);
      setStep('otp');
      setInfo(res.data.message || 'If an account matches this number, a code has been sent by SMS.');
    } catch (err) {
      setError(apiError(err, 'Could not send the code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setInfo('');
    if (code.replace(/\D/g, '').length !== 6) {
      setError('Enter the 6-digit code from the SMS.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/recover/verify-otp', { otpId, code: code.replace(/\D/g, '') });
      if (res.data.purpose === 'username') {
        setUsernames(res.data.usernames || []);
        setStep('done');
      } else {
        setResetToken(res.data.resetToken);
        setStep('setpw');
      }
    } catch (err) {
      setError(apiError(err, 'Could not verify the code.'));
    } finally {
      setLoading(false);
    }
  };

  const setPassword = async (e) => {
    e?.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/recover/set-password', { resetToken, newPassword });
      setStep('done');
    } catch (err) {
      setError(apiError(err, 'Could not reset the password.'));
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep('identify');
    setOtpId('');
    setCode('');
    setResetToken('');
    setUsernames([]);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setInfo('');
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
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ color: '#222b45', fontWeight: 700 }}>
              Account Recovery
            </Typography>
            <Typography variant="body2" sx={{ color: '#8f9bb3', mt: 1 }}>
              {schoolCode} · Staff Portal
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {info && step !== 'identify' && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

          {/* Step 1 — identify */}
          {step === 'identify' && (
            <form onSubmit={requestOtp}>
              <ToggleButtonGroup
                value={purpose}
                exclusive
                onChange={(_, v) => v && setPurpose(v)}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              >
                <ToggleButton value="password" sx={{ py: 1 }}>Forgot password</ToggleButton>
                <ToggleButton value="username" sx={{ py: 1 }}>Forgot username</ToggleButton>
              </ToggleButtonGroup>

              {!isMobile && (
                <ToggleButtonGroup
                  value={effectiveUserType}
                  exclusive
                  onChange={(_, v) => v && setUserType(v)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="student" sx={{ py: 1.25 }}>
                    <StudentIcon sx={{ mr: 1 }} /> Student
                  </ToggleButton>
                  <ToggleButton value="employee" sx={{ py: 1.25 }}>
                    <EmployeeIcon sx={{ mr: 1 }} /> Employee
                  </ToggleButton>
                </ToggleButtonGroup>
              )}

              <TextField
                fullWidth
                label="Registered mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                margin="normal"
                required
                autoFocus
                disabled={loading}
                inputProps={{ inputMode: 'numeric', maxLength: 15 }}
              />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Send code'}
              </Button>
            </form>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <form onSubmit={verifyOtp}>
              <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 1 }}>
                Enter the 6-digit code sent to your registered mobile number.
              </Typography>
              <TextField
                fullWidth
                label="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                margin="normal"
                required
                autoFocus
                disabled={loading}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify'}
              </Button>
              <Button fullWidth variant="text" size="small" disabled={loading} sx={{ mt: 1 }} onClick={resetAll}>
                Use a different number
              </Button>
            </form>
          )}

          {/* Step 3 — set new password */}
          {step === 'setpw' && (
            <form onSubmit={setPassword}>
              <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 1 }}>
                Choose a new password (at least 6 characters).
              </Typography>
              <TextField
                fullWidth
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
                autoFocus
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
                disabled={loading}
              />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Set new password'}
              </Button>
            </form>
          )}

          {/* Step 4 — done */}
          {step === 'done' && (
            <Stack spacing={2}>
              {usernames.length > 0 ? (
                <>
                  <Alert severity="success">
                    Your username{usernames.length > 1 ? 's' : ''}:
                    <Box component="div" sx={{ mt: 1, fontWeight: 700, fontSize: 18 }}>
                      {usernames.join(', ')}
                    </Box>
                  </Alert>
                  <Typography variant="body2" sx={{ color: '#8f9bb3' }}>
                    Use this to sign in. If you also forgot your password, choose “Forgot password”.
                  </Typography>
                </>
              ) : (
                <Alert severity="success">
                  Your password has been reset. You can now sign in with your new password.
                </Alert>
              )}
              <Button fullWidth variant="contained" size="large" onClick={() => navigate('/login')}>
                Back to sign in
              </Button>
            </Stack>
          )}

          {step !== 'done' && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                underline="hover"
                onClick={() => navigate('/login')}
              >
                <BackIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                Back to sign in
              </Link>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
