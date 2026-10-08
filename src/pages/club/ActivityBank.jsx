import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Chip, Table, TableHead, TableRow, TableCell,
  TableBody, Card, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Breadcrumbs, Link, IconButton, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Download as DownloadIcon, Upload as UploadIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { clubService } from '../../services/clubService';
import { useCan } from '../../permissions/can';

const versionColor = (s) => (s === 'approved' ? 'success' : s === 'trial' ? 'info' : s === 'superseded' ? 'default' : 'default');
const availColor = (a) => (a === 'available' ? 'success' : a === 'suspended' ? 'warning' : a === 'archived' ? 'default' : 'default');

export default function ActivityBank() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('club.activity.manage');
  const [club, setClub] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ search: '', gradeLevel: '', versionStatus: '', availability: '' });
  const [newOpen, setNewOpen] = useState(false);
  const [importState, setImportState] = useState(null);
  const [history, setHistory] = useState(null);
  const fileRef = useRef(null);

  const openHistory = async () => {
    try { setHistory(await clubService.listImports(clubId)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load import history'); }
  };
  const downloadStored = async (importId) => {
    try {
      const out = await clubService.downloadImport(importId);
      const a = document.createElement('a');
      a.href = out.dataUri; a.download = out.fileName; a.click();
    } catch (e) { setErr(e.response?.data?.error?.description || 'Download failed'); }
  };

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [c, list] = await Promise.all([
        clubService.getClub(clubId),
        clubService.listActivities({ clubId, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }),
      ]);
      setClub(c); setRows(list);
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load bank'); }
    finally { setLoading(false); }
  }, [clubId, filters]);
  useEffect(() => { load(); }, [load]);

  const doExport = async () => {
    try {
      const out = await clubService.exportBank(clubId);
      const a = document.createElement('a');
      a.href = out.dataUri; a.download = out.fileName; a.click();
    } catch (e) { setErr(e.response?.data?.error?.description || 'Export failed'); }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = String(reader.result).replace(/^data:[^;]+;base64,/, '');
      try {
        const preview = await clubService.importPreview(clubId, base64);
        setImportState({ base64, fileName: file.name, preview });
      } catch (err) { setErr(err.response?.data?.error?.description || 'Import preview failed'); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const commitImport = async () => {
    try {
      await clubService.importCommit(clubId, importState.base64, importState.fileName);
      setImportState(null); load();
    } catch (e) { setErr(e.response?.data?.error?.description || 'Import failed'); }
  };

  if (loading && !club) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link component="button" onClick={() => navigate('/club')}>Clubs</Link>
        <Typography color="text.primary">{club?.displayName || club?.name}</Typography>
      </Breadcrumbs>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>Activity Bank</Typography>
        {can('club.activity.view') && <Button sx={{ mr: 1 }} onClick={openHistory}>Import history</Button>}
        {can('club.activity.view') && <Button sx={{ mr: 1 }} startIcon={<DownloadIcon />} onClick={doExport}>Export</Button>}
        {canManage && <Button sx={{ mr: 1 }} startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()}>Re-import</Button>}
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}>Activity</Button>}
        <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={onFile} />
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <TextField size="small" placeholder="Search title, outcome, material…" value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} sx={{ minWidth: 240 }} />
        <TextField size="small" label="Status" select value={filters.versionStatus} sx={{ minWidth: 130 }}
          onChange={(e) => setFilters((f) => ({ ...f, versionStatus: e.target.value }))}>
          {['', 'draft', 'trial', 'approved', 'superseded'].map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Availability" select value={filters.availability} sx={{ minWidth: 140 }}
          onChange={(e) => setFilters((f) => ({ ...f, availability: e.target.value }))}>
          {['', 'available', 'suspended', 'archived', 'planned'].map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
        </TextField>
      </Stack>

      <Card variant="outlined">
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell><TableCell>Activity</TableCell><TableCell>Level</TableCell>
                <TableCell>Category</TableCell><TableCell>Version</TableCell><TableCell>Availability</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.uuid} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/club/activities/${r.uuid}`)}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.activityCode}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{r.title}</TableCell>
                  <TableCell>{r.gradeLevel || '—'}</TableCell>
                  <TableCell>{r.category || '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {r.currentVersionStatus ? <Chip size="small" label={`v${r.currentVersionNo} · ${r.currentVersionStatus}`} color={versionColor(r.currentVersionStatus)} /> : '—'}
                      {r.pendingDraftNo && <Chip size="small" color="warning" variant="outlined" label={`v${r.pendingDraftNo} draft`} />}
                    </Stack>
                  </TableCell>
                  <TableCell><Chip size="small" label={r.availability} color={availColor(r.availability)} variant="outlined" /></TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/club/activities/${r.uuid}`)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={7}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No activities match.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
      </Card>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{rows.length} activities</Typography>

      {newOpen && <NewActivityDialog clubId={clubId} onClose={() => setNewOpen(false)} onSaved={(id) => { setNewOpen(false); navigate(`/club/activities/${id}`); }} />}

      {importState && (
        <Dialog open onClose={() => setImportState(null)} fullWidth maxWidth="sm">
          <DialogTitle>Import preview — {importState.fileName}</DialogTitle>
          <DialogContent>
            <Stack direction="row" spacing={2} sx={{ my: 1 }}>
              <Chip label={`${importState.preview.total} rows`} />
              <Chip color="success" label={`${importState.preview.added} new`} />
              <Chip color="info" label={`${importState.preview.updated} updated`} />
            </Stack>
            {importState.preview.errors?.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {importState.preview.errors.length} row error(s):
                <ul style={{ margin: '6px 0 0 16px' }}>{importState.preview.errors.slice(0, 8).map((er, i) => <li key={i}>Row {er.rowNo}: {er.message}</li>)}</ul>
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Updated/new activities arrive as hidden Drafts — release them from the activity page.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportState(null)}>Cancel</Button>
            <Button variant="contained" disabled={!importState.preview.valid} onClick={commitImport}>Import {importState.preview.total} rows</Button>
          </DialogActions>
        </Dialog>
      )}

      {history && (
        <Dialog open onClose={() => setHistory(null)} fullWidth maxWidth="md">
          <DialogTitle>Import history</DialogTitle>
          <DialogContent>
            <Table size="small">
              <TableHead><TableRow><TableCell>When</TableCell><TableCell>File</TableCell><TableCell>Rows</TableCell><TableCell>New</TableCell><TableCell>Updated</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.uuid}>
                    <TableCell>{h.createdAt ? String(h.createdAt).replace('T', ' ').slice(0, 16) : '—'}</TableCell>
                    <TableCell>{h.fileName || '—'}</TableCell>
                    <TableCell>{h.rowCount}</TableCell>
                    <TableCell>{h.addedCount}</TableCell>
                    <TableCell>{h.updatedCount}</TableCell>
                    <TableCell align="right"><Button size="small" startIcon={<DownloadIcon />} onClick={() => downloadStored(h.uuid)}>Download</Button></TableCell>
                  </TableRow>
                ))}
                {!history.length && <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No imports yet.</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions><Button onClick={() => setHistory(null)}>Close</Button></DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

function NewActivityDialog({ clubId, onClose, onSaved }) {
  const [form, setForm] = useState({ activityCode: '', title: '', gradeLevel: '', category: '', learningOutcome: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const res = await clubService.createActivity({
        clubId, activityCode: form.activityCode.trim(),
        content: { title: form.title.trim(), gradeLevel: form.gradeLevel || undefined, category: form.category || undefined, learningOutcome: form.learningOutcome || undefined },
      });
      onSaved(res.uuid);
    } catch (e) { setErr(e.response?.data?.error?.description || 'Create failed'); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New Activity (Draft)</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Activity code" value={form.activityCode} onChange={set('activityCode')} size="small" required helperText="Opaque, unique (e.g. SRI-NUR-001)" />
          <TextField label="Title" value={form.title} onChange={set('title')} size="small" required />
          <TextField label="Level / grade" value={form.gradeLevel} onChange={set('gradeLevel')} size="small" />
          <TextField label="Category" value={form.category} onChange={set('category')} size="small" />
          <TextField label="Learning outcome" value={form.learningOutcome} onChange={set('learningOutcome')} size="small" multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || !form.activityCode || !form.title}>{busy ? 'Saving…' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
