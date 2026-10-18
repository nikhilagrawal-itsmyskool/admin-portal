import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Paper, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, RadioGroup,
  FormControlLabel, Radio, CircularProgress, Stack,
} from '@mui/material';
import {
  Search, Visibility, VisibilityOff, LockReset, ContentCopy,
} from '@mui/icons-material';
import { studentService } from '../../services/studentService';

// Central "App Access" screen: every parent-app family login (username = family mobile),
// the children it opens, reveal the password, and reset it (auto or manual). No force-change —
// parents keep whatever password we set (per the product decision).
export default function AppLogins() {
  const [search, setSearch] = useState('');
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState({});
  const [resetTarget, setResetTarget] = useState(null);

  const load = useCallback(async (q) => {
    setLoading(true);
    setError('');
    try {
      const data = await studentService.getAppLogins(q);
      setLogins(data.logins || []);
    } catch (e) {
      setError(e.response?.data?.error?.description || 'Failed to load logins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const afterReset = (username, password) => {
    setLogins((ls) => ls.map((l) => (l.username === username ? { ...l, password } : l)));
    setRevealed((r) => ({ ...r, [username]: true }));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 920, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={800}>App Access</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Parent-app logins — one per family mobile number. See the children each login opens, reveal the password, or reset it.
      </Typography>

      <TextField
        fullWidth
        placeholder="Search by mobile number or student name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        sx={{ mb: 2 }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : logins.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No logins found.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {logins.map((l) => (
            <LoginCard
              key={l.username}
              login={l}
              revealed={!!revealed[l.username]}
              onToggle={() => setRevealed((r) => ({ ...r, [l.username]: !r[l.username] }))}
              onReset={() => setResetTarget(l)}
            />
          ))}
        </Stack>
      )}

      <ResetDialog login={resetTarget} onClose={() => setResetTarget(null)} onDone={afterReset} />
    </Box>
  );
}

function StudentChips({ students }) {
  if (!students || students.length === 0) {
    return <Chip size="small" color="warning" variant="outlined" label="No students linked" />;
  }
  return students.map((s) => (
    <Chip key={s.id} size="small" label={`${s.name}${s.className ? ` · ${s.className}` : ''}`} />
  ));
}

function LoginCard({ login, revealed, onToggle, onReset }) {
  const copy = () => { try { navigator.clipboard?.writeText(login.password); } catch { /* ignore */ } };
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 220 }}>
          <Typography variant="subtitle1" fontWeight={700}>{login.username}</Typography>
          <Typography variant="caption" color="text.secondary">
            {login.students.length} {login.students.length === 1 ? 'child' : 'children'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            <StudentChips students={login.students} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            label="Password"
            value={revealed ? login.password : '••••••'}
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace' },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={onToggle}>
                    {revealed ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                  {revealed && <IconButton size="small" onClick={copy}><ContentCopy fontSize="small" /></IconButton>}
                </InputAdornment>
              ),
            }}
            sx={{ width: 180 }}
          />
          <Button size="small" variant="outlined" color="warning" startIcon={<LockReset />} onClick={onReset}>Reset</Button>
        </Box>
      </Box>
    </Paper>
  );
}

function ResetDialog({ login, onClose, onDone }) {
  const [mode, setMode] = useState('auto');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (login) { setMode('auto'); setPassword(''); setError(''); setResult(null); }
  }, [login]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await studentService.resetAppLogin({
        username: login.username,
        mode,
        password: mode === 'manual' ? password.trim() : undefined,
      });
      setResult(res);
      onDone(res.username, res.password);
    } catch (e) {
      setError(e.response?.data?.error?.description || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!login} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reset password</DialogTitle>
      <DialogContent>
        {login && (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Login <b>{login.username}</b> opens the app for these children:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
              <StudentChips students={login.students} />
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>Confirm these are the right children before handing over the password.</Alert>

            {result ? (
              <Alert severity="success">
                New password for <b>{result.username}</b>:{' '}
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{result.password}</span>
              </Alert>
            ) : (
              <>
                <RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
                  <FormControlLabel value="auto" control={<Radio />} label="Auto-generate a password" />
                  <FormControlLabel value="manual" control={<Radio />} label="Set a specific password" />
                </RadioGroup>
                {mode === 'manual' && (
                  <TextField
                    fullWidth
                    label="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    helperText="At least 4 characters"
                    sx={{ mt: 1 }}
                  />
                )}
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {result ? (
          <Button variant="contained" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={submit}
              disabled={busy || (mode === 'manual' && password.trim().length < 4)}
            >
              {busy ? 'Resetting…' : 'Reset password'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
