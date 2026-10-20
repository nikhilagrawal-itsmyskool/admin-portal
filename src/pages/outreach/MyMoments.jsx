import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Chip, Alert,
  CircularProgress, MenuItem, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  PhotoLibrary as MomentsIcon, Publish as PublishIcon, VisibilityOff as UnpublishIcon,
  AddPhotoAlternate as AddPhotoIcon,
} from '@mui/icons-material';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';
import { fmtDateTime } from '../../utils/date';
import {
  outreachService, filesToImages, REACTION_EMOJI, PHOTO_ACCEPT, PHOTO_MAX_BYTES,
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

// Teacher-first, phone-first screen: a class teacher posts photos + a note for their own
// class and publishes it. Uses ONLY the own-class /me endpoints (the teacher holds
// outreach.moment.post, not .view, so the admin reads would 403). The desktop /outreach
// console is a separate, admin screen.
export default function MyMoments() {
  const { user } = useAuth();
  const allowed = can(user, ACTIONS.OUTREACH_MOMENT_POST);
  const { academicYearId } = useAcademicYear();

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [confirmUnpub, setConfirmUnpub] = useState(null);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const rows = await outreachService.me.posted();
      setPosts(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load your moments');
    } finally { setLoadingPosts(false); }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    outreachService.me.classes(academicYearId)
      .then((cls) => {
        const list = Array.isArray(cls) ? cls : [];
        setClasses(list);
        if (list.length === 1) setClassId(list[0].classId);
      })
      .catch(() => {});
  }, [allowed, academicYearId]);

  useEffect(() => { if (allowed) loadPosts(); }, [allowed, loadPosts]);

  const resetComposer = () => { setTitle(''); setBody(''); setFiles([]); };

  const compose = async (doPublish) => {
    setErr(''); setSuccess('');
    if (!classId) { setErr('Pick your class first.'); return; }
    if (!files.length) { setErr('Add at least one photo.'); return; }
    const tooBig = files.find((f) => f.size > PHOTO_MAX_BYTES);
    if (tooBig) { setErr(`"${tooBig.name}" is larger than 5 MB.`); return; }
    setBusy(true);
    try {
      const created = await outreachService.me.create({ classId, title: title.trim() || undefined, body: body.trim() || undefined });
      const images = await filesToImages(files);
      for (const image of images) {
        await outreachService.me.addPhoto(created.uuid, { image });
      }
      if (doPublish) await outreachService.me.publish(created.uuid);
      setSuccess(doPublish ? 'Posted — parents notified.' : 'Saved as draft.');
      resetComposer();
      await loadPosts();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to post the moment');
    } finally { setBusy(false); }
  };

  const toggle = async (row, publish) => {
    setErr(''); setSuccess(''); setBusy(true);
    try {
      if (publish) await outreachService.me.publish(row.uuid);
      else await outreachService.me.unpublish(row.uuid);
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
        <Alert severity="info">Only a class teacher can post moments for their class.</Alert>
      </Box>
    );
  }

  const selectedClassName = classes.find((c) => c.classId === classId)?.className;

  return (
    <Box sx={{ p: 2, maxWidth: 640, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <MomentsIcon color="primary" />
        <Typography variant="h6">Moments</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Share today's photos with your class's parents. Posting sends them a notification.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {classes.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>You are not set as a class teacher for any class this year.</Alert>
      ) : (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              {classes.length > 1 ? (
                <TextField select label="Class" size="small" fullWidth value={classId} onChange={(e) => setClassId(e.target.value)}>
                  {classes.map((c) => <MenuItem key={c.classId} value={c.classId}>{c.className}</MenuItem>)}
                </TextField>
              ) : (
                <Typography variant="subtitle2">Posting for <b>{selectedClassName}</b></Typography>
              )}

              <Button component="label" variant="outlined" startIcon={<AddPhotoIcon />} fullWidth sx={{ py: 1.2 }}>
                {files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} selected` : 'Add photos'}
                <input hidden multiple type="file" accept={PHOTO_ACCEPT} onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              </Button>
              {files.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {files.map((f, i) => (
                    <Chip key={i} label={f.name} size="small" onDelete={() => setFiles(files.filter((_, j) => j !== i))} />
                  ))}
                </Stack>
              )}

              <TextField label="Title (optional)" size="small" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 256 }} />
              <TextField label="Message (optional)" size="small" fullWidth multiline minRows={2} value={body} onChange={(e) => setBody(e.target.value)} />

              <Stack direction="row" spacing={1}>
                <Button variant="contained" fullWidth startIcon={<PublishIcon />} onClick={() => compose(true)} disabled={busy}>
                  {busy ? 'Working…' : 'Post'}
                </Button>
                <Button variant="text" onClick={() => compose(false)} disabled={busy}>Draft</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Your recent moments</Typography>
      {loadingPosts ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : posts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Nothing posted yet.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {posts.map((p) => (
            <Card key={p.uuid} variant="outlined">
              <CardContent sx={{ pb: 1.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                    {p.title || <em style={{ color: '#888' }}>(no title)</em>}
                  </Typography>
                  <Chip size="small" label={p.status === 'published' ? 'Published' : 'Draft'}
                    color={p.status === 'published' ? 'success' : 'default'}
                    variant={p.status === 'published' ? 'filled' : 'outlined'} />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {audienceSummary(p.audience)} · {p.photoCount} photo{p.photoCount === 1 ? '' : 's'}
                  {p.publishedAt ? ` · ${fmtDateTime(p.publishedAt)}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {reactionLine(p.reactions)}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="flex-end">
                  {p.status === 'published' ? (
                    <Tooltip title="Unpublish">
                      <IconButton size="small" color="warning" onClick={() => setConfirmUnpub(p)} disabled={busy}>
                        <UnpublishIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Button size="small" startIcon={<PublishIcon />} onClick={() => toggle(p, true)} disabled={busy || !p.photoCount}>
                      Post
                    </Button>
                  )}
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
    </Box>
  );
}
