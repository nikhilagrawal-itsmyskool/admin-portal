import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Tabs, Tab, Alert, Grid, TextField, MenuItem, Button,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { libraryService } from '../../../services/libraryService';

const LOOKUP_TYPES = [
  { value: 'color', label: 'Colors' },
  { value: 'age_band', label: 'Age bands' },
  { value: 'almirah', label: 'Almirahs' },
  { value: 'shelf', label: 'Shelves' },
  { value: 'edition', label: 'Editions' },
  { value: 'publisher', label: 'Publishers' },
  { value: 'source', label: 'Sources' },
];

export default function LibrarySettings() {
  const [tab, setTab] = useState(0);
  const [notice, setNotice] = useState(null);

  // Lookups
  const [lookupType, setLookupType] = useState('color');
  const [lookups, setLookups] = useState([]);
  const [draft, setDraft] = useState({ code: '', label: '', hex: '' });

  // Policy
  const [policy, setPolicy] = useState(null);

  useEffect(() => { if (tab === 0) loadLookups(); }, [lookupType, tab]);
  useEffect(() => { if (tab === 1 && !policy) loadPolicy(); }, [tab]);

  const loadLookups = async () => {
    try {
      const data = await libraryService.getLookups(lookupType);
      setLookups(data.lookups || []);
    } catch {
      setNotice({ severity: 'error', msg: 'Failed to load lookups' });
    }
  };

  const loadPolicy = async () => {
    try {
      setPolicy(await libraryService.getPolicy());
    } catch {
      setNotice({ severity: 'error', msg: 'Failed to load policy' });
    }
  };

  const addLookup = async () => {
    if (!draft.code.trim() || !draft.label.trim()) return;
    try {
      await libraryService.createLookup({
        lookupType,
        code: draft.code.trim(),
        label: draft.label.trim(),
        extra: lookupType === 'color' && draft.hex ? { hex: draft.hex } : undefined,
      });
      setDraft({ code: '', label: '', hex: '' });
      loadLookups();
    } catch (err) {
      setNotice({ severity: 'error', msg: err.response?.data?.error?.description || 'Failed to add' });
    }
  };

  const removeLookup = async (id) => {
    try {
      await libraryService.deleteLookup(id);
      loadLookups();
    } catch {
      setNotice({ severity: 'error', msg: 'Failed to delete' });
    }
  };

  const savePolicy = async () => {
    try {
      const num = (v) => (v === '' || v == null ? undefined : Number(v));
      const saved = await libraryService.updatePolicy({
        loanPeriodDays: num(policy.loanPeriodDays),
        maxCopiesPerBorrower: num(policy.maxCopiesPerBorrower),
        graceDays: num(policy.graceDays),
        overdueRatePerDay: num(policy.overdueRatePerDay),
        maxFineCap: num(policy.maxFineCap),
        renewLimit: num(policy.renewLimit),
        lostChargeMode: policy.lostChargeMode,
        lostChargeValue: num(policy.lostChargeValue),
      });
      setPolicy(saved);
      setNotice({ severity: 'success', msg: 'Policy saved' });
    } catch (err) {
      setNotice({ severity: 'error', msg: err.response?.data?.error?.description || 'Failed to save policy' });
    }
  };

  const pf = (field) => ({
    value: policy?.[field] ?? '',
    onChange: (e) => setPolicy({ ...policy, [field]: e.target.value }),
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Library Settings</Typography>
      {notice && <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice.msg}</Alert>}

      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Lookups" />
          <Tab label="Loan & Fine Policy" />
        </Tabs>
        <CardContent>
          {tab === 0 && (
            <>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}>
                  <TextField select fullWidth size="small" label="Type" value={lookupType} onChange={(e) => setLookupType(e.target.value)}>
                    {LOOKUP_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </TextField>
                </Grid>
              </Grid>

              {lookupType === 'color' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Colors map to the <b>DDC main class</b> (the first digit of the call number), so same-subject books shelve together.
                  e.g. 700s (arts &amp; sports) → red, 500s (science) → blue, 900s (history) → yellow. The color auto-fills when you pick a DDC; edit the swatch here to recolor a whole class.
                </Alert>
              )}

              <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={6} md={3}><TextField fullWidth size="small" label="Code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></Grid>
                <Grid item xs={6} md={4}><TextField fullWidth size="small" label="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></Grid>
                {lookupType === 'color' && (
                  <Grid item xs={6} md={2}><TextField fullWidth size="small" type="color" label="Color" InputLabelProps={{ shrink: true }} value={draft.hex || '#cccccc'} onChange={(e) => setDraft({ ...draft, hex: e.target.value })} /></Grid>
                )}
                <Grid item xs={6} md={2}><Button variant="outlined" startIcon={<AddIcon />} onClick={addLookup}>Add</Button></Grid>
              </Grid>

              <Table size="small">
                <TableHead>
                  <TableRow><TableCell>Code</TableCell><TableCell>Label</TableCell><TableCell>{lookupType === 'color' ? 'DDC class / color' : 'Extra'}</TableCell><TableCell align="right">Action</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {lookups.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">None yet</TableCell></TableRow>
                  ) : lookups.map((l) => (
                    <TableRow key={l.uuid}>
                      <TableCell>{l.code}</TableCell>
                      <TableCell>{l.label}</TableCell>
                      <TableCell>
                        {l.extra?.hex ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {l.extra?.ddcClass != null && <Chip size="small" variant="outlined" label={`${l.extra.ddcClass}00s`} />}
                            <Chip size="small" label={l.extra.hex} sx={{ backgroundColor: l.extra.hex, color: '#fff' }} />
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right"><IconButton size="small" color="error" onClick={() => removeLookup(l.uuid)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {tab === 1 && policy && (
            <Grid container spacing={2} sx={{ maxWidth: 720 }}>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Loan period (days)" {...pf('loanPeriodDays')} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Max copies per borrower" {...pf('maxCopiesPerBorrower')} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Renew limit" {...pf('renewLimit')} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Grace days" {...pf('graceDays')} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Overdue rate / day (₹)" {...pf('overdueRatePerDay')} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Max fine cap (₹)" {...pf('maxFineCap')} /></Grid>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth size="small" label="Lost charge mode" {...pf('lostChargeMode')}>
                  <MenuItem value="price">Book price</MenuItem>
                  <MenuItem value="fixed">Fixed amount</MenuItem>
                  <MenuItem value="multiplier">Price × multiplier</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="number" label="Lost charge value" helperText="₹ (fixed) or × (multiplier)" {...pf('lostChargeValue')} /></Grid>
              <Grid item xs={12}><Button variant="contained" startIcon={<SaveIcon />} onClick={savePolicy}>Save policy</Button></Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
