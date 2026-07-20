import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Button, Alert, Stack,
  Chip, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, HowToReg as SignoffIcon,
} from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';

const iso = (d) => d.toISOString().slice(0, 10);
const mondayOf = (d) => { const x = new Date(d); const dow = x.getUTCDay(); x.setUTCDate(x.getUTCDate() + (dow === 0 ? -6 : 1 - dow)); return iso(x); };
const addDays = (s, n) => { const x = new Date(`${s}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
const fmtShort = (s) => new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
const key = (itemId, date) => `${itemId}|${date || ''}`;

export default function ChecklistPage() {
  const can = useCan();
  const canManage = can('assembly.manage');

  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [dialog, setDialog] = useState(null); // create/edit item

  // Week ticking.
  const [years, setYears] = useState([]);
  const [plans, setPlans] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [planId, setPlanId] = useState('');
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [chk, setChk] = useState(null); // week checklist read model
  const [weekId, setWeekId] = useState('');
  const [checked, setChecked] = useState(new Set());
  const [busy, setBusy] = useState('');

  const loadItems = useCallback(async () => {
    try { setItems((await assemblyService.getChecklistItems())?.items || []); }
    catch { setError('Failed to load checklist items'); }
  }, []);

  useEffect(() => {
    (async () => {
      await loadItems();
      try {
        const yrs = await academicCalendarService.getAcademicYears();
        const list = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(list);
        const cur = list.find((y) => y.isCurrent) || list[0];
        if (cur?.uuid) setAcademicYearId(cur.uuid);
      } catch { /* years optional */ }
    })();
  }, [loadItems]);

  useEffect(() => {
    if (!academicYearId) return;
    (async () => {
      const p = (await assemblyService.getPlans({ academicYearId })) || [];
      setPlans(p);
      setPlanId((cur) => (p.find((x) => x.uuid === cur) ? cur : (p[0]?.uuid || '')));
    })();
  }, [academicYearId]);

  const loadWeek = useCallback(async () => {
    setChk(null); setWeekId(''); setChecked(new Set());
    if (!planId || !weekStart) return;
    try {
      const list = (await assemblyService.listWeeks(planId, { from: weekStart, to: weekStart })) || [];
      if (list.length === 0) return;
      const wid = list[0].uuid;
      setWeekId(wid);
      const c = await assemblyService.getWeekChecklist(wid);
      setChk(c);
      setChecked(new Set((c.ticks || []).map((t) => key(t.itemId, t.date))));
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load week checklist'); }
  }, [planId, weekStart]);
  useEffect(() => { loadWeek(); }, [loadWeek]);

  const toggle = (itemId, date) => setChecked((prev) => {
    const next = new Set(prev); const k = key(itemId, date);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  const saveTicks = async () => {
    setBusy('save'); setError(''); setMsg('');
    try {
      const ticks = [...checked].map((k) => { const [itemId, date] = k.split('|'); return { itemId, date: date || undefined }; });
      const c = await assemblyService.saveWeekChecklist(weekId, ticks);
      setChk(c); setChecked(new Set((c.ticks || []).map((t) => key(t.itemId, t.date)))); setMsg('Checklist saved');
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save checklist'); }
    finally { setBusy(''); }
  };

  const signoff = async () => {
    setBusy('signoff');
    try { const c = await assemblyService.signoffChecklist(weekId, ''); setChk(c); setMsg('Signed off'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to sign off'); }
    finally { setBusy(''); }
  };
  const clearSignoff = async () => {
    setBusy('signoff');
    try { const c = await assemblyService.clearChecklistSignoff(weekId); setChk(c); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed'); }
    finally { setBusy(''); }
  };

  // ── Item config ────────────────────────────────────────────────────────────
  const saveItem = async () => {
    setError('');
    try {
      const body = { phase: dialog.phase?.trim() || null, scope: dialog.scope, text: dialog.text.trim() };
      if (!body.text) { setError('Text is required'); return; }
      if (dialog.uuid) await assemblyService.updateChecklistItem(dialog.uuid, body);
      else await assemblyService.createChecklistItem(body);
      setDialog(null); await loadItems();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save item'); }
  };
  const deleteItem = async (id) => {
    try { await assemblyService.deleteChecklistItem(id); await loadItems(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to delete'); }
  };

  const weekItems = chk?.weekItems || [];
  const dayItems = chk?.dayItems || [];
  const dates = chk?.dates || [];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Assembly Checklist</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {/* Config */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>Checklist items</Typography>
            {canManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setDialog({ phase: '', scope: 'week', text: '' })}>Add item</Button>}
          </Stack>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Phase</TableCell><TableCell>Scope</TableCell><TableCell>Text</TableCell>
              {canManage && <TableCell align="right">Actions</TableCell>}
            </TableRow></TableHead>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.uuid}>
                  <TableCell>{it.phase || <em style={{ color: '#999' }}>—</em>}</TableCell>
                  <TableCell><Chip size="small" variant="outlined" label={it.scope} /></TableCell>
                  <TableCell>{it.text}</TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setDialog({ ...it })}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteItem(it.uuid)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No checklist items yet.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-week ticking */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Tick a week</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth select size="small" label="Academic Year" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}{y.isCurrent ? ' (current)' : ''}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth select size="small" label="Wing (plan)" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => <MenuItem key={p.uuid} value={p.uuid}>{p.name}</MenuItem>)}
                {plans.length === 0 && <MenuItem value="" disabled>No plans</MenuItem>}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button size="small" onClick={() => setWeekStart(addDays(weekStart, -7))}>◀</Button>
                <TextField size="small" type="date" label="Week of (Mon)" value={weekStart} onChange={(e) => setWeekStart(mondayOf(e.target.value))} InputLabelProps={{ shrink: true }} />
                <Button size="small" onClick={() => setWeekStart(addDays(weekStart, 7))}>▶</Button>
              </Stack>
            </Grid>
          </Grid>

          {!weekId && <Typography variant="body2" color="text.secondary">No roster week here yet — start it in Roster first.</Typography>}

          {weekId && chk && (
            <>
              {weekItems.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>Weekly</Typography>
                  <Stack sx={{ mb: 2 }}>
                    {weekItems.map((it) => (
                      <Stack key={it.uuid} direction="row" alignItems="center">
                        <Checkbox size="small" checked={checked.has(key(it.uuid, null))} onChange={() => toggle(it.uuid, null)} disabled={!canManage} />
                        <Typography variant="body2">{it.phase ? `${it.phase}: ` : ''}{it.text}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}

              {dayItems.length > 0 && dates.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>Per day</Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead><TableRow>
                        <TableCell>Item</TableCell>
                        {dates.map((d) => <TableCell key={d} align="center">{fmtShort(d)}</TableCell>)}
                      </TableRow></TableHead>
                      <TableBody>
                        {dayItems.map((it) => (
                          <TableRow key={it.uuid}>
                            <TableCell>{it.text}</TableCell>
                            {dates.map((d) => (
                              <TableCell key={d} align="center" padding="none">
                                <Checkbox size="small" checked={checked.has(key(it.uuid, d))} onChange={() => toggle(it.uuid, d)} disabled={!canManage} />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </>
              )}

              {weekItems.length === 0 && dayItems.length === 0 && <Typography variant="body2" color="text.secondary">No checklist items configured.</Typography>}

              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                {canManage && <Button variant="contained" startIcon={<SaveIcon />} onClick={saveTicks} disabled={busy === 'save'}>Save ticks</Button>}
                {chk.signoff
                  ? <Chip color="success" icon={<SignoffIcon />} label={`Signed off${chk.signoff.signedAt ? ` · ${new Date(chk.signoff.signedAt).toLocaleDateString()}` : ''}`} onDelete={canManage ? clearSignoff : undefined} />
                  : (canManage && <Tooltip title="Mark the week's checklist as signed off"><Button startIcon={<SignoffIcon />} onClick={signoff} disabled={busy === 'signoff'}>Sign off</Button></Tooltip>)}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Item dialog */}
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog?.uuid ? 'Edit checklist item' : 'Add checklist item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" label="Phase (optional)" placeholder="e.g. Before assembly" value={dialog?.phase || ''} onChange={(e) => setDialog({ ...dialog, phase: e.target.value })} />
            <TextField size="small" select label="Scope" value={dialog?.scope || 'week'} onChange={(e) => setDialog({ ...dialog, scope: e.target.value })}>
              <MenuItem value="week">Weekly (once per week)</MenuItem>
              <MenuItem value="day">Daily (per assembly date)</MenuItem>
            </TextField>
            <TextField size="small" label="Text" multiline minRows={2} value={dialog?.text || ''} onChange={(e) => setDialog({ ...dialog, text: e.target.value })} autoFocus />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveItem}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
