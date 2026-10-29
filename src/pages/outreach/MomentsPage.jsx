import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Chip, Alert,
  CircularProgress, Grid, Autocomplete, Checkbox, FormControlLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, Tabs, Tab, IconButton, Tooltip, Divider,
} from '@mui/material';
import {
  PhotoLibrary as MomentsIcon, Publish as PublishIcon, VisibilityOff as UnpublishIcon,
  Visibility as ViewIcon, AddPhotoAlternate as AddPhotoIcon, Close as CloseIcon,
  OndemandVideo as VideoIcon, Schedule as ScheduleIcon, Videocam as UploadVideoIcon,
} from '@mui/icons-material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SelectedThumbs from './SelectedThumbs';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';
import { fmtDateTime } from '../../utils/date';
import {
  outreachService, fileToUpload, uploadVideo, validateVideo,
  REACTION_EMOJI, PHOTO_ACCEPT, PHOTO_MAX_BYTES, VIDEO_ACCEPT, VIDEO_MAX_SECONDS,
} from '../../services/outreachService';

// Lazily render a photo: prefer the presigned URL (prod); fall back to a base64 fetch (local).
function MomentPhoto({ momentId, photo, height = 140 }) {
  const [src, setSrc] = useState(photo.imageUrl || null);
  useEffect(() => {
    let alive = true;
    if (photo.imageUrl) { setSrc(photo.imageUrl); return; }
    outreachService.getPhotoImage(momentId, photo.uuid)
      .then((r) => { if (alive) setSrc(r.dataUri); })
      .catch(() => {});
    return () => { alive = false; };
  }, [momentId, photo.uuid, photo.imageUrl]);
  return (
    <Box sx={{ width: '100%', height, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src
        ? <Box component="img" src={src} alt={photo.caption || ''} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <Typography variant="caption" color="text.secondary">Loading…</Typography>}
    </Box>
  );
}

function audienceSummary(audience) {
  if (!audience?.length) return '—';
  if (audience.some((a) => a.scope === 'school')) return 'Whole school';
  return audience.map((a) => a.label).join(', ');
}

export default function MomentsPage() {
  const { user } = useAuth();
  const canManage = can(user, ACTIONS.OUTREACH_MOMENT_MANAGE);
  const { academicYearId } = useAcademicYear();

  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | published | draft
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  // Composer state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [wholeSchool, setWholeSchool] = useState(false);
  const [grades, setGrades] = useState([]);           // selected grade labels
  const [classes, setClasses] = useState([]);         // selected class objects
  const [files, setFiles] = useState([]);             // File[]
  const [videoFiles, setVideoFiles] = useState([]);   // uploaded-video File[] (→ R2)
  const [videoUrls, setVideoUrls] = useState([]);     // YouTube URLs (strings)
  const [videoInput, setVideoInput] = useState('');
  const [publishAt, setPublishAt] = useState('');     // datetime-local string
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [options, setOptions] = useState({ grades: [], classes: [] });

  // View dialog + delete confirm
  const [viewing, setViewing] = useState(null);       // full MomentView
  const [viewLoading, setViewLoading] = useState(false);
  const [reactors, setReactors] = useState([]);        // who reacted (names) on the viewed moment
  const [confirmUnpub, setConfirmUnpub] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const params = tab === 'all' ? {} : { status: tab };
      const rows = await outreachService.list(params);
      setMoments(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load moments');
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    outreachService.audienceOptions().then(setOptions).catch(() => {});
  }, []);

  const buildAudience = () => {
    if (wholeSchool) return [{ scope: 'school' }];
    const out = [
      ...grades.map((g) => ({ scope: 'grade', refId: g })),
      ...classes.map((c) => ({ scope: 'class', refId: c.classId })),
    ];
    return out;
  };

  const resetComposer = () => {
    setTitle(''); setBody(''); setWholeSchool(false); setGrades([]); setClasses([]); setFiles([]);
    setVideoFiles([]); setVideoUrls([]); setVideoInput(''); setPublishAt('');
  };

  const addVideoUrl = () => {
    const u = videoInput.trim();
    if (!u) return;
    setVideoUrls((prev) => [...prev, u]);
    setVideoInput('');
  };

  // Pick video files; validate each (format/size/≤5 min) before accepting for upload.
  const onPickVideos = async (e) => {
    setErr('');
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    for (const f of picked) {
      // eslint-disable-next-line no-await-in-loop
      const v = await validateVideo(f);
      if (!v.ok) { setErr(v.error); continue; }
      setVideoFiles((prev) => [...prev, f]);
    }
  };

  // Create a draft, attach photos + YouTube links, then publish / schedule / leave as draft.
  // mode = 'publish' | 'draft' | 'schedule'.
  const compose = async (mode) => {
    setErr(''); setSuccess('');
    const audience = buildAudience();
    if (!audience.length) { setErr('Choose an audience (whole school, or at least one grade/class).'); return; }
    if (!files.length && !videoUrls.length && !videoFiles.length) { setErr('Add at least one photo, video, or YouTube link.'); return; }
    const tooBig = files.find((f) => f.size > PHOTO_MAX_BYTES);
    if (tooBig) { setErr(`"${tooBig.name}" is too large (max 40 MB).`); return; }
    let publishIso = null;
    if (mode === 'schedule') {
      const when = publishAt ? new Date(publishAt) : null;
      if (!when || isNaN(when.getTime()) || when.getTime() <= Date.now()) { setErr('Pick a future date & time to schedule.'); return; }
      publishIso = when.toISOString();
    }
    setBusy(true);
    try {
      const created = await outreachService.create({ title: title.trim() || undefined, body: body.trim() || undefined, audience });
      // One photo at a time: decode → resize → upload → free. Keeps memory flat on phones
      // even for large 16+ photo batches (decoding them all up front is what crashed before).
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading photo ${i + 1}/${files.length}…`);
        const up = await fileToUpload(files[i]);
        await outreachService.addPhoto(created.uuid, { image: up.image, thumb: up.thumb });
      }
      for (let i = 0; i < videoUrls.length; i++) {
        setProgress(`Adding video ${i + 1}/${videoUrls.length}…`);
        await outreachService.addVideo(created.uuid, { url: videoUrls[i] });
      }
      for (let i = 0; i < videoFiles.length; i++) {
        await uploadVideo(created.uuid, videoFiles[i], undefined,
          (pct) => setProgress(`Uploading video ${i + 1}/${videoFiles.length}… ${pct}%`));
      }
      if (mode === 'publish') await outreachService.publish(created.uuid);
      else if (mode === 'schedule') await outreachService.schedule(created.uuid, publishIso);
      setSuccess(
        mode === 'publish' ? 'Moment published — parents notified.'
          : mode === 'schedule' ? `Scheduled for ${fmtDateTime(publishIso)}.`
          : 'Draft saved.',
      );
      resetComposer();
      await loadList();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save the moment');
    } finally { setBusy(false); setProgress(''); }
  };

  const openView = async (id) => {
    setViewLoading(true); setViewing({ uuid: id }); setReactors([]);
    try {
      const full = await outreachService.getById(id);
      setViewing(full);
      // Who reacted (names) — best-effort; empty on failure.
      try { const r = await outreachService.getReactions(id); setReactors(r.reactors || []); } catch { setReactors([]); }
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to open moment');
      setViewing(null);
    } finally { setViewLoading(false); }
  };

  const doPublishToggle = async (row, publish) => {
    setErr(''); setSuccess(''); setBusy(true);
    try {
      if (publish) await outreachService.publish(row.uuid);
      else await outreachService.unpublish(row.uuid);
      setConfirmUnpub(null);
      if (viewing?.uuid === row.uuid) await openView(row.uuid);
      await loadList();
      setSuccess(publish ? 'Published — parents notified.' : 'Unpublished.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Action failed');
    } finally { setBusy(false); }
  };

  const columns = [
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 180,
      renderCell: (p) => p.value || <em style={{ color: '#888' }}>(no title)</em> },
    { field: 'status', headerName: 'Status', width: 120,
      renderCell: (p) => p.row.scheduled
        ? <Chip size="small" label="Scheduled" color="info" variant="outlined" />
        : <Chip size="small" label={p.value === 'published' ? 'Published' : 'Draft'} color={p.value === 'published' ? 'success' : 'default'} variant={p.value === 'published' ? 'filled' : 'outlined'} /> },
    { field: 'audience', headerName: 'Audience', flex: 1, minWidth: 160, sortable: false,
      valueGetter: (v) => audienceSummary(v) },
    { field: 'photoCount', headerName: 'Photos', width: 80, align: 'center', headerAlign: 'center' },
    { field: 'videoCount', headerName: 'Videos', width: 80, align: 'center', headerAlign: 'center' },
    { field: 'reactionCount', headerName: 'Reactions', width: 90, align: 'center', headerAlign: 'center' },
    { field: 'publishedAt', headerName: 'When', width: 170,
      valueGetter: (v, row) => (row.scheduled ? `⏱ ${fmtDateTime(row.publishAt)}` : (v ? fmtDateTime(v) : '—')) },
    { field: 'actions', headerName: 'Actions', width: 130, sortable: false,
      renderCell: (p) => (
        <Box>
          <Tooltip title="View"><IconButton size="small" onClick={() => openView(p.row.uuid)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
          {canManage && (p.row.status === 'published'
            ? <Tooltip title="Unpublish"><IconButton size="small" color="warning" onClick={() => setConfirmUnpub(p.row)}><UnpublishIcon fontSize="small" /></IconButton></Tooltip>
            : <Tooltip title="Publish now"><IconButton size="small" color="success" onClick={() => doPublishToggle(p.row, true)} disabled={busy || !(p.row.photoCount || p.row.videoCount)}><PublishIcon fontSize="small" /></IconButton></Tooltip>)}
        </Box>
      ) },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <MomentsIcon color="primary" />
        <Typography variant="h5">Moments</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Share photos and a note with parents. Publishing sends an in-app notification and the post appears in the
        family app feed, where parents can react (but not reply).
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {canManage && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>New moment</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField label="Title (optional)" fullWidth size="small" value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 256 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Button component="label" variant="outlined" startIcon={<AddPhotoIcon />} fullWidth sx={{ height: 40 }}>
                  {files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} selected` : 'Choose photos'}
                  <input hidden multiple type="file" accept={PHOTO_ACCEPT} onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                </Button>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Message (optional)" fullWidth size="small" multiline minRows={2} value={body} onChange={(e) => setBody(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Checkbox checked={wholeSchool} onChange={(e) => setWholeSchool(e.target.checked)} />}
                  label="Whole school"
                />
                {!wholeSchool && (
                  <Grid container spacing={2} sx={{ mt: 0 }}>
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        multiple size="small" options={options.grades.map((g) => g.grade)}
                        value={grades} onChange={(_, v) => setGrades(v)}
                        renderInput={(params) => <TextField {...params} label="Grades" placeholder="e.g. I, II" />}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        multiple size="small" options={options.classes}
                        getOptionLabel={(o) => o.name || ''}
                        isOptionEqualToValue={(o, v) => o.classId === v.classId}
                        value={classes} onChange={(_, v) => setClasses(v)}
                        renderInput={(params) => <TextField {...params} label="Classes" placeholder="Select sections" />}
                      />
                    </Grid>
                  </Grid>
                )}
              </Grid>
              {files.length > 0 && (
                <Grid item xs={12}>
                  <SelectedThumbs files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
                </Grid>
              )}
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="YouTube link" size="small" fullWidth value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); } }}
                    placeholder="Paste a YouTube URL and press Add"
                  />
                  <Button variant="outlined" startIcon={<VideoIcon />} onClick={addVideoUrl} disabled={!videoInput.trim()}>Add</Button>
                </Stack>
                {videoUrls.length > 0 && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                    {videoUrls.map((u, i) => (
                      <Chip key={i} icon={<VideoIcon />} label={u.length > 44 ? `${u.slice(0, 44)}…` : u} size="small"
                        onDelete={() => setVideoUrls(videoUrls.filter((_, j) => j !== i))} />
                    ))}
                  </Stack>
                )}
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button component="label" variant="outlined" startIcon={<UploadVideoIcon />}>
                    Upload a video
                    <input hidden multiple type="file" accept={VIDEO_ACCEPT} onChange={onPickVideos} />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Up to {VIDEO_MAX_SECONDS / 60} min each. Longer recordings? Upload to YouTube and paste the link above.
                  </Typography>
                </Stack>
                {videoFiles.length > 0 && (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                    {videoFiles.map((f, i) => (
                      <Chip key={i} icon={<UploadVideoIcon />}
                        label={`${f.name.length > 30 ? `${f.name.slice(0, 30)}…` : f.name} · ${(f.size / (1024 * 1024)).toFixed(0)} MB`}
                        size="small" onDelete={() => setVideoFiles(videoFiles.filter((_, j) => j !== i))} />
                    ))}
                  </Stack>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Schedule for later (optional)" type="datetime-local" size="small" fullWidth
                  value={publishAt} onChange={(e) => setPublishAt(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Leave empty to publish now or save as draft"
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button variant="contained" startIcon={<PublishIcon />} onClick={() => compose('publish')} disabled={busy}>
                    {busy ? 'Working…' : 'Publish now'}
                  </Button>
                  <Button variant="outlined" startIcon={<ScheduleIcon />} onClick={() => compose('schedule')} disabled={busy || !publishAt}>
                    Schedule
                  </Button>
                  <Button variant="text" onClick={() => compose('draft')} disabled={busy}>Save as draft</Button>
                  {busy && progress && <Typography variant="caption" color="text.secondary">{progress}</Typography>}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab value="all" label="All" />
        <Tab value="published" label="Published" />
        <Tab value="draft" label="Drafts" />
      </Tabs>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <ResponsiveDataGrid
          primaryChipField="status"
          rows={moments} columns={columns} getRowId={(r) => r.uuid} loading={loading}
          autoHeight pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      )}

      {/* View dialog */}
      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {viewing?.title || 'Moment'}
          <IconButton onClick={() => setViewing(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {viewLoading || !viewing?.uuid ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="caption" color="text.secondary">Preview — how parents will see it</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {viewing.scheduled
                  ? <Chip size="small" label="Scheduled" color="info" variant="outlined" />
                  : <Chip size="small" label={viewing.status === 'published' ? 'Published' : 'Draft'} color={viewing.status === 'published' ? 'success' : 'default'} variant={viewing.status === 'published' ? 'filled' : 'outlined'} />}
                <Typography variant="caption" color="text.secondary">
                  {viewing.scheduled && viewing.publishAt ? `for ${fmtDateTime(viewing.publishAt)}` : ''}
                  {!viewing.scheduled && viewing.status === 'published' && viewing.publishedAt ? `Published ${fmtDateTime(viewing.publishedAt)}` : ''}
                  {viewing.authorName ? ` · by ${viewing.authorName}` : ''}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">To: {audienceSummary(viewing.audience)}</Typography>
              {viewing.body && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewing.body}</Typography>}
              {Array.isArray(viewing.photos) && viewing.photos.length > 0 && (
                <Grid container spacing={1}>
                  {viewing.photos.map((p) => (
                    <Grid item xs={6} key={p.uuid}>
                      <MomentPhoto momentId={viewing.uuid} photo={p} />
                      {p.caption && <Typography variant="caption" color="text.secondary">{p.caption}</Typography>}
                    </Grid>
                  ))}
                </Grid>
              )}
              {Array.isArray(viewing.videos) && viewing.videos.length > 0 && (
                <Grid container spacing={1}>
                  {viewing.videos.map((v) => (
                    <Grid item xs={v.source === 'r2' ? 12 : 6} key={v.uuid}>
                      {v.source === 'r2' && v.videoUrl ? (
                        <Box component="video" src={v.videoUrl} controls preload="metadata"
                          sx={{ width: '100%', maxHeight: 320, borderRadius: 1, bgcolor: '#000', display: 'block' }} />
                      ) : (
                        <Box component="a" href={`https://youtu.be/${v.youtubeId}`} target="_blank" rel="noopener noreferrer"
                          sx={{ display: 'block', position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
                          <Box component="img" src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`} alt="" sx={{ width: '100%', display: 'block' }} />
                          <VideoIcon sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontSize: 40, filter: 'drop-shadow(0 0 4px rgba(0,0,0,.6))' }} />
                        </Box>
                      )}
                      {v.caption && <Typography variant="caption" color="text.secondary">{v.caption}</Typography>}
                    </Grid>
                  ))}
                </Grid>
              )}
              <Divider />
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary">Reactions:</Typography>
                {viewing.reactions && viewing.reactions.total > 0
                  ? Object.entries(viewing.reactions.counts).map(([k, n]) => (
                      <span key={k}>{REACTION_EMOJI[k] || k} {n}</span>
                    ))
                  : <Typography variant="caption" color="text.secondary">none yet</Typography>}
              </Stack>
              {reactors.length > 0 && (
                <Stack spacing={0.25} sx={{ pl: 0.5 }}>
                  {reactors.map((r, i) => (
                    <Typography key={i} variant="caption" color="text.secondary">
                      {REACTION_EMOJI[r.emoji] || r.emoji}&nbsp; {r.name || 'Unknown'}
                      {r.reactorType === 'student' ? ' · parent' : ''}
                      {r.familyNumber ? ` (${r.familyNumber})` : ''}
                    </Typography>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        {canManage && viewing?.uuid && !viewLoading && (
          <DialogActions>
            {viewing.status === 'published'
              ? <Button color="warning" startIcon={<UnpublishIcon />} onClick={() => setConfirmUnpub(viewing)} disabled={busy}>Unpublish</Button>
              : <Button color="success" startIcon={<PublishIcon />} onClick={() => doPublishToggle(viewing, true)} disabled={busy || !(viewing.photos?.length || viewing.videos?.length)}>Publish now</Button>}
          </DialogActions>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!confirmUnpub}
        title="Unpublish this moment?"
        message="Parents will no longer see it in the app feed. You can publish it again later."
        confirmLabel="Unpublish"
        confirmColor="warning"
        onConfirm={() => doPublishToggle(confirmUnpub, false)}
        onCancel={() => setConfirmUnpub(null)}
        loading={busy}
      />
    </Box>
  );
}
