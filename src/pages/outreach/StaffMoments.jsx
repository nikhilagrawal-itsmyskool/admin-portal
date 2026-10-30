import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Chip, Alert, CircularProgress,
  Divider, IconButton, Dialog, DialogTitle, DialogContent, Grid, useMediaQuery, useTheme,
} from '@mui/material';
import {
  PhotoLibrary as MomentsIcon, OndemandVideo as VideoIcon, Close as CloseIcon,
  Groups as AudienceIcon, FavoriteBorder as ReactionIcon,
} from '@mui/icons-material';
import PhotoLightbox from './PhotoLightbox';
import { fmtDateTime } from '../../utils/date';
import { outreachService, REACTION_EMOJI } from '../../services/outreachService';

function audienceSummary(audience) {
  if (!audience?.length) return '—';
  if (audience.some((a) => a.scope === 'school')) return 'Whole school';
  return audience.map((a) => a.label).join(', ');
}

function reactionLine(reactions) {
  if (!reactions || !reactions.total) return 'No reactions yet';
  return Object.entries(reactions.counts).map(([k, n]) => `${REACTION_EMOJI[k] || k} ${n}`).join('  ');
}

function MetaItem({ icon, text }) {
  return (
    <Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: 'text.secondary' }}>
      {icon}
      <Typography variant="caption">{text}</Typography>
    </Stack>
  );
}

// Read-only Moments feed for ALL staff: browse what's been shared with parents. No composing,
// no draft visibility, no reactions — just the published gallery. Backed by /outreach/staff/feed
// (any logged-in employee). The compose surface lives in "Share Moment" (god/admin/incharge).
export default function StaffMoments() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const rows = await outreachService.staffFeed();
      setPosts(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load moments');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openView = async (id) => {
    setViewLoading(true); setViewing({ uuid: id });
    try { setViewing(await outreachService.staffFeedMoment(id)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to open'); setViewing(null); }
    finally { setViewLoading(false); }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 640, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <MomentsIcon color="primary" />
        <Typography variant="h6">Moments</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Photos and videos shared with parents across the school.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : posts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Nothing shared yet.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {posts.map((p) => (
            <Card key={p.uuid} variant="outlined" onClick={() => openView(p.uuid)} sx={{ cursor: 'pointer' }}>
              <CardContent sx={{ pb: 1.5 }}>
                <Stack direction="row" spacing={1.5}>
                  {p.coverUrl && (
                    <Box sx={{ width: 64, height: 64, flex: '0 0 auto', borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
                      <Box component="img" src={p.coverUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {p.title || <em style={{ color: '#888' }}>(no title)</em>}
                    </Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      <MetaItem icon={<AudienceIcon sx={{ fontSize: 16 }} />} text={audienceSummary(p.audience)} />
                      <MetaItem icon={<MomentsIcon sx={{ fontSize: 16 }} />} text={p.photoCount} />
                      {p.videoCount ? <MetaItem icon={<VideoIcon sx={{ fontSize: 16 }} />} text={p.videoCount} /> : null}
                      <MetaItem icon={<ReactionIcon sx={{ fontSize: 16 }} />} text={p.reactionCount || 0} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {p.publishedAt ? fmtDateTime(p.publishedAt) : fmtDateTime(p.createdAt)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={!!viewing} onClose={() => setViewing(null)} fullScreen={fullScreen} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {viewing?.title || 'Moment'}
          <IconButton onClick={() => setViewing(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {viewLoading || !viewing?.audience ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">To: {audienceSummary(viewing.audience)}</Typography>
              {viewing.body && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewing.body}</Typography>}
              {Array.isArray(viewing.photos) && viewing.photos.length > 0 && (
                <Grid container spacing={1}>
                  {viewing.photos.map((p, i) => (
                    <Grid item xs={6} key={p.uuid}>
                      <Box onClick={() => setLightboxIdx(i)} sx={{ cursor: 'pointer', width: '100%', height: 120, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}>
                        {p.imageUrl
                          ? <Box component="img" src={p.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption" color="text.secondary">…</Typography></Box>}
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
