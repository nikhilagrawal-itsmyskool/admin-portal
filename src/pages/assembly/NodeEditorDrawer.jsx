import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, TextField, Button, Chip, Stack, Divider, IconButton,
  MenuItem, Autocomplete, Alert, Grid, Tooltip, Switch, FormControlLabel,
} from '@mui/material';
import {
  Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon,
} from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { employeeService } from '../../services/employeeService';
import { studentService } from '../../services/studentService';

const arrayFrom = (r, ...keys) => (Array.isArray(r) ? r : keys.map((k) => r?.[k]).find(Array.isArray) || []);

// Picks the target for one responsible row, by type.
function TargetPicker({ type, targetId, targetName, targetText, onChange, classOptions, academicYearId }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    if (type !== 'employee' && type !== 'student') return;
    if (!q || q.length < 2) { setOptions([]); return; }
    setLoading(true);
    try {
      if (type === 'employee') {
        const r = await employeeService.searchEmployees({ name: q });
        setOptions(arrayFrom(r, 'employees', 'results').map((e) => ({ uuid: e.uuid, name: e.name })));
      } else {
        const r = await studentService.searchStudents({ name: q, academicYearId });
        setOptions(arrayFrom(r, 'students', 'results').map((s) => ({ uuid: s.uuid, name: s.name, className: s.className || s.class_name })));
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  if (type === 'text') {
    return (
      <TextField size="small" fullWidth placeholder="e.g. House Captains" value={targetText || ''}
        onChange={(e) => onChange({ targetText: e.target.value, targetId: null, targetName: null })} />
    );
  }

  const staticOpts = type === 'class' ? classOptions : options;
  const value = targetId ? { uuid: targetId, name: targetName || '' } : null;
  return (
    <Autocomplete
      size="small" fullWidth
      options={staticOpts}
      loading={loading}
      getOptionLabel={(o) => o.name || ''}
      isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
      renderOption={(props, o) => (
        <li {...props} key={o.uuid}>{o.name}{o.className ? <span style={{ color: '#8f9bb3', marginLeft: 4 }}>({o.className})</span> : ''}</li>
      )}
      value={value}
      onInputChange={(_e, v, reason) => { if (reason === 'input') search(v); }}
      onChange={(_e, v) => onChange({ targetId: v?.uuid || null, targetName: v?.name || null, targetText: null })}
      renderInput={(params) => <TextField {...params} placeholder={`Select ${type}`} />}
    />
  );
}

export default function NodeEditorDrawer({
  open, node, onClose, onSaved, weekdays, roles, targetTypes, parentEffectiveDays, classOptions, academicYearId,
  hideDays = false, houseMode = false,
}) {
  const [form, setForm] = useState({});
  const [days, setDays] = useState([]);
  const [resp, setResp] = useState([]);
  const [res, setRes] = useState([]);
  const [dayContent, setDayContent] = useState({}); // { mon: '…', tue: '…' }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (!node) return;
    setForm({
      title: node.title || '', description: node.description || '', expectation: node.expectation || '',
      recommendation: node.recommendation || '', outcome: node.outcome || '',
      startTime: node.startTime || '', durationMinutes: node.durationMinutes ?? '',
      dynamicSource: node.dynamicSource || '',
    });
    setDayContent(Object.fromEntries((node.dayContent || []).map((c) => [c.weekday, c.content || ''])));
    setDays(node.days || []);
    setResp((node.responsible || []).map((r) => ({
      role: r.role || '', targetType: r.targetType, targetId: r.targetId || null,
      targetName: r.targetName || null, targetText: r.targetText || null,
    })));
    setRes((node.resources || []).map((x) => ({ label: x.label || '', url: x.url || '', note: x.note || '' })));
    setError('');
  }, [node?.uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!node) return null;
  const ceiling = parentEffectiveDays || [];

  const run = async (key, fn) => {
    setBusy(key); setError('');
    try { await fn(); onSaved?.(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Save failed'); }
    finally { setBusy(''); }
  };

  const saveContent = () => run('content', async () => {
    await assemblyService.updateNode(node.uuid, {
      title: form.title, description: form.description, expectation: form.expectation,
      recommendation: form.recommendation, outcome: form.outcome,
      startTime: form.startTime || null,
      durationMinutes: form.durationMinutes === '' ? null : Number(form.durationMinutes),
      dynamicSource: form.dynamicSource || null,
    });
  });

  const toggleDay = (value) => {
    if (!ceiling.includes(value)) return; // subset guard
    const next = days.includes(value) ? days.filter((d) => d !== value) : [...days, value];
    setDays(next);
    run('days', () => assemblyService.setNodeDays(node.uuid, next));
  };

  const saveResp = () => run('resp', async () => {
    const payload = resp
      .filter((r) => r.targetType === 'text' ? (r.targetText || '').trim() : r.targetId)
      .map((r) => r.targetType === 'text'
        ? { role: r.role || undefined, targetType: 'text', targetText: r.targetText.trim() }
        : { role: r.role || undefined, targetType: r.targetType, targetId: r.targetId });
    await assemblyService.setNodeResponsible(node.uuid, payload);
  });

  const saveRes = () => run('res', async () => {
    const payload = res.filter((x) => x.label.trim() || x.url.trim() || x.note.trim());
    await assemblyService.setNodeResources(node.uuid, payload);
  });

  const saveDayContent = () => run('dayContent', async () => {
    const content = weekdays
      .map((w) => ({ weekday: w.value, content: (dayContent[w.value] || '').trim() }))
      .filter((c) => c.content);
    await assemblyService.setNodeDayContent(node.uuid, content);
  });

  const setRespAt = (i, patch) => setResp((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setResAt = (i, patch) => setRes((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, p: 2 } }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Edit node</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Content */}
      <Typography variant="subtitle2" gutterBottom>Content</Typography>
      <Stack spacing={1.5}>
        <TextField size="small" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <TextField size="small" label="Description" multiline minRows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <TextField size="small" label="Expectation" value={form.expectation} onChange={(e) => setForm({ ...form, expectation: e.target.value })} />
        <TextField size="small" label="Recommendation" value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} />
        <TextField size="small" label="Outcome" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
        <Grid container spacing={1}>
          <Grid item xs={6}><TextField size="small" fullWidth label="Start time" placeholder="HH:MM" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField size="small" fullWidth type="number" label="Duration (min)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /></Grid>
        </Grid>
        <TextField size="small" select label="Auto-fill" value={form.dynamicSource || ''}
          onChange={(e) => setForm({ ...form, dynamicSource: e.target.value })}
          helperText="Auto-populate this node from live data when the assembly is viewed">
          <MenuItem value="">None</MenuItem>
          <MenuItem value="birthday">Today’s birthdays (students + staff)</MenuItem>
        </TextField>
        <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={saveContent} disabled={busy === 'content'} sx={{ alignSelf: 'flex-start' }}>Save content</Button>
      </Stack>

      {houseMode && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>Weekday content (the daily focus)</Typography>
          <Typography variant="caption" color="text.secondary">
            What this segment presents each day (e.g. Mon “Word of the Day”, Wed “Doha, Sukti…”). The house sees this as a hint in the roster and fills the actual content. Leave a day blank if it has no set focus.
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {weekdays.filter((w) => w.value !== 'sun').map((w) => (
              <TextField key={w.value} size="small" label={w.label} value={dayContent[w.value] || ''}
                onChange={(e) => setDayContent({ ...dayContent, [w.value]: e.target.value })} />
            ))}
            <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={saveDayContent} disabled={busy === 'dayContent'} sx={{ alignSelf: 'flex-start' }}>Save weekday content</Button>
          </Stack>
        </>
      )}

      {!hideDays && (
        <>
          <Divider sx={{ my: 2 }} />

          {/* Days */}
          <Typography variant="subtitle2" gutterBottom>Weekdays</Typography>
          <Typography variant="caption" color="text.secondary">
            Empty = inherits parent ({ceiling.join(', ') || 'none'}). You can only pick days the parent runs.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {weekdays.map((w) => {
              const allowed = ceiling.includes(w.value);
              const on = days.includes(w.value);
              return (
                <Tooltip key={w.value} title={allowed ? '' : 'Parent does not run this day'}>
                  <span>
                    <Chip label={w.label} size="small" disabled={!allowed}
                      color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'}
                      onClick={() => toggleDay(w.value)} clickable={allowed} />
                  </span>
                </Tooltip>
              );
            })}
          </Stack>
        </>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Responsible */}
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>Responsible</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setResp([...resp, { role: '', targetType: 'text', targetText: '' }])}>Add</Button>
      </Stack>
      <Stack spacing={1.5}>
        {resp.map((r, i) => (
          <Box key={i} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={5}>
                <Autocomplete size="small" freeSolo options={roles.map((x) => x.value)} value={r.role}
                  onInputChange={(_e, v) => setRespAt(i, { role: v })}
                  renderInput={(p) => <TextField {...p} placeholder="Role" />} />
              </Grid>
              <Grid item xs={5}>
                <TextField size="small" select fullWidth value={r.targetType}
                  onChange={(e) => setRespAt(i, { targetType: e.target.value, targetId: null, targetName: null, targetText: null })}>
                  {targetTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={2} textAlign="right">
                <IconButton size="small" color="error" onClick={() => setResp(resp.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton>
              </Grid>
              <Grid item xs={12}>
                <TargetPicker type={r.targetType} targetId={r.targetId} targetName={r.targetName} targetText={r.targetText}
                  onChange={(patch) => setRespAt(i, patch)} classOptions={classOptions} academicYearId={academicYearId} />
              </Grid>
            </Grid>
          </Box>
        ))}
        <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={saveResp} disabled={busy === 'resp'} sx={{ alignSelf: 'flex-start' }}>Save responsible</Button>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Resources */}
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>Resources</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setRes([...res, { label: '', url: '', note: '' }])}>Add</Button>
      </Stack>
      <Stack spacing={1.5}>
        {res.map((x, i) => (
          <Box key={i} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={10}><TextField size="small" fullWidth label="Label" value={x.label} onChange={(e) => setResAt(i, { label: e.target.value })} /></Grid>
              <Grid item xs={2} textAlign="right"><IconButton size="small" color="error" onClick={() => setRes(res.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton></Grid>
              <Grid item xs={12}><TextField size="small" fullWidth label="URL" value={x.url} onChange={(e) => setResAt(i, { url: e.target.value })} /></Grid>
              <Grid item xs={12}><TextField size="small" fullWidth label="Note" value={x.note} onChange={(e) => setResAt(i, { note: e.target.value })} /></Grid>
            </Grid>
          </Box>
        ))}
        <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={saveRes} disabled={busy === 'res'} sx={{ alignSelf: 'flex-start' }}>Save resources</Button>
      </Stack>
    </Drawer>
  );
}
