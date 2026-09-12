import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Alert, CircularProgress, Chip, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  ToggleButtonGroup, ToggleButton, FormControlLabel, Switch, Snackbar, IconButton, Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, NotificationsActive as RemindIcon,
  Archive as ArchiveIcon, ChevronRight as ChevronIcon, Visibility as ViewIcon,
} from '@mui/icons-material';
import { documentService } from '../../services/documentService';
import { employeeService } from '../../services/employeeService';
import DocumentBody from './DocumentBody';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate } from '../../utils/date';

const SIGN_LABEL = { digital: 'Digital only', upload: 'Upload only', both: 'Digital + Upload' };
const CATEGORIES = ['policy', 'handbook', 'form', 'notice'];
const blankForm = {
  uuid: null, title: '', code: '', category: 'policy', summary: '', effectiveFrom: '',
  signModes: 'both', requiresAck: true, bodyHtml: '', status: 'published', bumpVersion: false, exemptRoles: [],
};

// Staff document handbook — manage list. Reading a document + who-signed is a full in-app
// screen (DocumentDetail at /documents/:id), not a popup. Authoring stays a dialog (desktop).
export default function StaffDocuments() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [form, setForm] = useState(null);       // editor dialog
  const [allRoles, setAllRoles] = useState([]); // role names, for the exempt-roles picker
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setDocs(await documentService.list() || []); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to load documents'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    employeeService.listRoles()
      .then((r) => {
        const list = Array.isArray(r) ? r : (r?.roles || r?.data || []);
        setAllRoles(list.map((x) => (typeof x === 'string' ? x : x.name)).filter(Boolean));
      })
      .catch(() => { /* roles optional for the picker */ });
  }, []);

  const openNew = () => setForm({ ...blankForm });
  const openEdit = async (d) => {
    setError('');
    try {
      const full = await documentService.get(d.uuid);
      setForm({
        uuid: full.uuid, title: full.title, code: full.code, category: full.category || 'policy',
        summary: full.summary || '', effectiveFrom: (full.effectiveFrom || '').slice(0, 10),
        signModes: full.signModes, requiresAck: full.requiresAck, bodyHtml: full.bodyHtml || '',
        status: full.status, bumpVersion: false, exemptRoles: full.exemptRoles || [],
      });
    } catch (err) { setError(err.response?.data?.error?.description || 'Could not open document'); }
  };

  const save = async () => {
    if (!form.title.trim() || !form.code.trim()) { setError('Title and code are required'); return; }
    setBusy(true); setError('');
    try {
      const payload = {
        title: form.title.trim(), code: form.code.trim(), category: form.category,
        summary: form.summary.trim() || undefined, effectiveFrom: form.effectiveFrom || undefined,
        signModes: form.signModes, requiresAck: form.requiresAck, bodyHtml: form.bodyHtml,
        status: form.status, exemptRoles: form.requiresAck ? (form.exemptRoles || []) : [],
      };
      if (form.uuid) await documentService.update(form.uuid, { ...payload, bumpVersion: form.bumpVersion });
      else await documentService.create(payload);
      setForm(null);
      setToast(form.uuid ? (form.bumpVersion ? 'Published new version — staff notified' : 'Saved') : 'Document created');
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Could not save');
    } finally { setBusy(false); }
  };

  const remind = async (d, e) => {
    if (e) e.stopPropagation();
    try { const r = await documentService.remind(d.uuid); setToast(`Reminder sent to ${r.notified} staff`); }
    catch (err) { setError(err.response?.data?.error?.description || 'Could not send reminder'); }
  };

  const archive = async (d, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Archive "${d.title}"? Staff will no longer see it.`)) return;
    try { await documentService.archive(d.uuid); setToast('Archived'); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Could not archive'); }
  };

  const open = (d) => navigate(`/documents/${d.uuid}`);
  const editFrom = (d, e) => { if (e) e.stopPropagation(); openEdit(d); };

  const pct = (d) => (d.requiredCount ? Math.round((d.signedCount / d.requiredCount) * 100) : 0);
  const statusChip = (d) => d.status === 'published'
    ? <Chip size="small" label={<span>Published <b>v{d.version}</b></span>} sx={{ bgcolor: '#e5f8f2', color: '#00916e', fontWeight: 700 }} />
    : <Chip size="small" label={d.status} sx={{ bgcolor: '#fff5e0', color: '#8a6400', fontWeight: 700, textTransform: 'capitalize' }} />;

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Staff Documents</Typography>
        {!isMobile && <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>New document</Button>}
      </Box>
      {isMobile && (
        <Alert severity="info" sx={{ mb: 2 }}>Tap a document to read it and see who has signed. Creating and editing is done on the desktop portal.</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : docs.length === 0 ? (
        <Alert severity="info">No documents yet.{!isMobile && ' Use "New document" to add one.'}</Alert>
      ) : isMobile ? (
        // Mobile: tappable compliance cards → in-app detail screen
        <Stack spacing={1.25}>
          {docs.map((d) => (
            <Card key={d.uuid} variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: '#3366ff' } }} onClick={() => open(d)}>
              <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#222b45' }}>{d.title}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {d.effectiveFrom ? `Effective ${fmtDate(d.effectiveFrom)} · ` : ''}v{d.version}
                    </Typography>
                  </Box>
                  <ChevronIcon sx={{ color: '#c3cad9' }} />
                </Box>
                {d.requiresAck && (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{d.signedCount} / {d.requiredCount} signed</Typography>
                      {d.signedCount >= d.requiredCount && d.requiredCount > 0
                        ? <Chip size="small" label="Complete" sx={{ bgcolor: '#e5f8f2', color: '#00916e', fontWeight: 700 }} />
                        : <Chip size="small" label={`${d.requiredCount - d.signedCount} pending`} sx={{ bgcolor: '#fff5e0', color: '#8a6400', fontWeight: 700 }} />}
                    </Box>
                    <LinearProgress variant="determinate" value={pct(d)} sx={{ height: 7, borderRadius: 6 }} />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        // Desktop: manage table — click a row to open the detail screen
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Document', 'Category', 'Sign mode', 'Signed', 'Status', 'Actions'].map((c, i) => (
                  <TableCell key={c} align={i === 5 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>{c}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.uuid} hover sx={{ cursor: 'pointer' }} onClick={() => open(d)}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700, color: '#274bdb', fontSize: 13.5 }}>{d.title}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{d.effectiveFrom ? `Effective ${fmtDate(d.effectiveFrom)}` : 'No effective date'}</Typography>
                  </TableCell>
                  <TableCell><Chip size="small" label={d.category} sx={{ bgcolor: '#eef1f7', color: '#5b6684', textTransform: 'capitalize' }} /></TableCell>
                  <TableCell>{d.requiresAck ? <Chip size="small" variant="outlined" color="primary" label={SIGN_LABEL[d.signModes]} /> : <Chip size="small" label="Read only" sx={{ bgcolor: '#eef1f7', color: '#5b6684' }} />}</TableCell>
                  <TableCell>
                    {d.requiresAck ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                        <Box sx={{ flex: 1 }}><LinearProgress variant="determinate" value={pct(d)} sx={{ height: 7, borderRadius: 6 }} /></Box>
                        <Typography sx={{ fontSize: 12, color: '#5b6684', fontVariantNumeric: 'tabular-nums' }}>{d.signedCount}/{d.requiredCount}</Typography>
                      </Box>
                    ) : <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>}
                  </TableCell>
                  <TableCell>{statusChip(d)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" title="Open" color="primary" onClick={(e) => { e.stopPropagation(); open(d); }}><ViewIcon fontSize="small" /></IconButton>
                      <IconButton size="small" title="Edit" onClick={(e) => editFrom(d, e)}><EditIcon fontSize="small" /></IconButton>
                      {d.requiresAck && <IconButton size="small" title="Remind pending" onClick={(e) => remind(d, e)}><RemindIcon fontSize="small" /></IconButton>}
                      <IconButton size="small" title="Archive" onClick={(e) => archive(d, e)}><ArchiveIcon fontSize="small" /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Editor dialog (desktop authoring) */}
      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="md">
        <DialogTitle>{form?.uuid ? 'Edit document' : 'New document'}</DialogTitle>
        <DialogContent dividers>
          {form && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} sx={{ flex: 2, minWidth: 240 }} size="small" required />
                <TextField label="Code (stable key)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} sx={{ flex: 1, minWidth: 160 }} size="small" required disabled={!!form.uuid} helperText={form.uuid ? 'Fixed once created' : 'e.g. staff_leave_policy'} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} sx={{ minWidth: 150 }} size="small">
                  {CATEGORIES.map((c) => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>)}
                </TextField>
                <TextField type="date" label="Effective from" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} InputLabelProps={{ shrink: true }} size="small" />
                <TextField select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} sx={{ minWidth: 140 }} size="small">
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </TextField>
              </Box>
              <TextField label="Summary (optional)" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} size="small" />
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>Signing options</Typography>
                <ToggleButtonGroup exclusive size="small" value={form.signModes} onChange={(_, v) => v && setForm((f) => ({ ...f, signModes: v }))}>
                  <ToggleButton value="both">Digital + Upload</ToggleButton>
                  <ToggleButton value="digital">Digital only</ToggleButton>
                  <ToggleButton value="upload">Upload only</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <FormControlLabel
                control={<Switch checked={form.requiresAck} onChange={(e) => setForm((f) => ({ ...f, requiresAck: e.target.checked }))} />}
                label="Requires signature (staff must read & sign)"
              />
              {form.requiresAck && (
                <Autocomplete
                  multiple options={allRoles} value={form.exemptRoles || []}
                  onChange={(_, v) => setForm((f) => ({ ...f, exemptRoles: v }))}
                  renderInput={(params) => (
                    <TextField {...params} size="small" label="Roles exempt from signing (optional)"
                      helperText="Staff with these roles still see the document under My Documents, but are not required to sign it." />
                  )}
                />
              )}
              <TextField
                label="Document body (HTML)" value={form.bodyHtml} onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
                multiline minRows={8} size="small"
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: 12.5 } }}
                helperText="This is what staff read and print. Headings <h3>, lists <ul><li>, tables class='doc-table'."
              />
              {form.bodyHtml && (
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Preview</Typography>
                  <Card variant="outlined" sx={{ maxHeight: 260, overflow: 'auto' }}><CardContent><DocumentBody html={form.bodyHtml} /></CardContent></Card>
                </Box>
              )}
              {form.uuid && (
                <Alert severity={form.bumpVersion ? 'warning' : 'info'}>
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={<Switch checked={form.bumpVersion} onChange={(e) => setForm((f) => ({ ...f, bumpVersion: e.target.checked }))} />}
                    label={form.bumpVersion
                      ? 'Publish as a NEW version — everyone must sign again; the old version is kept for the record.'
                      : 'Save as a cosmetic fix (same version — existing signatures stay valid).'}
                  />
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={busy}>
            {form?.uuid ? (form?.bumpVersion ? 'Publish new version' : 'Save') : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={2800} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
