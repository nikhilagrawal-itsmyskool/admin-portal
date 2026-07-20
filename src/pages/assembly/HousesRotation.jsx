import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Button, Alert, Stack,
  Chip, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Divider,
} from '@mui/material';
import {
  Groups as StaffIcon, ArrowUpward, ArrowDownward, Block as SkipIcon, Save as SaveIcon,
} from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { studentService } from '../../services/studentService';
import { employeeService } from '../../services/employeeService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';

const arrayFrom = (r, ...keys) => (Array.isArray(r) ? r : keys.map((k) => r?.[k]).find(Array.isArray) || []);
const iso = (d) => d.toISOString().slice(0, 10);
const mondayOf = (d) => { const x = new Date(d); const dow = x.getUTCDay(); x.setUTCDate(x.getUTCDate() + (dow === 0 ? -6 : 1 - dow)); return iso(x); };
const addWeeks = (s, n) => { const x = new Date(`${s}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n * 7); return iso(x); };

function EmployeePicker({ label, value, onChange }) {
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const search = async (q) => {
    if (!q || q.length < 2) { setOpts([]); return; }
    setLoading(true);
    try {
      const r = await employeeService.searchEmployees({ name: q });
      setOpts(arrayFrom(r, 'employees', 'results').map((e) => ({ uuid: e.uuid, name: e.name })));
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  return (
    <Autocomplete
      size="small" options={opts} loading={loading}
      getOptionLabel={(o) => o.name || ''} isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
      value={value || null}
      onInputChange={(_e, v, reason) => { if (reason === 'input') search(v); }}
      onChange={(_e, v) => onChange(v)}
      renderInput={(p) => <TextField {...p} label={label} />}
    />
  );
}

export default function HousesRotation() {
  const can = useCan();
  const canManage = can('assembly.manage');

  const [houses, setHouses] = useState([]);
  const [error, setError] = useState('');
  const [staff, setStaff] = useState(null); // { house, incharge, coincharge, members } or null
  const [savingStaff, setSavingStaff] = useState(false);

  // Rotation calendar state.
  const [years, setYears] = useState([]);
  const [plans, setPlans] = useState([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [planId, setPlanId] = useState('');
  const [weeks, setWeeks] = useState([]);
  const [rangeStart, setRangeStart] = useState(mondayOf(new Date()));

  const loadHouses = useCallback(async () => {
    try { setHouses(await assemblyService.getHouses() || []); }
    catch { setError('Failed to load houses'); }
  }, []);

  useEffect(() => {
    (async () => {
      await loadHouses();
      try {
        const yrs = await academicCalendarService.getAcademicYears();
        const list = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(list);
        const cur = list.find((y) => y.isCurrent) || list[0];
        if (cur?.uuid) setAcademicYearId(cur.uuid);
      } catch { /* years optional */ }
    })();
  }, [loadHouses]);

  useEffect(() => {
    if (!academicYearId) return;
    (async () => {
      const p = (await assemblyService.getPlans({ academicYearId })) || [];
      setPlans(p);
      setPlanId((cur) => (p.find((x) => x.uuid === cur) ? cur : (p[0]?.uuid || '')));
    })();
  }, [academicYearId]);

  const loadRotation = useCallback(async () => {
    if (!planId) { setWeeks([]); return; }
    try {
      const from = rangeStart;
      const to = addWeeks(rangeStart, 11);
      setWeeks(await assemblyService.getRotation(planId, { from, to }) || []);
    } catch { setWeeks([]); }
  }, [planId, rangeStart]);
  useEffect(() => { loadRotation(); }, [loadRotation]);

  const inRotation = houses.filter((h) => h.rotationOrder != null).sort((a, b) => a.rotationOrder - b.rotationOrder);
  const notInRotation = houses.filter((h) => h.rotationOrder == null);

  // Reindex the rotation set contiguously and persist any changed orders.
  const persistOrder = async (ordered) => {
    setError('');
    try {
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].rotationOrder !== i) await assemblyService.setHouseRotation(ordered[i].houseId, i);
      }
      await loadHouses();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to update rotation order'); }
  };
  const move = (idx, dir) => {
    const next = [...inRotation];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    persistOrder(next);
  };
  const addToRotation = (houseId) => persistOrder([...inRotation, { houseId }]);
  const removeFromRotation = async (houseId) => {
    setError('');
    try { await assemblyService.setHouseRotation(houseId, null); await loadHouses(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to remove from rotation'); }
  };

  // ── Staff dialog ─────────────────────────────────────────────────────────────
  const openStaff = async (house) => {
    setError('');
    try {
      const { teachers } = await studentService.getHouseTeachers(house.houseId);
      const pick = (role) => { const t = teachers.find((x) => x.role === role); return t ? { uuid: t.employeeId, name: t.employeeName } : null; };
      setStaff({
        house,
        incharge: pick('incharge'),
        coincharge: pick('coincharge'),
        members: teachers.filter((t) => t.role === 'member').map((t) => ({ uuid: t.employeeId, name: t.employeeName })),
      });
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to load house staff'); }
  };
  const saveStaff = async () => {
    setSavingStaff(true); setError('');
    try {
      const teachers = [];
      if (staff.incharge) teachers.push({ employeeId: staff.incharge.uuid, role: 'incharge' });
      if (staff.coincharge) teachers.push({ employeeId: staff.coincharge.uuid, role: 'coincharge' });
      for (const m of staff.members) if (m?.uuid) teachers.push({ employeeId: m.uuid, role: 'member' });
      await studentService.setHouseTeachers(staff.house.houseId, teachers);
      setStaff(null);
      await loadHouses();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save house staff'); }
    finally { setSavingStaff(false); }
  };

  const houseChip = (h) => <Chip size="small" label={h.name} sx={h.color ? { bgcolor: h.color, color: '#fff' } : undefined} variant={h.color ? 'filled' : 'outlined'} />;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Houses &amp; Rotation</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Houses + leadership + rotation membership */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Houses</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>House</TableCell>
                <TableCell>In-charge</TableCell>
                <TableCell>Co-in-charge</TableCell>
                <TableCell align="center">Members</TableCell>
                <TableCell align="center">Rotation</TableCell>
                {canManage && <TableCell align="right">Staff</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {houses.map((h) => (
                <TableRow key={h.houseId}>
                  <TableCell>{houseChip(h)}</TableCell>
                  <TableCell>{h.inchargeName || <em style={{ color: '#999' }}>—</em>}</TableCell>
                  <TableCell>{h.coinchargeName || <em style={{ color: '#999' }}>—</em>}</TableCell>
                  <TableCell align="center">{h.teachers?.length || 0}</TableCell>
                  <TableCell align="center">
                    {h.rotationOrder != null
                      ? <Chip size="small" color="primary" label={`#${h.rotationOrder + 1}`} />
                      : canManage
                        ? <Button size="small" onClick={() => addToRotation(h.houseId)}>Add</Button>
                        : <em style={{ color: '#999' }}>—</em>}
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <Tooltip title="Edit in-charge / co-in-charge / members">
                        <IconButton size="small" onClick={() => openStaff(h)}><StaffIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {houses.length === 0 && (
                <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary">No houses. Create houses under Students → Houses.</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          {inRotation.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Rotation order</Typography>
              <Stack spacing={1}>
                {inRotation.map((h, idx) => (
                  <Stack key={h.houseId} direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ width: 28 }} color="text.secondary">#{idx + 1}</Typography>
                    {houseChip(h)}
                    <Box sx={{ flex: 1 }} />
                    {canManage && <>
                      <IconButton size="small" disabled={idx === 0} onClick={() => move(idx, -1)}><ArrowUpward fontSize="small" /></IconButton>
                      <IconButton size="small" disabled={idx === inRotation.length - 1} onClick={() => move(idx, 1)}><ArrowDownward fontSize="small" /></IconButton>
                      <Button size="small" color="error" onClick={() => removeFromRotation(h.houseId)}>Remove</Button>
                    </>}
                  </Stack>
                ))}
              </Stack>
              {notInRotation.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Not rotating: {notInRotation.map((h) => h.name).join(', ')}</Typography>}
            </>
          )}
        </CardContent>
      </Card>

      {/* Per-wing rotation calendar (week pins) */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Rotation calendar (per wing)</Typography>
          <Typography variant="caption" color="text.secondary">
            Pin a house to a week to set / re-anchor the cycle; skip a week (holiday) without shifting it. The earliest pin starts the cycle.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5, mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select size="small" label="Academic Year" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}{y.isCurrent ? ' (current)' : ''}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select size="small" label="Wing (plan)" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => <MenuItem key={p.uuid} value={p.uuid}>{p.name}</MenuItem>)}
                {plans.length === 0 && <MenuItem value="" disabled>No plans</MenuItem>}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setRangeStart(addWeeks(rangeStart, -4))}>◀ Earlier</Button>
                <Button size="small" onClick={() => setRangeStart(addWeeks(rangeStart, 4))}>Later ▶</Button>
              </Stack>
            </Grid>
          </Grid>

          {planId && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Week of (Mon)</TableCell>
                  <TableCell>House on duty</TableCell>
                  <TableCell>Source</TableCell>
                  {canManage && <TableCell align="right">Pin / skip</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {weeks.map((w) => (
                  <TableRow key={w.weekStart}>
                    <TableCell>{w.weekStart}</TableCell>
                    <TableCell>{w.houseName ? <Chip size="small" label={w.houseName} /> : <em style={{ color: '#999' }}>{w.source === 'skip' ? 'Skipped' : '—'}</em>}</TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={w.source} /></TableCell>
                    {canManage && (
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          <TextField
                            select size="small" value="" sx={{ minWidth: 120 }} SelectProps={{ displayEmpty: true }}
                            onChange={(e) => assemblyService.setWeekHouse(planId, w.weekStart, e.target.value).then(loadRotation).catch((err) => setError(err.response?.data?.error?.description || 'Failed'))}>
                            <MenuItem value="" disabled>Pin house…</MenuItem>
                            {inRotation.map((h) => <MenuItem key={h.houseId} value={h.houseId}>{h.name}</MenuItem>)}
                          </TextField>
                          <Tooltip title="Skip this week">
                            <IconButton size="small" onClick={() => assemblyService.setWeekHouse(planId, w.weekStart, null).then(loadRotation).catch((err) => setError(err.response?.data?.error?.description || 'Failed'))}><SkipIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {weeks.length === 0 && (
                  <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No rotation yet — pin a house to a week to start the cycle.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Staff dialog */}
      <Dialog open={Boolean(staff)} onClose={() => setStaff(null)} fullWidth maxWidth="sm">
        <DialogTitle>House staff — {staff?.house?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <EmployeePicker label="In-charge" value={staff?.incharge} onChange={(v) => setStaff((s) => ({ ...s, incharge: v }))} />
            <EmployeePicker label="Co-in-charge" value={staff?.coincharge} onChange={(v) => setStaff((s) => ({ ...s, coincharge: v }))} />
            <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Member teachers</Typography></Divider>
            {(staff?.members || []).map((m, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <EmployeePicker label={`Member ${i + 1}`} value={m} onChange={(v) => setStaff((s) => ({ ...s, members: s.members.map((x, j) => (j === i ? v : x)) }))} />
                </Box>
                <Button size="small" color="error" onClick={() => setStaff((s) => ({ ...s, members: s.members.filter((_, j) => j !== i) }))}>Remove</Button>
              </Stack>
            ))}
            <Button size="small" onClick={() => setStaff((s) => ({ ...s, members: [...s.members, null] }))} sx={{ alignSelf: 'flex-start' }}>Add member</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStaff(null)}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveStaff} disabled={savingStaff}>{savingStaff ? 'Saving…' : 'Save staff'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
