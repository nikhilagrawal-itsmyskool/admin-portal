import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { getSchoolCode } from '../config/api';
import TurnstileWidget from '../components/TurnstileWidget';
import { authPageSx, authCardSx, authFieldSx, authCtaSx, BrandHeader, FieldCaption } from '../components/auth/authKit';

const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY || '';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Public pairing page loaded inside the Skool Assistant app's WebView. It signs the manager in
// here (Turnstile works because this runs on the portal's own domain), binds the token to the
// app's deviceId, and posts { token, displayName, schoolCode } back to the native app. Opened in
// a plain browser (no ReactNativeWebView), it just confirms success.
export default function DeviceLogin() {
  const [params] = useSearchParams();
  const deviceId = params.get('deviceId') || '';
  const deviceLabel = params.get('label') || 'Front Desk';
  const schoolCode = getSchoolCode();

  const [form, setForm] = useState({ username: '', password: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const change = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/employee/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-School-Code': schoolCode },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
          turnstileToken,
          deviceId,
          deviceLabel,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.token) {
        const payload = JSON.stringify({ token: body.token, displayName: body.displayName || '', schoolCode });
        if (window.ReactNativeWebView?.postMessage) window.ReactNativeWebView.postMessage(payload);
        setDone(true);
      } else {
        setError(body?.error?.description || 'Sign in failed. Please try again.');
        setTurnstileToken('');
        setTurnstileKey((k) => k + 1);
      }
    } catch {
      setError('Network error. Please try again.');
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
          <BrandHeader title="Skool Assistant" sub="Pair this device" badge={schoolCode} />
          {done ? (
            <Alert severity="success" sx={{ mt: 1 }}>Device paired. You can close this and start asking.</Alert>
          ) : (
            <form onSubmit={submit}>
              {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
              <Box sx={{ mb: 2 }}>
                <FieldCaption>Username</FieldCaption>
                <TextField fullWidth hiddenLabel name="username" placeholder="Your login ID"
                  value={form.username} onChange={change} required autoFocus disabled={loading} sx={authFieldSx} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <FieldCaption>Password</FieldCaption>
                <TextField fullWidth hiddenLabel name="password" type="password" placeholder="Your password"
                  value={form.password} onChange={change} required disabled={loading} sx={authFieldSx} />
              </Box>
              <TurnstileWidget key={turnstileKey} sitekey={TURNSTILE_SITEKEY} onToken={setTurnstileToken} />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={authCtaSx}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
