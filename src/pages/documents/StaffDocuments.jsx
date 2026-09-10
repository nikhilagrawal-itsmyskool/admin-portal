import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert, CircularProgress, Chip, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  ToggleButtonGroup, ToggleButton, FormControlLabel, Switch, Divider, Snackbar, IconButton,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Groups as WhoIcon, NotificationsActive as RemindIcon,
  Archive as ArchiveIcon, Close as CloseIcon, Visibility as ViewIcon,
} from '@mui/icons-material';
import { documentService } from '../../services/documentService';
import DocumentBody from './DocumentBody';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmtDate } from '../../utils/date';

const SIGN_LABEL = { digital: 'Digital only', upload: 'Upload only', both: 'Digital + Upload' };
const CATEGORIES = ['policy', 'handbook', 'form', 'notice'];
const blankForm = {
  uuid: null, title: '', code: '', category: 'policy', summary: '', effectiveFrom: '',
  signModes: 'both', requiresAck: true, bodyHtml: '', status: 'published', bumpVersion: false,
};

export default function StaffDocuments() {
  const isMobile = useIsMobile();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [form, setForm] = useState(null);       // editor dialog
  const [busy, setBusy] = useState(false);
  const [whoDoc, setWhoDoc] = useState(null);    // who-signed dialog target
  const [acks, setAcks] = useState(null);
  const [readDoc, setReadDoc] = useState(null);  // read-policy dialog

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setDocs(await documentService.list() || []); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to load documents'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => setForm({ ...blankForm });
  const openEdit = async (d) => {
    setError('');
    try {
      const full = await documentService.get(d.uuid);
      setForm({
        uuid: full.uuid, title: full.title, code: full.code, category: full.category || 'policy',
        summary: full.summary || '', effectiveFrom: (full.effectiveFrom || '').slice(0, 10),
        signModes: full.signModes, requiresAck: full.requiresAck, bodyHtml: full.bodyHtml || '',
        status: full.status, bumpVersion: false,
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
        status: form.status,
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

  const openWho = async (d) => {
    setWhoDoc(d); setAcks(null);
    try { setAcks(await documentService.acks(d.uuid)); }
    catch (err) { setError(err.response?.data?.error?.description || 'Could not load signatures'); }
  };

  const remind = async (d) => {
    try { const r = await documentService.remind(d.uuid); setToast(`Reminder sent to ${r.notified} staff`); }
    catch (err) { setError(err.response?.data?.error?.description || 'Could not send reminder'); }
  };

  const archive = async (d) => {
    if (!window.confirm(`Archive "${d.title}"? Staff will no longer see it.`)) return;
    try { await documentService.archive(d.uuid); setToast('Archived'); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Could not archive'); }
  };

  const viewArtifact = async (row) => {
    const which = row.hasSignedPage ? 'page' : 'signature';
    try {
      const art = await documentService.ackArtifact(row.ackId, which);
      if (art?.dataUri) {
        const w = window.open('', '_blank');
        if (w) w.document.write(`<title>${row.employeeName}</title><iframe src="${art.dataUri}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>`);
      }
    } catch (err) { setError(err.response?.data?.error?.description || 'Could not open'); }
  };

  const openRead = async (d) => {
    setReadDoc({ ...d, bodyHtml: null });
    try { setReadDoc(await documentService.get(d.uuid)); }
    catch (err) { setError(err.response?.data?.error?.description || 'Could not open document'); }
  };

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
        <Alert severity="info" sx={{ mb: 2 }}>Read policies and track who has signed. Creating and editing is done on the desktop portal.</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : docs.length === 0 ? (
        <Alert severity="info">No documents yet.{!isMobile && ' Use "New document" to add one.'}</Alert>
      ) : isMobile ? (
        // Mobile: read-only compliance cards
        <Stack spacing={1.25}>
          {docs.map((d) => (
            <Card key={d.uuid} variant="outlined">
              <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#222b45' }}>{d.title}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
                  {d.effectiveFrom ? `Effective ${fmtDate(d.effectiveFrom)} · ` : ''}v{d.version}
                </Typography>
                {d.requiresAck && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{d.signedCount} / {d.requiredCount} signed</Typography>
                      {d.signedCount >= d.requiredCount && d.requiredCount > 0
                        ? <Chip size="small" label="Complete" sx={{ bgcolor: '#e5f8f2', color: '#00916e', fontWeight: 700 }} />
                        : <Chip size="small" label={`${d.requiredCount - d.signedCount} pending`} sx={{ bgcolor: '#fff5e0', color: '#8a6400', fontWeight: 700 }} />}
                    </Box>
                    <LinearProgress variant="determinate" value={pct(d)} sx={{ height: 7, borderRadius: 6, mb: 1 }} />
                  </>
                )}
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => openRead(d)}>Read policy</Button>
                  {d.requiresAck && <Button size="small" onClick={() => openWho(d)}>Who's pending</Button>}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        // Desktop: full manage table
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
                <TableRow key={d.uuid} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700, color: '#222b45', fontSize: 13.5 }}>{d.title}</Typography>
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
                      <IconButton size="small" title="Edit" onClick={() => openEdit(d)}><EditIcon fontSize="small" /></IconButton>
                      {d.requiresAck && <IconButton size="small" title="Who signed" onClick={() => openWho(d)}><WhoIcon fontSize="small" /></IconButton>}
                      {d.requiresAck && <IconButton size="small" title="Remind pending" onClick={() => remind(d)}><RemindIcon fontSize="small" /></IconButton>}
                      <IconButton size="small" title="Archive" onClick={() => archive(d)}><ArchiveIcon fontSize="small" /></IconButton>
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

      {/* Who-signed dialog */}
      <Dialog open={!!whoDoc} onClose={() => setWhoDoc(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Who signed — {whoDoc?.title}</span>
          <IconButton onClick={() => setWhoDoc(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {!acks ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box> : (
            <>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label={`${acks.signedCount} signed`} sx={{ bgcolor: '#e5f8f2', color: '#00916e', fontWeight: 700 }} />
                <Chip label={`${acks.pendingCount} pending`} sx={{ bgcolor: '#fff5e0', color: '#8a6400', fontWeight: 700 }} />
                <Box sx={{ flex: 1 }} />
                {acks.pendingCount > 0 && <Button size="small" variant="outlined" startIcon={<RemindIcon />} onClick={() => remind(whoDoc)}>Remind pending</Button>}
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>Signed</Typography>
                  <Stack spacing={0.5}>
                    {acks.signed.map((r) => (
                      <Box key={r.ackId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #eef2f8' }}>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#222b45' }}>{r.employeeName}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.method === 'upload' ? 'Uploaded page' : 'Digital'} · {fmtDate(r.acknowledgedAt)}</Typography>
                        </Box>
                        {(r.hasSignature || r.hasSignedPage) && <IconButton size="small" title="View signature" onClick={() => viewArtifact(r)}><ViewIcon fontSize="small" /></IconButton>}
                      </Box>
                    ))}
                    {acks.signed.length === 0 && <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>Nobody yet.</Typography>}
                  </Stack>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>Pending</Typography>
                  <Stack spacing={0.5}>
                    {acks.pending.map((r) => (
                      <Box key={r.employeeId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #eef2f8' }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#222b45' }}>{r.employeeName}</Typography>
                        <Chip size="small" label="not signed" sx={{ bgcolor: '#fff5e0', color: '#8a6400' }} />
                      </Box>
                    ))}
                    {acks.pending.length === 0 && <Typography sx={{ fontSize: 12.5, color: '#00916e' }}>Everyone has signed. 🎉</Typography>}
                  </Stack>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Read-policy dialog */}
      <Dialog open={!!readDoc} onClose={() => setReadDoc(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{readDoc?.title}</span>
          <IconButton onClick={() => setReadDoc(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {readDoc?.bodyHtml == null ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box> : <DocumentBody html={readDoc.bodyHtml} />}
        </DialogContent>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={2800} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
