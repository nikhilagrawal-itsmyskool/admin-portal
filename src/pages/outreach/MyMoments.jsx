import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Chip, Alert,
  CircularProgress, Autocomplete, Checkbox, FormControlLabel, Divider, IconButton,
  Dialog, DialogTitle, DialogContent, Grid, useMediaQuery, useTheme,
} from '@mui/material';
import {
  PhotoLibrary as MomentsIcon, Publish as PublishIcon, VisibilityOff as UnpublishIcon,
  AddPhotoAlternate as AddPhotoIcon, OndemandVideo as VideoIcon, Schedule as ScheduleIcon,
  Visibility as ViewIcon, Close as CloseIcon, Groups as AudienceIcon, FavoriteBorder as ReactionIcon,
  Videocam as UploadVideoIcon,
} from '@mui/icons-material';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SelectedThumbs from './SelectedThumbs';
import PhotoLightbox from './PhotoLightbox';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';
import { fmtDateTime } from '../../utils/date';
import {
  outreachService, fileToUpload, uploadVideo, validateVideo,
  REACTION_EMOJI, PHOTO_ACCEPT, PHOTO_MAX_BYTES, VIDEO_ACCEPT, VIDEO_MAX_SECONDS,
} from '../../services/outreachService';

function audienceSummary(audience) {
  if (!audience?.length) return '—';
  if (audience.some((a) => a.scope === 'school')) return 'Whole school';
  return audience.map((a) => a.label).join(', ');
}

function reactionLine(reactions) {
  if (!reactions || !reactions.total) return 'No reactions yet';
  return Object.entries(reactions.counts).map(([k, n]) => `${REACTION_EMOJI[k] || k} ${n}`).join('  ');
}

// A small icon + value, for the scannable meta row on a card.
function MetaItem({ icon, text }) {
  return (
    <Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: 'text.secondary' }}>
      {icon}
      <Typography variant="caption">{text}</Typography>
    </Stack>
  );
}

