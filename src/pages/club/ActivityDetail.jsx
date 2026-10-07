import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Button, Chip, Card, CardContent, Grid, Alert, CircularProgress, Divider,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Breadcrumbs, Link, Menu,
} from '@mui/material';
import { clubService } from '../../services/clubService';
import { useCan } from '../../permissions/can';

const FIELDS = [
  ['learningOutcome', 'Learning outcome'], ['procedure', 'Procedure'], ['teacherPreparation', 'Teacher preparation'],
  ['riskSafety', 'Risk & safety'], ['assessmentChecklist', 'Assessment'], ['supportEnrichment', 'Support / enrichment'],
  ['relatedVocabulary', 'Vocabulary'], ['evidenceNote', 'Evidence'], ['cleanupStorage', 'Cleanup & storage'],
  ['materialQuantityPlan', 'Material quantity plan'],
];
const versionColor = (s) => (s === 'approved' ? 'success' : s === 'trial' ? 'info' : 'default');

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('club.activity.manage');
  const canApprove = can('club.activity.approve');
  const canReview = can('club.activity.review');
  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [edit, setEdit] = useState(false);
  const [availMenu, setAvailMenu] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setA(await clubService.getActivity(id)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, okMsg) => {
    setErr(''); setMsg('');
    try { await fn(); setMsg(okMsg); await load(); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Action failed'); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!a) return <Alert severity="error">Not found</Alert>;
  const v = a.currentVersion || {};
  const isDraft = v.status === 'draft';
  // The editable working copy: the current version if it's itself a draft, else a pending
  // revision draft (a.draftVersion). Null when there's nothing editable (approved, no draft).
  const draft = isDraft ? v : (a.draftVersion || null);

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link component="button" onClick={() => navigate('/club')}>Clubs</Link>
        <Link component="button" onClick={() => navigate(`/club/clubs/${a.clubId}/activities`)}>Activity Bank</Link>
        <Typography color="text.primary" sx={{ fontFamily: 'monospace' }}>{a.activityCode}</Typography>
      </Breadcrumbs>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>{v.title || a.activityCode}</Typography>
        <Chip label={`v${v.versionNo} · ${v.status}`} color={versionColor(v.status)} />
        <Chip label={a.availability} variant="outlined" />
        {canManage && draft && <Button size="small" variant="outlined" onClick={() => setEdit(true)}>Edit draft (v{draft.versionNo})</Button>}
        {canManage && !draft && <Button size="small" variant="outlined" onClick={() => act(() => clubService.createRevision(id), 'Revision created (draft)')}>Create revision</Button>}
        {canApprove && draft && <Button size="small" variant="contained" color="success" onClick={() => act(() => clubService.approve(id, draft.uuid), `Released v${draft.versionNo}`)}>Release v{draft.versionNo}</Button>}
        {canApprove && <Button size="small" onClick={(e) => setAvailMenu(e.currentTarget)}>Availability ▾</Button>}
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {draft && !isDraft && (
        <Alert severity="info" sx={{ mb: 2 }}>
          A draft <b>v{draft.versionNo}</b> is pending — use <b>Edit draft</b>, then <b>Release</b> when ready.
          Teachers keep seeing the approved v{v.versionNo} until then.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined"><CardContent>
            <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
              <Meta label="Level · Category" value={`${v.gradeLevel || '—'} · ${v.category || '—'}`} />
              <Meta label="Mode · Duration" value={`${v.activityMode || '—'}${v.estDuration ? ` · ${v.estDuration} min` : ''}`} />
              <Meta label="Difficulty" value={v.difficulty || '—'} />
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {FIELDS.map(([k, label]) => v[k] ? (
              <Box key={k} sx={{ mb: 1.5 }}>
                <Typography variant="overline" color="text.secondary">{label}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{v[k]}</Typography>
              </Box>
            ) : null)}
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ mb: 2 }}><CardContent>
            <Typography variant="overline" color="text.secondary">Materials</Typography>
            {(v.materials || []).length === 0 && <Typography variant="body2" color="text.secondary">None listed.</Typography>}
            {(v.materials || []).map((m, i) => (
              <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="body2">{m.item}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.quantityNote || ''}</Typography>
              </Stack>
            ))}
            {v.materialsSummary && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{v.materialsSummary}</Typography>}
          </CardContent></Card>
          <Card variant="outlined"><CardContent>
            <Typography variant="overline" color="text.secondary">Version history</Typography>
            {(a.versions || []).map((ver) => (
              <Stack key={ver.uuid} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                <Typography variant="body2">v{ver.versionNo}{ver.uuid === a.currentVersion?.uuid ? ' · current' : ''}</Typography>
                <Chip size="small" label={ver.status} color={versionColor(ver.status)} />
              </Stack>
            ))}
            {canReview && <Button size="small" sx={{ mt: 1 }} onClick={() => act(() => clubService.flagActivity(id, 'Flagged for review'), 'Flagged for review')}>Flag for review</Button>}
          </CardContent></Card>
        </Grid>
      </Grid>

      <Menu anchorEl={availMenu} open={!!availMenu} onClose={() => setAvailMenu(null)}>
        {['available', 'suspended', 'archived', 'planned'].map((av) => (
          <MenuItem key={av} disabled={av === a.availability} onClick={() => { setAvailMenu(null); act(() => clubService.setAvailability(id, av), `Set ${av}`); }}>{av}</MenuItem>
        ))}
      </Menu>

      {edit && draft && <EditDraftDialog activityId={a.uuid} version={draft} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); load(); }} />}
    </Box>
  );
}

