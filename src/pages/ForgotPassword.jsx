import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, Link, Divider, Stack, InputAdornment, IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api, { getSchoolCode } from '../config/api';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  AUTH, authPageSx, authCardSx, authFieldSx, authCtaSx,
  BrandHeader, FieldCaption, UserTypeToggle,
} from '../components/auth/authKit';

// Self-service account recovery for the staff portal. Password-first: the page defaults
// to resetting a password, with a link to switch to username lookup. The Employee/Student
// choice mirrors Login and maps to the auth recovery userType (employee -> staff,
// student -> parent). All three calls go through the shared axios `api`, which injects
// X-School-Code. Steps: identify -> otp -> setpw -> done.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const schoolCode = getSchoolCode();

  const [userType, setUserType] = useState('employee');
  const effectiveUserType = isMobile ? 'employee' : userType;
  const recoverUserType = effectiveUserType === 'student' ? 'parent' : 'staff';

  const [purpose, setPurpose] = useState('password'); // 'password' | 'username'
  const [phone, setPhone] = useState('');

  const [step, setStep] = useState('identify'); // identify | otp | setpw | done
  const [otpId, setOtpId] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [usernames, setUsernames] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const apiError = (err, fallback) => err.response?.data?.error?.description || fallback;

  const resetAll = () => {
    setStep('identify'); setOtpId(''); setCode(''); setResetToken('');
    setUsernames([]); setNewPassword(''); setConfirmPassword('');
    setError(''); setInfo('');
  };

  const switchPurpose = () => {
    setPurpose((p) => (p === 'password' ? 'username' : 'password'));
    setError(''); setInfo('');
  };

  const requestOtp = async (e) => {
    e?.preventDefault();
    setError(''); setInfo('');
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
    setError(''); setInfo('');
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

  const submitPassword = async (e) => {
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

  const headerTitle = step === 'done'
    ? 'All set'
    : purpose === 'password' ? 'Reset your password' : 'Find your username';
  const headerSub = step !== 'identify'
    ? undefined
    : purpose === 'password'
      ? "We'll text a code to your registered mobile number"
      : "We'll text a code, then show your username";

  return (
    <Box sx={authPageSx}>
      <Card sx={authCardSx}>
        <CardContent sx={{ p: 4 }}>
          <BrandHeader title={headerTitle} titleSize={23} sub={headerSub} badge={`${schoolCode} · Staff Portal`} />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {info && step !== 'identify' && step !== 'done' && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

          {/* Step 1 — identify */}
          {step === 'identify' && (
            <form onSubmit={requestOtp}>
              {!isMobile && (
                <Box sx={{ mb: 2.5 }}>
                  <FieldCaption>I sign in as</FieldCaption>
                  <UserTypeToggle value={userType} onChange={setUserType} disabled={loading} />
                </Box>
              )}

              <Box>
                <FieldCaption>Registered mobile number</FieldCaption>
                <TextField
                  fullWidth hiddenLabel
                  placeholder="e.g. 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required autoFocus disabled={loading}
                  inputProps={{ inputMode: 'numeric', maxLength: 15 }}
                  sx={authFieldSx}
                />
                <Typography sx={{ color: AUTH.muted, fontSize: 12, mt: 1 }}>
                  {purpose === 'password'
                    ? 'We’ll send a 6-digit code to reset your password.'
                    : 'We’ll send a 6-digit code, then show your username.'}
                </Typography>
              </Box>

              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={authCtaSx}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Send code'}
              </Button>

              <Divider sx={{ mt: 2.5 }} />
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link component="button" type="button" variant="body2" underline="hover" onClick={switchPurpose}>
                  {purpose === 'password' ? 'Just need your username instead?' : '← I forgot my password instead'}
                </Link>
              </Box>
            </form>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <form onSubmit={verifyOtp}>
              <FieldCaption>6-digit code</FieldCaption>
              <TextField
                fullWidth hiddenLabel
                placeholder="Enter the code from the SMS"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required autoFocus disabled={loading}
                inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: '0.3em' } }}
                sx={authFieldSx}
              />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={authCtaSx}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify'}
              </Button>
              <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                <Link component="button" type="button" variant="body2" underline="hover" onClick={resetAll}>
                  Use a different number
                </Link>
              </Box>
            </form>
          )}

          {/* Step 3 — set new password */}
          {step === 'setpw' && (
            <form onSubmit={submitPassword}>
              <Box>
                <FieldCaption>New password</FieldCaption>
                <TextField
                  fullWidth hiddenLabel
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required autoFocus disabled={loading}
                  sx={authFieldSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((s) => !s)}
                          edge="end" tabIndex={-1}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <FieldCaption>Confirm new password</FieldCaption>
                <TextField
                  fullWidth hiddenLabel
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required disabled={loading}
                  sx={authFieldSx}
                />
              </Box>
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={authCtaSx}>
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
                    <Box component="div" sx={{ mt: 1, fontFamily: AUTH.serif, fontWeight: 700, fontSize: 22 }}>
                      {usernames.join(', ')}
                    </Box>
                  </Alert>
                  <Typography variant="body2" sx={{ color: AUTH.muted }}>
                    Use this to sign in. If you also forgot your password, choose “Reset your password”.
                  </Typography>
                </>
              ) : (
                <Alert severity="success">
                  Your password has been reset. You can now sign in with your new password.
                </Alert>
              )}
              <Button fullWidth variant="contained" size="large" onClick={() => navigate('/login')} sx={authCtaSx}>
                Back to sign in
              </Button>
            </Stack>
          )}

          {step !== 'done' && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link
                component="button" type="button" variant="body2" underline="hover"
                sx={{ color: AUTH.muted }}
                onClick={() => navigate('/login')}
              >
                ← Back to sign in
              </Link>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