// Lazy photo: presigned URL (prod) or a base64 fallback (local).
function MomentPhoto({ momentId, photo }) {
  const [src, setSrc] = useState(photo.imageUrl || null);
  useEffect(() => {
    let alive = true;
    if (photo.imageUrl) { setSrc(photo.imageUrl); return undefined; }
    outreachService.getPhotoImage(momentId, photo.uuid).then((r) => { if (alive) setSrc(r.dataUri); }).catch(() => {});
    return () => { alive = false; };
  }, [momentId, photo.uuid, photo.imageUrl]);
  return (
    <Box sx={{ width: '100%', height: 120, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src ? <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Typography variant="caption" color="text.secondary">…</Typography>}
    </Box>
  );
}

// Phone-first Moments composer for god / admin / moments-incharge. Compose photos + a note
// for an audience (whole school / grade / class) and publish — parents get an in-app
// notification and see it in the family app. Gated on outreach.moment.manage. The desktop
// /outreach console is the same capability on a laptop.
export default function MyMoments() {
  const { user } = useAuth();
  const allowed = can(user, ACTIONS.OUTREACH_MOMENT_MANAGE);

  const [options, setOptions] = useState({ grades: [], classes: [] });
  const [wholeSchool, setWholeSchool] = useState(false);
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [videoUrls, setVideoUrls] = useState([]);
  const [videoInput, setVideoInput] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [confirmUnpub, setConfirmUnpub] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const openView = async (id) => {
    setViewLoading(true); setViewing({ uuid: id });
    try { setViewing(await outreachService.getById(id)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to open'); setViewing(null); }
    finally { setViewLoading(false); }
  };

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const rows = await outreachService.list();
      setPosts(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load moments');
    } finally { setLoadingPosts(false); }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    outreachService.audienceOptions().then(setOptions).catch(() => {});
    loadPosts();
  }, [allowed, loadPosts]);

  const buildAudience = () => {
    if (wholeSchool) return [{ scope: 'school' }];
    return [
      ...grades.map((g) => ({ scope: 'grade', refId: g })),
      ...classes.map((c) => ({ scope: 'class', refId: c.classId })),
    ];
  };

  const resetComposer = () => {
    setTitle(''); setBody(''); setFiles([]); setVideoFiles([]); setWholeSchool(false); setGrades([]); setClasses([]);
    setVideoUrls([]); setVideoInput(''); setPublishAt('');
  };

  const addVideoUrl = () => {
    const u = videoInput.trim();
    if (!u) return;
    setVideoUrls((prev) => [...prev, u]);
    setVideoInput('');
  };

  // Pick video files from the phone; validate each (format/size/≤5 min) before accepting.
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

  // mode = 'publish' | 'draft' | 'schedule'.
  const compose = async (mode) => {
    setErr(''); setSuccess('');
    const audience = buildAudience();
    if (!audience.length) { setErr('Choose an audience (whole school, or a grade/class).'); return; }
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
        mode === 'publish' ? 'Posted — parents notified.'
          : mode === 'schedule' ? `Scheduled for ${fmtDateTime(publishIso)}.`
          : 'Saved as draft.',
      );
      resetComposer();
      await loadPosts();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to post the moment');
    } finally { setBusy(false); setProgress(''); }
  };

  const toggle = async (row, publish) => {
    setErr(''); setSuccess(''); setBusy(true);
    try {
      if (publish) await outreachService.publish(row.uuid);
      else await outreachService.unpublish(row.uuid);
      setConfirmUnpub(null);
      await loadPosts();
      setSuccess(publish ? 'Posted — parents notified.' : 'Unpublished.');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Action failed');
    } finally { setBusy(false); }
  };

  if (!allowed) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Moments</Typography>
        <Alert severity="info">Only god, admin, or the Moments in-charge can post moments.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 640, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <MomentsIcon color="primary" />
        <Typography variant="h6">Moments</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Share photos with parents. Posting sends an in-app notification and the post appears in the family app.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Button component="label" variant="outlined" startIcon={<AddPhotoIcon />} fullWidth sx={{ py: 1.2 }}>
              {files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} selected` : 'Add photos'}
              <input hidden multiple type="file" accept={PHOTO_ACCEPT} onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </Button>
            {files.length > 0 && (
              <SelectedThumbs files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
            )}

            <TextField label="Title (optional)" size="small" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 256 }} />
            <TextField label="Message (optional)" size="small" fullWidth multiline minRows={2} value={body} onChange={(e) => setBody(e.target.value)} />

            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField label="YouTube link" size="small" fullWidth value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); } }}
                  placeholder="Paste a YouTube URL" />
                <Button variant="outlined" startIcon={<VideoIcon />} onClick={addVideoUrl} disabled={!videoInput.trim()}>Add</Button>
              </Stack>
              {videoUrls.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {videoUrls.map((u, i) => (
                    <Chip key={i} icon={<VideoIcon />} label={u.length > 32 ? `${u.slice(0, 32)}…` : u} size="small"
                      onDelete={() => setVideoUrls(videoUrls.filter((_, j) => j !== i))} />
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <Button component="label" variant="outlined" startIcon={<UploadVideoIcon />} fullWidth sx={{ py: 1.2 }}>
                {videoFiles.length ? `${videoFiles.length} video${videoFiles.length > 1 ? 's' : ''} selected` : 'Add video from phone'}
                <input hidden multiple type="file" accept={VIDEO_ACCEPT} onChange={onPickVideos} />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Up to {VIDEO_MAX_SECONDS / 60} min each. Longer recordings? Upload to YouTube and paste the link above.
              </Typography>
              {videoFiles.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {videoFiles.map((f, i) => (
                    <Chip key={i} icon={<UploadVideoIcon />}
                      label={`${f.name.length > 22 ? `${f.name.slice(0, 22)}…` : f.name} · ${(f.size / (1024 * 1024)).toFixed(0)} MB`}
                      size="small" onDelete={() => setVideoFiles(videoFiles.filter((_, j) => j !== i))} />
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <FormControlLabel
                control={<Checkbox checked={wholeSchool} onChange={(e) => setWholeSchool(e.target.checked)} />}
                label="Whole school"
              />
              {!wholeSchool && (
                <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                  <Autocomplete
                    multiple size="small" options={options.grades.map((g) => g.grade)}
                    value={grades} onChange={(_, v) => setGrades(v)}
                    renderInput={(params) => <TextField {...params} label="Grades" placeholder="e.g. I, II" />}
                  />
                  <Autocomplete
                    multiple size="small" options={options.classes}
                    getOptionLabel={(o) => o.name || ''}
                    isOptionEqualToValue={(o, v) => o.classId === v.classId}
                    value={classes} onChange={(_, v) => setClasses(v)}
                    renderInput={(params) => <TextField {...params} label="Classes" placeholder="Select sections" />}
                  />
                </Stack>
              )}
            </Box>

            <TextField label="Schedule for later (optional)" type="datetime-local" size="small" fullWidth
              value={publishAt} onChange={(e) => setPublishAt(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Stack spacing={1}>
              <Button variant="contained" fullWidth startIcon={<PublishIcon />} onClick={() => compose('publish')} disabled={busy}>
                {busy ? 'Working…' : 'Publish now'}
              </Button>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" fullWidth startIcon={<ScheduleIcon />} onClick={() => compose('schedule')} disabled={busy || !publishAt}>Schedule</Button>
                <Button variant="text" onClick={() => compose('draft')} disabled={busy}>Save draft</Button>
              </Stack>
            </Stack>
            {busy && progress && <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{progress}</Typography>}
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Recent moments</Typography>
      {loadingPosts ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : posts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Nothing posted yet.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {posts.map((p) => (
            <Card key={p.uuid} variant="outlined">
              <CardContent sx={{ pb: 1.5 }}>
                <Stack direction="row" spacing={1.5}>
                  {p.coverUrl && (
                    <Box onClick={() => openView(p.uuid)}
                      sx={{ width: 64, height: 64, flex: '0 0 auto', borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover', cursor: 'pointer' }}>
                      <Box component="img" src={p.coverUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                      <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                        {p.title || <em style={{ color: '#888' }}>(no title)</em>}
                      </Typography>
                      {p.scheduled
                        ? <Chip size="small" label="Scheduled" color="info" variant="outlined" />
                        : <Chip size="small" label={p.status === 'published' ? 'Published' : 'Draft'}
                            color={p.status === 'published' ? 'success' : 'default'}
                            variant={p.status === 'published' ? 'filled' : 'outlined'} />}
                    </Stack>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      <MetaItem icon={<AudienceIcon sx={{ fontSize: 16 }} />} text={audienceSummary(p.audience)} />
                      <MetaItem icon={<MomentsIcon sx={{ fontSize: 16 }} />} text={p.photoCount} />
                      {p.videoCount ? <MetaItem icon={<VideoIcon sx={{ fontSize: 16 }} />} text={p.videoCount} /> : null}
                      <MetaItem icon={<ReactionIcon sx={{ fontSize: 16 }} />} text={p.reactionCount || 0} />
                    </Stack>
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        <Box component="span" sx={{ fontWeight: 600 }}>Created</Box> {fmtDateTime(p.createdAt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <Box component="span" sx={{ fontWeight: 600 }}>Published</Box>{' '}
                        {p.publishedAt ? fmtDateTime(p.publishedAt) : p.scheduled ? `scheduled ${fmtDateTime(p.publishAt)}` : '—'}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
                <Divider sx={{ my: 1.25 }} />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" variant="outlined" startIcon={<ViewIcon />} onClick={() => openView(p.uuid)}>Preview</Button>
                  {p.status === 'published'
                    ? <Button size="small" variant="outlined" color="warning" startIcon={<UnpublishIcon />} onClick={() => setConfirmUnpub(p)} disabled={busy}>Unpublish</Button>
                    : <Button size="small" variant="contained" startIcon={<PublishIcon />} onClick={() => toggle(p, true)} disabled={busy || !(p.photoCount || p.videoCount)}>{p.scheduled ? 'Publish now' : 'Publish'}</Button>}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={!!confirmUnpub}
        title="Unpublish this moment?"
        message="Parents will no longer see it. You can post it again later."
        confirmLabel="Unpublish"
        confirmColor="warning"
        onConfirm={() => toggle(confirmUnpub, false)}
        onCancel={() => setConfirmUnpub(null)}
        loading={busy}
      />

      <Dialog open={!!viewing} onClose={() => setViewing(null)} fullScreen={fullScreen} maxWidth="sm" fullWidth>
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
              <Typography variant="body2" color="text.secondary">To: {audienceSummary(viewing.audience)}</Typography>
              {viewing.body && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewing.body}</Typography>}
              {Array.isArray(viewing.photos) && viewing.photos.length > 0 && (
                <Grid container spacing={1}>
                  {viewing.photos.map((p, i) => (
                    <Grid item xs={6} key={p.uuid}>
                      <Box onClick={() => setLightboxIdx(i)} sx={{ cursor: 'pointer' }}>
                        <MomentPhoto momentId={viewing.uuid} photo={p} />
                      </Box>
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
                          sx={{ width: '100%', maxHeight: 280, borderRadius: 1, bgcolor: '#000', display: 'block' }} />
                      ) : (
                        <Box component="a" href={`https://youtu.be/${v.youtubeId}`} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
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
              <Typography variant="caption" color="text.secondary">{reactionLine(viewing.reactions)}</Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {viewing?.photos && (
        <PhotoLightbox momentId={viewing.uuid} photos={viewing.photos} index={lightboxIdx} onClose={() => setLightboxIdx(null)} onIndex={setLightboxIdx} />
      )}
    </Box>
  );
}