const Meta = ({ label, value }) => (
  <Box><Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>{label}</Typography><Typography variant="body2">{value}</Typography></Box>
);

function EditDraftDialog({ activityId, version, onClose, onSaved }) {
  const v = version || {};
  const [form, setForm] = useState({
    title: v.title || '', gradeLevel: v.gradeLevel || '', category: v.category || '', activityMode: v.activityMode || '',
    estDuration: v.estDuration || '', learningOutcome: v.learningOutcome || '', procedure: v.procedure || '',
    teacherPreparation: v.teacherPreparation || '', riskSafety: v.riskSafety || '', supportEnrichment: v.supportEnrichment || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setErr('');
    try {
      await clubService.updateDraft(activityId, { ...form, estDuration: form.estDuration ? Number(form.estDuration) : undefined });
      onSaved();
    } catch (e) { setErr(e.response?.data?.error?.description || 'Save failed'); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit draft content</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Title" value={form.title} onChange={set('title')} /></Grid>
          <Grid item xs={6} sm={3}><TextField fullWidth size="small" label="Level" value={form.gradeLevel} onChange={set('gradeLevel')} /></Grid>
          <Grid item xs={6} sm={3}><TextField fullWidth size="small" label="Category" value={form.category} onChange={set('category')} /></Grid>
          <Grid item xs={6} sm={3}><TextField fullWidth size="small" label="Mode" value={form.activityMode} onChange={set('activityMode')} /></Grid>
          <Grid item xs={6} sm={3}><TextField fullWidth size="small" label="Duration (min)" value={form.estDuration} onChange={set('estDuration')} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Learning outcome" value={form.learningOutcome} onChange={set('learningOutcome')} multiline minRows={2} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Procedure" value={form.procedure} onChange={set('procedure')} multiline minRows={3} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Teacher preparation" value={form.teacherPreparation} onChange={set('teacherPreparation')} multiline minRows={2} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Risk & safety" value={form.riskSafety} onChange={set('riskSafety')} multiline minRows={2} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Support / enrichment" value={form.supportEnrichment} onChange={set('supportEnrichment')} multiline minRows={2} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || !form.title}>{busy ? 'Saving…' : 'Save draft'}</Button>
      </DialogActions>
    </Dialog>
  );
}
