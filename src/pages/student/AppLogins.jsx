import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Paper, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, RadioGroup,
  FormControlLabel, Radio, CircularProgress, Stack, Select, MenuItem, FormControl, InputLabel,
  Switch, Divider,
} from '@mui/material';

// The per-family toggleable app features. Key must match the app's useFeatures + the
// backend. "Home" and profile are always on and not listed. Turning a feature OFF hides
// its tab / tile / card / Me-row in the parent app (e.g. mute Homework while fees are due).
const FEATURE_CATALOG = [
  { key: 'attendance', label: 'Attendance', desc: 'Daily attendance hero + history' },
  { key: 'fees', label: 'Fees', desc: 'Dues, receipts, what’s payable' },
  { key: 'homework', label: 'Homework', desc: 'Daily homework photos' },
  { key: 'timetable', label: 'Timetable', desc: 'Class timetable + live period' },
  { key: 'reportcard', label: 'Report Card', desc: 'Published report cards' },
  { key: 'exams', label: 'Exams', desc: 'Datesheet + exam attendance' },
  { key: 'assembly', label: 'Assembly', desc: 'Morning assembly + participation' },
  { key: 'syllabus', label: 'Syllabus', desc: 'Month-wise syllabus + coverage' },
  { key: 'notices', label: 'Notices', desc: 'In-app notices + alerts' },
  { key: 'transport', label: 'Transport', desc: 'Route, stop, driver details' },
  { key: 'calendar', label: 'Calendar', desc: 'School calendar — holidays & events' },
];

// Natural-ish class order (grade prefix → section): Nursery/LKG/UKG, then I..XII.
const GRADE_ORDER = ['NURSERY', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function classRank(cn) {
  const g = String(cn || '').split('-')[0].trim().toUpperCase();
  const i = GRADE_ORDER.indexOf(g);
  return i === -1 ? 99 : i;
}
import {
  Search, Visibility, VisibilityOff, LockReset, ContentCopy, Tune,
} from '@mui/icons-material';
import { studentService } from '../../services/studentService';

// Rough "last active" label from a device last_seen timestamp.
function timeAgo(iso) {
  if (!iso) return null;
  const t = new Date(String(iso).replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return null;
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return 'just now';
  const m = s / 60;
  if (m < 90) return `${Math.round(m)} min ago`;
  const h = m / 60;
  if (h < 36) return `${Math.round(h)} hr ago`;
  return `${Math.round(h / 24)} days ago`;
}

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
  const [featuresTarget, setFeaturesTarget] = useState(null);
  const [classFilter, setClassFilter] = useState('');
  const [sortBy, setSortBy] = useState('roll');

  const classes = useMemo(() => {
    const set = new Set();
    logins.forEach((l) => (l.students || []).forEach((s) => s.className && set.add(s.className)));
    return [...set].sort((a, b) => classRank(a) - classRank(b) || a.localeCompare(b));
  }, [logins]);

  const filtered = useMemo(
    () => (classFilter ? logins.filter((l) => (l.students || []).some((s) => s.className === classFilter)) : logins),
    [logins, classFilter],
  );

  // The child a family is sorted/labelled by: when a class is picked, that child; else the first.
  const focusChild = useCallback((l) => {
    const kids = l.students || [];
    if (classFilter) return kids.find((s) => s.className === classFilter) || kids[0] || null;
    return kids[0] || null;
  }, [classFilter]);

  // Roll-number sort is only meaningful within a selected class (keyed to the in-class child);
  // with no class we always sort by name.
  const effectiveSort = classFilter ? sortBy : 'name';
  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    if (effectiveSort === 'roll') {
      arr.sort((a, b) => {
        const ra = focusChild(a)?.rollNumber, rb = focusChild(b)?.rollNumber;
        if (ra == null && rb == null) return 0;
        if (ra == null) return 1;
        if (rb == null) return -1;
        return ra - rb;
      });
    } else {
      arr.sort((a, b) => (focusChild(a)?.name || a.username || '').toLowerCase()
        .localeCompare((focusChild(b)?.name || b.username || '').toLowerCase()));
    }
    return arr;
  }, [filtered, effectiveSort, focusChild]);

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

  const afterFeatures = (username, disabledFeatures) => {
    setLogins((ls) => ls.map((l) => (l.username === username ? { ...l, disabledFeatures } : l)));
    setFeaturesTarget((t) => (t && t.username === username ? { ...t, disabledFeatures } : t));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={800}>App Access</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Parent-app logins — one per family, keyed by the family&apos;s unique login number (here set to match their mobile). See the children each login opens, whether the app is installed, reveal the password, or reset it.
      </Typography>
      {!loading && logins.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={`📱 ${logins.filter((l) => l.deviceCount > 0).length} of ${logins.length} families have the app installed`}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Class</InputLabel>
          <Select label="Class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <MenuItem value=""><em>All classes</em></MenuItem>
            {classes.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField
          sx={{ flex: 1, minWidth: 220 }}
          placeholder={classFilter ? `Search within ${classFilter}…` : 'Search by family login number or student name…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Sort by</InputLabel>
          <Select label="Sort by" value={effectiveSort} onChange={(e) => setSortBy(e.target.value)} disabled={!classFilter}>
            {classFilter && <MenuItem value="roll">Roll number</MenuItem>}
            <MenuItem value="name">Name</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : sortedFiltered.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No logins found.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {sortedFiltered.map((l) => (
            <LoginCard
              key={l.username}
              login={l}
              revealed={!!revealed[l.username]}
              onToggle={() => setRevealed((r) => ({ ...r, [l.username]: !r[l.username] }))}
              onReset={() => setResetTarget(l)}
              onFeatures={() => setFeaturesTarget(l)}
            />
          ))}
        </Stack>
      )}

      <ResetDialog login={resetTarget} onClose={() => setResetTarget(null)} onDone={afterReset} />
      <FeaturesDialog login={featuresTarget} onClose={() => setFeaturesTarget(null)} onDone={afterFeatures} />
    </Box>
  );
}

