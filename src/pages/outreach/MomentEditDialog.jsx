import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField, Button,
  Stack, Chip, Alert, CircularProgress, Autocomplete, Checkbox, FormControlLabel, IconButton,
  useMediaQuery, useTheme, Grid,
} from '@mui/material';
import {
  Close as CloseIcon, AddPhotoAlternate as AddPhotoIcon, OndemandVideo as VideoIcon,
  Videocam as UploadVideoIcon, Delete as RemoveIcon,
} from '@mui/icons-material';
import SelectedThumbs from './SelectedThumbs';
import {
  outreachService, fileToUpload, uploadVideo, validateVideo,
  PHOTO_ACCEPT, PHOTO_MAX_BYTES, VIDEO_ACCEPT, VIDEO_MAX_SECONDS,
} from '../../services/outreachService';

// Edit an existing DRAFT moment: change title/body/audience, add/remove photos, add/remove
// videos. Existing-item removals happen live (server) as you click; new items + text/audience
// save on "Save". Backend blocks every write once published, so the caller only opens this on
// a draft (a published moment is unpublished first).
export default function MomentEditDialog({ open, momentId, options, onClose, onSaved }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');

  const [moment, setMoment] = useState(null); // loaded full view (existing photos/videos)
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [wholeSchool, setWholeSchool] = useState(false);
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);

  const [newFiles, setNewFiles] = useState([]);       // staged new photos (File[])
  const [newVideoFiles, setNewVideoFiles] = useState([]); // staged uploads (File[])
  const [videoUrls, setVideoUrls] = useState([]);     // staged YouTube links
  const [videoInput, setVideoInput] = useState('');

  const load = useCallback(async () => {
    if (!momentId) return;
    setLoading(true); setErr('');
    try {
      const m = await outreachService.getById(momentId);
      setMoment(m);
      setTitle(m.title || '');
      setBody(m.body || '');
      const aud = m.audience || [];
      setWholeSchool(aud.some((a) => a.scope === 'school'));
      setGrades(aud.filter((a) => a.scope === 'grade').map((a) => a.refId));
      setClasses(aud.filter((a) => a.scope === 'class')
        .map((a) => (options.classes || []).find((c) => c.classId === a.refId))
        .filter(Boolean));
      setNewFiles([]); setNewVideoFiles([]); setVideoUrls([]); setVideoInput('');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the moment');
    } finally { setLoading(false); }
  }, [momentId, options.classes]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const buildAudience = () => {
    if (wholeSchool) return [{ scope: 'school' }];
    return [
      ...grades.map((g) => ({ scope: 'grade', refId: g })),
      ...classes.map((c) => ({ scope: 'class', refId: c.classId })),
    ];
  };

  const removeExistingPhoto = async (photoId) => {
    setErr('');
    try {
      await outreachService.removePhoto(momentId, photoId);
      setMoment((m) => ({ ...m, photos: (m.photos || []).filter((p) => p.uuid !== photoId) }));
    } catch (e) { setErr(e.response?.data?.error?.description || 'Could not remove the photo'); }
  };

  const removeExistingVideo = async (videoId) => {
    setErr('');
    try {
      await outreachService.removeVideo(momentId, videoId);
      setMoment((m) => ({ ...m, videos: (m.videos || []).filter((v) => v.uuid !== videoId) }));
    } catch (e) { setErr(e.response?.data?.error?.description || 'Could not remove the video'); }
  };

  const onPickVideos = async (e) => {
    setErr('');
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    for (const f of picked) {
      // eslint-disable-next-line no-await-in-loop
      const v = await validateVideo(f);
      if (!v.ok) { setErr(v.error); continue; }
      setNewVideoFiles((prev) => [...prev, f]);
    }
  };

  const addVideoUrl = () => {
    const u = videoInput.trim();
    if (!u) return;
    setVideoUrls((prev) => [...prev, u]);
    setVideoInput('');
  };

  const save = async (publishAfter) => {
    setErr('');
    const audience = buildAudience();
    if (!audience.length) { setErr('Choose an audience (whole school, or a grade/class).'); return; }
    const tooBig = newFiles.find((f) => f.size > PHOTO_MAX_BYTES);
    if (tooBig) { setErr(`"${tooBig.name}" is too large (max 40 MB).`); return; }
    // After edits there must still be at least one photo or video.
    const totalMedia = (moment?.photos?.length || 0) + newFiles.length
      + (moment?.videos?.length || 0) + videoUrls.length + newVideoFiles.length;
    if (publishAfter && totalMedia === 0) { setErr('Add at least one photo or video before publishing.'); return; }

    setSaving(true);
    try {
      await outreachService.update(momentId, { title: title.trim() || undefined, body: body.trim() || undefined, audience });
      for (let i = 0; i < newFiles.length; i++) {
        setProgress(`Uploading photo ${i + 1}/${newFiles.length}…`);
        const up = await fileToUpload(newFiles[i]);
        await outreachService.addPhoto(momentId, { image: up.image, thumb: up.thumb });
      }
      for (let i = 0; i < videoUrls.length; i++) {
        setProgress(`Adding video link ${i + 1}/${videoUrls.length}…`);
        await outreachService.addVideo(momentId, { url: videoUrls[i] });
      }
      for (let i = 0; i < newVideoFiles.length; i++) {
        await uploadVideo(momentId, newVideoFiles[i], undefined,
          (pct) => setProgress(`Uploading video ${i + 1}/${newVideoFiles.length}… ${pct}%`));
      }
      if (publishAfter) await outreachService.publish(momentId);
      onSaved(publishAfter ? 'Saved — parents notified.' : 'Changes saved.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save changes');
    } finally { setSaving(false); setProgress(''); }
  };

  const existingPhotos = moment?.photos || [];
  const existingVideos = moment?.videos || [];

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Edit moment
        <IconButton onClick={onClose} size="small" disabled={saving}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading || !moment ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <Stack spacing={2}>
            {err && <Alert severity="error" onClose={() => setErr('')}>{err}</Alert>}

            <TextField label="Title (optional)" size="small" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 256 }} />
            <TextField label="Message (optional)" size="small" fullWidth multiline minRows={2} value={body} onChange={(e) => setBody(e.target.value)} />

            {/* existing photos */}
            {existingPhotos.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Photos ({existingPhotos.length})</Typography>
                <Grid container spacing={1} sx={{ mt: 0.25 }}>
                  {existingPhotos.map((p) => (
                    <Grid item xs={4} sm={3} key={p.uuid}>
                      <Box sx={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
                        {p.imageUrl && <Box component="img" src={p.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <IconButton size="small" onClick={() => removeExistingPhoto(p.uuid)}
                          sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
                          <RemoveIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* add photos */}
            <Button component="label" variant="outlined" startIcon={<AddPhotoIcon />} fullWidth>
              {newFiles.length ? `${newFiles.length} new photo${newFiles.length > 1 ? 's' : ''} to add` : 'Add photos'}
              <input hidden multiple type="file" accept={PHOTO_ACCEPT} onChange={(e) => setNewFiles(Array.from(e.target.files || []))} />
            </Button>
            {newFiles.length > 0 && <SelectedThumbs files={newFiles} onRemove={(i) => setNewFiles(newFiles.filter((_, j) => j !== i))} />}

            {/* existing videos */}
            {existingVideos.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {existingVideos.map((v) => (
                  <Chip key={v.uuid} icon={<VideoIcon />}
                    label={v.source === 'r2' ? (v.caption || 'Uploaded video') : (v.caption || 'YouTube video')}
                    onDelete={() => removeExistingVideo(v.uuid)} size="small" />
                ))}
              </Stack>
            )}

            {/* add video: YouTube link + upload */}
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField label="YouTube link" size="small" fullWidth value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); } }} />
                <Button variant="outlined" startIcon={<VideoIcon />} onClick={addVideoUrl} disabled={!videoInput.trim()}>Add</Button>
              </Stack>
              <Button component="label" variant="outlined" startIcon={<UploadVideoIcon />} fullWidth sx={{ mt: 1 }}>
                Upload a video
                <input hidden multiple type="file" accept={VIDEO_ACCEPT} onChange={onPickVideos} />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Up to {VIDEO_MAX_SECONDS / 60} min each. Longer? Upload to YouTube and paste the link.
              </Typography>
              {(videoUrls.length > 0 || newVideoFiles.length > 0) && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {videoUrls.map((u, i) => (
                    <Chip key={`u${i}`} icon={<VideoIcon />} label={u.length > 28 ? `${u.slice(0, 28)}…` : u}
                      onDelete={() => setVideoUrls(videoUrls.filter((_, j) => j !== i))} size="small" />
                  ))}
                  {newVideoFiles.map((f, i) => (
                    <Chip key={`f${i}`} icon={<UploadVideoIcon />} label={`${f.name.length > 20 ? `${f.name.slice(0, 20)}…` : f.name} · ${(f.size / (1024 * 1024)).toFixed(0)} MB`}
                      onDelete={() => setNewVideoFiles(newVideoFiles.filter((_, j) => j !== i))} size="small" />
                  ))}
                </Stack>
              )}
            </Box>

            {/* audience */}
            <Box>
              <FormControlLabel control={<Checkbox checked={wholeSchool} onChange={(e) => setWholeSchool(e.target.checked)} />} label="Whole school" />
              {!wholeSchool && (
                <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                  <Autocomplete multiple size="small" options={(options.grades || []).map((g) => g.grade)}
                    value={grades} onChange={(_, v) => setGrades(v)}
                    renderInput={(params) => <TextField {...params} label="Grades" placeholder="e.g. I, II" />} />
                  <Autocomplete multiple size="small" options={options.classes || []}
                    getOptionLabel={(o) => o.name || ''} isOptionEqualToValue={(o, v) => o.classId === v.classId}
                    value={classes} onChange={(_, v) => setClasses(v)}
                    renderInput={(params) => <TextField {...params} label="Classes" placeholder="Select sections" />} />
                </Stack>
              )}
            </Box>

            {saving && progress && <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{progress}</Typography>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="outlined" onClick={() => save(false)} disabled={saving || loading}>Save draft</Button>
        <Button variant="contained" onClick={() => save(true)} disabled={saving || loading}>
          {saving ? 'Working…' : 'Save & Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
