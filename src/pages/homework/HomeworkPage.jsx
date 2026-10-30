import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, Autocomplete,
  MenuItem, Alert, Chip, CircularProgress, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Stack, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon, UploadFile as UploadIcon, Delete as DeleteIcon,
  Edit as EditIcon, Publish as PublishIcon, Unpublished as UnpublishIcon,
  OpenInNew as OpenInNewIcon, ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { homeworkService } from '../../services/homeworkService';
import { academicCalendarService } from '../../services/academicCalendarService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { todayIso } from '../../utils/date';

const today = () => todayIso();

// Accepted upload types: photos, PDF, and Word (converted to PDF server-side).
const HW_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const isWordFile = (file) =>
  file && (/\.docx?$/i.test(file.name || '') ||
    file.type === 'application/msword' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

// Read a File to raw base64 (no data: URI prefix), for the upload payload.
function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// One item preview. Images render inline; PDFs (incl. converted Word docs) render in
// an <iframe>. A Word doc still converting shows "Preparing…"; a failed one shows an
// error. Uses the presigned URL (prod) or lazily fetches the base64 fallback (local).
function ItemPreview({ item }) {
  const status = item.conversionStatus || 'ready';
  const isImage = item.mimeType ? item.mimeType.startsWith('image/') : !!item.imageUrl;
  const [src, setSrc] = useState(item.imageUrl || item.fileUrl || null);
  useEffect(() => {
    let alive = true;
    const url = item.imageUrl || item.fileUrl;
    if (url) { setSrc(url); return; }
    if (status !== 'ready') return; // nothing to render while converting/failed
    homeworkService.getItemImage(item.uuid)
      .then((r) => { if (alive) setSrc(r.dataUri); })
      .catch(() => {});
    return () => { alive = false; };
  }, [item.uuid, item.imageUrl, item.fileUrl, status]);

  const box = (children) => (
    <Box
      sx={{
        width: '100%', height: 220, borderRadius: 1, bgcolor: 'action.hover',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );

  if (status === 'pending') {
    return box(
      <Stack alignItems="center" spacing={1}>
        <CircularProgress size={22} />
        <Typography variant="caption" color="text.secondary">Preparing PDF…</Typography>
      </Stack>,
    );
  }
  if (status === 'failed') {
    return box(
      <Stack alignItems="center" spacing={1}>
        <ErrorIcon color="error" />
        <Typography variant="caption" color="error">Couldn't process this file</Typography>
      </Stack>,
    );
  }
  if (!src) return box(<Typography variant="caption" color="text.secondary">Loading…</Typography>);
  if (isImage) return box(<Box component="img" src={src} alt="Homework" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />);
  return box(<Box component="iframe" src={src} title={item.fileName || 'Document'} sx={{ width: '100%', height: '100%', border: 0 }} />);
}

export default function HomeworkPage() {
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [academicYearId, setAcademicYearId] = useState('');
  const [date, setDate] = useState(today());

  const [day, setDay] = useState(null); // { classId, date, className, day: { uuid, status, items } | null }
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add-photo form
  const [file, setFile] = useState(null);
  const [subjectLabel, setSubjectLabel] = useState('');
  const [note, setNote] = useState('');

  const [editItem, setEditItem] = useState(null); // { uuid, subjectLabel, note }
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const yrs = await academicCalendarService.getAcademicYears();
        setYears(Array.isArray(yrs) ? yrs : yrs?.academicYears || []);
        try {
          const cur = await academicCalendarService.getCurrentAcademicYear();
          if (cur?.uuid) setAcademicYearId(cur.uuid);
        } catch { /* no current year configured */ }
      } catch {
        setError('Failed to load academic years');
      }
    })();
  }, []);

  // Postable classes for the chosen year: non-streamed base classes + the stream
  // children (XI-A Science / Commerce) of streamed sections. Each has its own
  // homework + class teacher, so streamed sections show as separate options.
  useEffect(() => {
    if (!academicYearId) return;
    (async () => {
      try {
        const cls = await homeworkService.getClasses(academicYearId);
        setClasses((cls || []).map((c) => ({ uuid: c.classId, name: c.name, streamCode: c.streamCode })));
      } catch {
        setClasses([]);
      }
    })();
  }, [academicYearId]);

  const hw = day?.day || null;
  const published = hw?.status === 'published';
  const items = hw?.items || [];
  const anyPending = items.some((it) => it.conversionStatus === 'pending');

  const load = async () => {
    if (!selectedClass || !academicYearId || !date) {
      setError('Select class, academic year and date');
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      // Ensure a draft day exists so the teacher can start adding photos immediately.
      const res = await homeworkService.ensureDay({ classId: selectedClass.uuid, date, academicYearId });
      setDay(res);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load homework');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!selectedClass) return;
    const res = await homeworkService.getDay({ classId: selectedClass.uuid, date, academicYearId });
    setDay(res);
  };

  // While a Word item is converting (pdf still being generated), poll the day until
  // every item is ready so the preview flips from "Preparing…" to the PDF on its own.
  useEffect(() => {
    if (!anyPending) return undefined;
    const t = setInterval(() => { refresh().catch(() => {}); }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyPending, selectedClass, date, academicYearId]);

  const addPhoto = async () => {
    if (!file) { setError('Choose a file first'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const word = isWordFile(file);
      const base64Data = await readFileB64(file);
      const res = await homeworkService.addItem({
        classId: selectedClass.uuid,
        date,
        academicYearId,
        subjectLabel: subjectLabel.trim() || undefined,
        note: note.trim() || undefined,
        image: { fileName: file.name, mimeType: file.type, base64Data },
      });
      setDay(res);
      setFile(null); setSubjectLabel(''); setNote('');
      setSuccess(word ? 'Added — the Word file is being converted to a PDF' : 'Added');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to add file');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    setBusy(true); setError('');
    try {
      const res = await homeworkService.editItem(editItem.uuid, {
        subjectLabel: editItem.subjectLabel?.trim() || undefined,
        note: editItem.note?.trim() || undefined,
      });
      setDay(res);
      setEditItem(null);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const doRemove = async () => {
    setBusy(true); setError('');
    try {
      const res = await homeworkService.removeItem(removeTarget.uuid);
      setDay(res);
      setRemoveTarget(null);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to remove');
      setRemoveTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async () => {
    if (!hw) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const res = published
        ? await homeworkService.unpublishDay(hw.uuid)
        : await homeworkService.publishDay(hw.uuid);
      setDay(res);
      setSuccess(published ? 'Unpublished — students can no longer see it' : 'Published — visible to students');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Homework</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={classes}
                getOptionLabel={(o) => o.name || ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={selectedClass}
                onChange={(_, v) => { setSelectedClass(v); setDay(null); }}
                renderInput={(params) => <TextField {...params} label="Class" size="small" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth select size="small" label="Academic Year" value={academicYearId} onChange={(e) => { setAcademicYearId(e.target.value); setSelectedClass(null); setDay(null); }}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth type="date" size="small" label="Date" value={date} onChange={(e) => { setDate(e.target.value); setDay(null); }} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={load} disabled={loading}>Load day</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}

      {!loading && day && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={published ? 'PUBLISHED' : 'DRAFT'} color={published ? 'success' : 'default'} size="small" />
                <Typography variant="body2" color="text.secondary">
                  {day.className || 'Class'} · {date} · {items.length} item{items.length === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Tooltip title={!published && anyPending ? 'A document is still being prepared' : ''}>
                <span>
                  <Button
                    variant="contained"
                    color={published ? 'inherit' : 'primary'}
                    startIcon={published ? <UnpublishIcon /> : <PublishIcon />}
                    onClick={togglePublish}
                    disabled={busy || (!published && (items.length === 0 || anyPending))}
                  >
                    {published ? 'Unpublish' : 'Publish'}
                  </Button>
                </span>
              </Tooltip>
            </Box>

            {published && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Published homework is read-only. Unpublish to add, edit or remove items.
              </Alert>
            )}

            {/* Add photo (draft only) */}
            {!published && (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Button component="label" variant="outlined" startIcon={<UploadIcon />} fullWidth>
                        {file ? file.name : 'Choose file'}
                        <input hidden type="file" accept={HW_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField fullWidth size="small" label="Subject (optional)" value={subjectLabel} onChange={(e) => setSubjectLabel(e.target.value)} inputProps={{ maxLength: 64 }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth size="small" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button variant="contained" onClick={addPhoto} disabled={busy || !file} fullWidth>Add</Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Item grid */}
            {items.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                Nothing yet. Add the day's homework (photo, PDF or Word) above, then Publish.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {items.map((it) => (
                  <Grid item xs={12} sm={6} md={4} key={it.uuid}>
                    <Card variant="outlined">
                      <ItemPreview item={it} />
                      <CardContent sx={{ pb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          {it.subjectLabel && <Chip label={it.subjectLabel} size="small" color="primary" variant="outlined" />}
                          <Box sx={{ flex: 1 }} />
                          {it.fileUrl && it.mimeType && !it.mimeType.startsWith('image/') && (
                            <Tooltip title="Open PDF">
                              <IconButton size="small" component="a" href={it.fileUrl} target="_blank" rel="noopener">
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {!published && (
                            <>
                              <Tooltip title="Edit label / note">
                                <IconButton size="small" onClick={() => setEditItem({ uuid: it.uuid, subjectLabel: it.subjectLabel || '', note: it.note || '' })}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove item">
                                <IconButton size="small" color="error" onClick={() => setRemoveTarget(it)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                        {it.note && <Typography variant="body2" color="text.secondary">{it.note}</Typography>}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit label/note dialog */}
      <Dialog open={Boolean(editItem)} onClose={() => setEditItem(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit item</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="dense" label="Subject" value={editItem?.subjectLabel || ''}
            onChange={(e) => setEditItem((p) => ({ ...p, subjectLabel: e.target.value }))} inputProps={{ maxLength: 64 }}
          />
          <TextField
            fullWidth margin="dense" label="Note" multiline minRows={2} value={editItem?.note || ''}
            onChange={(e) => setEditItem((p) => ({ ...p, note: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItem(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={busy}>Save</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this item?"
        message="This item will be deleted from this homework. This can't be undone."
        confirmLabel="Remove"
        confirmColor="error"
        onConfirm={doRemove}
        onCancel={() => setRemoveTarget(null)}
        loading={busy}
      />
    </Box>
  );
}