function StudentChips({ students }) {
  if (!students || students.length === 0) {
    return <Chip size="small" color="warning" variant="outlined" label="No students linked" />;
  }
  return students.map((s) => (
    <Chip key={s.id} size="small" label={`${s.name}${s.className ? ` · ${s.className}` : ''}${s.rollNumber != null ? ` · Roll ${s.rollNumber}` : ''}`} />
  ));
}

function LoginCard({ login, revealed, onToggle, onReset, onFeatures }) {
  const copy = () => { try { navigator.clipboard?.writeText(login.password); } catch { /* ignore */ } };
  const offCount = (login.disabledFeatures || []).length;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 240 }}>
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }}>Family login</Typography>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'monospace', lineHeight: 1.2 }}>{login.username}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {login.students.length} {login.students.length === 1 ? 'child' : 'children'}
            </Typography>
            {login.deviceCount > 0 ? (
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`📱 App installed${timeAgo(login.lastSeen) ? ` · active ${timeAgo(login.lastSeen)}` : ''}${login.deviceCount > 1 ? ` · ${login.deviceCount} devices` : ''}`}
              />
            ) : (
              <Chip size="small" variant="outlined" label="Not installed" />
            )}
            {offCount > 0 && (
              <Chip size="small" color="warning" variant="outlined" label={`${offCount} feature${offCount > 1 ? 's' : ''} off`} />
            )}
          </Box>
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
            sx={{ width: 300 }}
          />
          <Button size="small" variant="outlined" startIcon={<Tune />} onClick={onFeatures}>Features</Button>
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

// Per-family feature toggles. A switch per feature (ON = visible in the app); saving
// stores the OFF keys as the login's disabledFeatures. e.g. mute Homework/Notices while
// fees are pending instead of blocking the whole app.
function FeaturesDialog({ login, onClose, onDone }) {
  const [enabled, setEnabled] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (login) {
      const off = new Set(login.disabledFeatures || []);
      const map = {};
      FEATURE_CATALOG.forEach((f) => { map[f.key] = !off.has(f.key); });
      setEnabled(map);
      setError('');
    }
  }, [login]);

  const dirty = useMemo(() => {
    if (!login) return false;
    const off = new Set(login.disabledFeatures || []);
    return FEATURE_CATALOG.some((f) => enabled[f.key] === off.has(f.key));
  }, [enabled, login]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const disabledFeatures = FEATURE_CATALOG.filter((f) => !enabled[f.key]).map((f) => f.key);
      const res = await studentService.setAppLoginFeatures({ username: login.username, disabledFeatures });
      onDone(res.username, res.disabledFeatures ?? disabledFeatures);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error?.description || 'Failed to save features');
    } finally {
      setBusy(false);
    }
  };

  const allOn = () => { const m = {}; FEATURE_CATALOG.forEach((f) => { m[f.key] = true; }); setEnabled(m); };

  return (
    <Dialog open={!!login} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>App features</DialogTitle>
      <DialogContent>
        {login && (
          <>
            <Typography variant="body2" color="text.secondary">
              Login <b style={{ fontFamily: 'monospace' }}>{login.username}</b> · {login.students.length}{' '}
              {login.students.length === 1 ? 'child' : 'children'}
              {login.deviceCount > 0 && timeAgo(login.lastSeen) ? ` · active ${timeAgo(login.lastSeen)}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1, mb: 1.5 }}>
              <StudentChips students={login.students} />
            </Box>
            <Alert severity="info" sx={{ mb: 1 }}>
              Turn a feature off to hide it in this family&apos;s app. Home stays visible. Parents are
              never blocked — mute sections rather than locking the app.
            </Alert>
            <Divider />
            {FEATURE_CATALOG.map((f) => (
              <Box
                key={f.key}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body2" fontWeight={700}>{f.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{f.desc}</Typography>
                </Box>
                <Switch
                  checked={!!enabled[f.key]}
                  onChange={(e) => setEnabled((m) => ({ ...m, [f.key]: e.target.checked }))}
                />
              </Box>
            ))}
            <Button size="small" onClick={allOn} sx={{ mt: 1 }}>Enable all</Button>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
