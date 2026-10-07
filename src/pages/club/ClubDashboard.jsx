import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea, Button, Chip, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, CircularProgress, IconButton, Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { clubService } from '../../services/clubService';
import { useCan } from '../../permissions/can';

const STATUSES = ['planned', 'active', 'inactive'];
const statusColor = (s) => (s === 'active' ? 'success' : s === 'planned' ? 'default' : 'warning');

export default function ClubDashboard() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('club.setup.manage');
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [dialog, setDialog] = useState(null); // null | {} (new) | club (edit)

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setClubs(await clubService.listClubs()); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load clubs'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Clubs &amp; Activities</Typography>
          <Typography variant="body2" color="text.secondary">One engine for every club — build the bank, plan the week, conduct & close.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<SettingsIcon />} sx={{ mr: 1 }} onClick={() => navigate('/club/settings')}>Settings</Button>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({})}>New Club</Button>}
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      <Grid container spacing={2}>
        {clubs.map((c) => (
          <Grid item xs={12} sm={6} md={4} key={c.uuid}>
            <Card variant="outlined">
              <CardActionArea onClick={() => navigate(`/club/clubs/${c.uuid}/activities`)}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'primary.main', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 20 }}>🎨</Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>{c.displayName || c.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{c.clubCode}</Typography>
                    </Box>
                    <Chip size="small" label={c.status} color={statusColor(c.status)} />
                  </Stack>
                  <Stack direction="row" spacing={3} sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Box><Typography variant="h6">{c.activityCount ?? 0}</Typography><Typography variant="caption" color="text.secondary">Activities</Typography></Box>
                    <Box><Typography variant="h6">{c.releasedCount ?? 0}</Typography><Typography variant="caption" color="text.secondary">Released</Typography></Box>
                    {c.inChargeName && <Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{c.inChargeName}</Typography><Typography variant="caption" color="text.secondary">In-charge</Typography></Box>}
                  </Stack>
                </CardContent>
              </CardActionArea>
              {canManage && (
                <Box sx={{ px: 1, pb: 1, textAlign: 'right' }}>
                  <IconButton size="small" onClick={() => setDialog(c)}><EditIcon fontSize="small" /></IconButton>
                </Box>
              )}
            </Card>
          </Grid>
        ))}
        {!clubs.length && <Grid item xs={12}><Alert severity="info">No clubs yet. {canManage ? 'Create your first club to get started.' : ''}</Alert></Grid>}
      </Grid>

      {dialog && <ClubFormDialog club={dialog.uuid ? dialog : null} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); }} />}
    </Box>
  );
}

function ClubFormDialog({ club, onClose, onSaved }) {
  const editing = !!club;
  const [form, setForm] = useState({
    clubCode: club?.clubCode || '', name: club?.name || '', displayName: club?.displayName || '',
    status: club?.status || 'active', applicableGrades: club?.applicableGrades || [],
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [gradeOptions, setGradeOptions] = useState([]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Grade suggestions come from THIS school's class master (data-driven, no hardcoded ladder).
  useEffect(() => { clubService.getGrades().then(setGradeOptions).catch(() => setGradeOptions([])); }, []);

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const body = {
        clubCode: form.clubCode.trim(), name: form.name.trim(), displayName: form.displayName.trim() || null,
        status: form.status,
        applicableGrades: form.applicableGrades,
      };
      if (editing) await clubService.updateClub(club.uuid, body);
      else await clubService.createClub(body);
      onSaved();
    } catch (e) { setErr(e.response?.data?.error?.description || 'Save failed'); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? 'Edit Club' : 'New Club'}</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Club code" value={form.clubCode} onChange={set('clubCode')} size="small" required disabled={editing} helperText="Unique, human-facing (e.g. SRI)" />
          <TextField label="Name" value={form.name} onChange={set('name')} size="small" required />
          <TextField label="Display name" value={form.displayName} onChange={set('displayName')} size="small" helperText='Shown to users (e.g. "SRIJAN Craft")' />
          <Autocomplete
            multiple freeSolo options={gradeOptions} value={form.applicableGrades}
            onChange={(_e, val) => setForm((f) => ({ ...f, applicableGrades: val }))}
            renderTags={(value, getTagProps) => value.map((option, index) => <Chip size="small" label={option} {...getTagProps({ index })} key={option} />)}
            renderInput={(params) => <TextField {...params} label="Applicable grades" size="small" placeholder="Pick or type…" helperText="Tap to add; type a custom one and press Enter" />}
          />
          <TextField label="Status" value={form.status} onChange={set('status')} size="small" select>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || !form.clubCode || !form.name}>{busy ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
