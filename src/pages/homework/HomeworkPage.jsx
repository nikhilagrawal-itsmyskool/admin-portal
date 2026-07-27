import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, Autocomplete,
  MenuItem, Alert, Chip, CircularProgress, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Stack, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon, PhotoCamera as PhotoIcon, Delete as DeleteIcon,
  Edit as EditIcon, Publish as PublishIcon, Unpublished as UnpublishIcon,
} from '@mui/icons-material';
import { homeworkService } from '../../services/homeworkService';
import { academicCalendarService } from '../../services/academicCalendarService';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const today = () => new Date().toISOString().slice(0, 10);

// Read a File to raw base64 (no data: URI prefix), for the image upload payload.
function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// One photo thumbnail: uses the presigned imageUrl (prod) or lazily fetches the
// base64 fallback (local dev / when no bucket is configured).
function HomeworkImage({ item }) {
  const [src, setSrc] = useState(item.imageUrl || null);
  useEffect(() => {
    let alive = true;
    if (item.imageUrl) { setSrc(item.imageUrl); return; }
    homeworkService.getItemImage(item.uuid)
      .then((r) => { if (alive) setSrc(r.dataUri); })
      .catch(() => {});
    return () => { alive = false; };
  }, [item.uuid, item.imageUrl]);
  return (
    <Box
      sx={{
        width: '100%', height: 220, borderRadius: 1, bgcolor: 'action.hover',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      {src
        ? <Box component="img" src={src} alt="Homework" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <Typography variant="caption" color="text.secondary">Loading photo…</Typography>}
    </Box>
  );
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

  const addPhoto = async () => {
    if (!file) { setError('Choose a photo first'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
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
      setSuccess('Photo added');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to add photo');
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
                  {day.className || 'Class'} · {date} · {items.length} photo{items.length === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color={published ? 'inherit' : 'primary'}
                startIcon={published ? <UnpublishIcon /> : <PublishIcon />}
                onClick={togglePublish}
                disabled={busy || (!published && items.length === 0)}
              >
                {published ? 'Unpublish' : 'Publish'}
              </Button>
            </Box>

            {published && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Published homework is read-only. Unpublish to add, edit or remove photos.
              </Alert>
            )}

            {/* Add photo (draft only) */}
            {!published && (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Button component="label" variant="outlined" startIcon={<PhotoIcon />} fullWidth>
                        {file ? file.name : 'Choose photo'}
                        <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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

            {/* Photo grid */}
            {items.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                No photos yet. Add the day's homework above, then Publish.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {items.map((it) => (
                  <Grid item xs={12} sm={6} md={4} key={it.uuid}>
                    <Card variant="outlined">
                      <HomeworkImage item={it} />
                      <CardContent sx={{ pb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          {it.subjectLabel && <Chip label={it.subjectLabel} size="small" color="primary" variant="outlined" />}
                          <Box sx={{ flex: 1 }} />
                          {!published && (
                            <>
                              <Tooltip title="Edit label / note">
                                <IconButton size="small" onClick={() => setEditItem({ uuid: it.uuid, subjectLabel: it.subjectLabel || '', note: it.note || '' })}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove photo">
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
        <DialogTitle>Edit photo</DialogTitle>
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
        title="Remove this photo?"
        message="The photo will be deleted from this homework. This can't be undone."
        confirmLabel="Remove"
        confirmColor="error"
        onConfirm={doRemove}
        onCancel={() => setRemoveTarget(null)}
        loading={busy}
      />
    </Box>
  );
}
