import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Alert, CircularProgress, Card, CardContent, Grid, Chip, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControlLabel, Switch, Snackbar,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { useCan } from '../../permissions/can';
import { useIsMobile } from '../../hooks/useIsMobile';

const PAID_LABEL = { yes: 'Paid', no: 'Unpaid', discretionary: 'Discretionary' };
const PAID_COLOR = { no: 'error', yes: 'success', discretionary: 'warning' };
const num = (v) => (v === null || v === undefined || v === '' ? '' : String(v));

export default function LeaveTypes() {
  const isMobile = useIsMobile();
  const can = useCan();
  const canManage = can('leave.manage');
  const [config, setConfig] = useState(null);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [editType, setEditType] = useState(null); // { code, name, annualQuota, attachmentOverDays, requiresAttachment, paid }
  const [capOpen, setCapOpen] = useState(false);
  const [capValue, setCapValue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [c, t] = await Promise.all([leaveService.getConfig(), leaveService.getTypes()]);
      setConfig(c); setTypes(t || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load policy');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openEdit = (t) => setEditType({
    code: t.code, name: t.name, annualQuota: num(t.annualQuota),
    attachmentOverDays: num(t.attachmentOverDays), requiresAttachment: !!t.requiresAttachment, paid: t.paid,
    showInBalance: t.showInBalance !== false,
  });

  const saveType = async () => {
    setBusy(true); setError('');
    try {
      await leaveService.updateType(editType.code, {
        annualQuota: editType.annualQuota === '' ? null : Number(editType.annualQuota),
        attachmentOverDays: editType.attachmentOverDays === '' ? null : Number(editType.attachmentOverDays),
        requiresAttachment: editType.requiresAttachment,
        showInBalance: editType.showInBalance,
        paid: editType.paid,
      });
      setEditType(null); setToast('Leave type updated'); load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not save');
    } finally { setBusy(false); }
  };

  const saveCap = async () => {
    setBusy(true); setError('');
    try {
      await leaveService.updateConfig({ dailyCap: Number(capValue) });
      setCapOpen(false); setToast('Daily cap updated'); load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not save');
    } finally { setBusy(false); }
  };

  const quotaLabel = (t) => (t.annualQuota != null ? `${t.annualQuota}/yr` : '—');
  const certLabel = (t) => (t.attachmentOverDays != null ? `if > ${t.attachmentOverDays}d` : (t.requiresAttachment ? 'Always' : '—'));

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Leave Types &amp; Policy</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {config && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4}>
                <Card variant="outlined"><CardContent sx={{ py: 1.5, position: 'relative' }}>
                  {canManage && (
                    <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4 }} onClick={() => { setCapValue(String(config.dailyCap)); setCapOpen(true); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                  <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{config.dailyCap}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>Max on Casual Leave / day</Typography>
                </CardContent></Card>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35 }}>Academic year</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>Allocation resets (31 Mar)</Typography>
                </CardContent></Card>
              </Grid>
            </Grid>
          )}

          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Leave types</Typography>
          {isMobile ? (
            <Stack spacing={1}>
              {types.map((t) => (
                <Card key={t.code} variant="outlined">
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{t.name} <Typography component="span" sx={{ color: 'text.disabled', fontWeight: 600 }}>({t.code})</Typography></Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          Quota {quotaLabel(t)} · Cert {certLabel(t)}{t.showInBalance === false ? ' · not in balance' : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Chip size="small" label={PAID_LABEL[t.paid] || t.paid} color={PAID_COLOR[t.paid] || 'default'} variant="outlined" />
                        {canManage && <IconButton size="small" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton>}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Card variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Leave type', 'Code', 'Annual quota', 'Pay', 'Certificate', ''].map((c, i) => (
                      <TableCell key={c || i} align={i === 5 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {types.map((t) => (
                    <TableRow key={t.code} hover>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {t.name}
                        {t.showInBalance === false && <Chip size="small" label="not in balance" sx={{ ml: 1, height: 18, fontSize: 10, bgcolor: '#eef1f7', color: '#5b6684' }} />}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{t.code}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{quotaLabel(t)}</TableCell>
                      <TableCell><Chip size="small" label={PAID_LABEL[t.paid] || t.paid} color={PAID_COLOR[t.paid] || 'default'} variant="outlined" /></TableCell>
                      <TableCell>{certLabel(t)}</TableCell>
                      <TableCell align="right">
                        {canManage && <IconButton size="small" title="Edit" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 2 }}>
            Annual quota is the days allowed per academic year (blank = unlimited). Certificate “if &gt; N days” means a document
            (e.g. medical certificate) is required only when the leave exceeds N working days.
          </Typography>
        </>
      )}

      {/* Edit leave type */}
      <Dialog open={!!editType} onClose={() => setEditType(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit — {editType?.name}</DialogTitle>
        <DialogContent>
          {editType && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField label="Annual quota (days) — blank = unlimited" type="number" size="small" value={editType.annualQuota}
                onChange={(e) => setEditType((f) => ({ ...f, annualQuota: e.target.value }))} InputProps={{ inputProps: { min: 0 } }} />
              <TextField label="Certificate required over (working days) — blank = none" type="number" size="small" value={editType.attachmentOverDays}
                onChange={(e) => setEditType((f) => ({ ...f, attachmentOverDays: e.target.value }))} InputProps={{ inputProps: { min: 0 } }} />
              <TextField select label="Pay" size="small" value={editType.paid} onChange={(e) => setEditType((f) => ({ ...f, paid: e.target.value }))}>
                <MenuItem value="yes">Paid</MenuItem>
                <MenuItem value="no">Unpaid</MenuItem>
                <MenuItem value="discretionary">Discretionary</MenuItem>
              </TextField>
              <FormControlLabel
                control={<Switch checked={editType.requiresAttachment} onChange={(e) => setEditType((f) => ({ ...f, requiresAttachment: e.target.checked }))} />}
                label="Always require a document (ignored when a day-threshold is set)"
              />
              <FormControlLabel
                control={<Switch checked={editType.showInBalance} onChange={(e) => setEditType((f) => ({ ...f, showInBalance: e.target.checked }))} />}
                label="Show as a balance card in the staff app (off = selectable but not advertised)"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditType(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveType} disabled={busy}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit daily cap */}
      <Dialog open={capOpen} onClose={() => setCapOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Max staff on Casual Leave per day</DialogTitle>
        <DialogContent>
          <TextField autoFocus type="number" size="small" fullWidth sx={{ mt: 1 }} label="Cap" value={capValue}
            onChange={(e) => setCapValue(e.target.value)} InputProps={{ inputProps: { min: 0 } }}
            helperText="A Casual Leave approval is blocked once this many staff already have CL for that date. Medical / emergency / bereavement leave is never capped." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCapOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCap} disabled={busy}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
