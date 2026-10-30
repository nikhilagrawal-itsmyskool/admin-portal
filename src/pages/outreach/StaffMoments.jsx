import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Box, Typography, Stack, Alert, CircularProgress } from '@mui/material';
import { OndemandVideo as VideoIcon } from '@mui/icons-material';
import PhotoLightbox from './PhotoLightbox';
import { outreachService, REACTION_EMOJI } from '../../services/outreachService';

const FULLMON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKeyOf(iso) {
  if (!iso) return '0000-00';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '0000-00';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
// Month only — a feed is one academic year, so the year is redundant noise.
function monthLabelOf(key) {
  const [y, m] = key.split('-').map(Number);
  return y ? FULLMON[m - 1] : 'Earlier';
}
function whenLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  if (d.toDateString() === new Date().toDateString()) return 'Today';
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

const PREVIEW_TILES = 4;

// Read-only reaction tally (staff don't react — they just see how parents responded).
function ReactionTally({ reactions }) {
  if (!reactions || !reactions.total) {
    return <Typography variant="caption" color="text.secondary">No reactions yet</Typography>;
  }
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
      {Object.entries(reactions.counts).filter(([, n]) => n > 0).map(([k, n]) => (
        <Typography key={k} variant="caption" color="text.secondary">{REACTION_EMOJI[k] || k} {n}</Typography>
      ))}
    </Stack>
  );
}

// One moment card: header + title/body, inline photo mosaic, videos, reaction tally.
function MomentCard({ m, onOpenPhoto }) {
  const photos = (m.photos || []).filter((p) => p.imageUrl);
  const header = [m.authorName, whenLabel(m.publishedAt || m.createdAt)].filter(Boolean).join(' · ');
  const extra = photos.length - PREVIEW_TILES;

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, overflow: 'hidden', mt: 1.75 }}>
      <Box sx={{ px: 2, pt: 1.75 }}>
        {header && <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.3 }}>{header}</Typography>}
        {m.title && <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>{m.title}</Typography>}
        {m.body && <Typography variant="body2" color="text.secondary" sx={{ mt: m.title ? 0.4 : 0.5, whiteSpace: 'pre-wrap' }}>{m.body}</Typography>}
      </Box>

      {/* photos */}
      {photos.length === 1 ? (
        <Box onClick={() => onOpenPhoto(photos, 0)}
          sx={{ mt: 1.5, cursor: 'pointer', width: '100%', height: 240, bgcolor: 'action.hover' }}>
          <Box component="img" src={photos[0].imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </Box>
      ) : photos.length > 1 ? (
        <Box sx={{ mt: 1.5, px: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
          {photos.slice(0, PREVIEW_TILES).map((p, i) => {
            const showMore = i === PREVIEW_TILES - 1 && extra > 0;
            return (
              <Box key={p.uuid} onClick={() => onOpenPhoto(photos, i)}
                sx={{ position: 'relative', cursor: 'pointer', aspectRatio: '1 / 1', borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
                <Box component="img" src={p.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {showMore && (
                  <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>+{extra}</Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      ) : null}

      {/* videos */}
      {Array.isArray(m.videos) && m.videos.length > 0 && (
        <Stack spacing={1} sx={{ px: 2, mt: 1.5 }}>
          {m.videos.map((v) => (
            v.source === 'r2' && v.videoUrl ? (
              <Box key={v.uuid} component="video" src={v.videoUrl} controls preload="metadata"
                sx={{ width: '100%', maxHeight: 280, borderRadius: 1, bgcolor: '#000', display: 'block' }} />
            ) : (
              <Box key={v.uuid} component="a" href={`https://youtu.be/${v.youtubeId}`} target="_blank" rel="noopener noreferrer"
                sx={{ display: 'block', position: 'relative', borderRadius: 1, overflow: 'hidden', maxWidth: 320 }}>
                <Box component="img" src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`} alt="" sx={{ width: '100%', display: 'block' }} />
                <VideoIcon sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontSize: 40, filter: 'drop-shadow(0 0 4px rgba(0,0,0,.6))' }} />
              </Box>
            )
          ))}
        </Stack>
      )}

      <Box sx={{ px: 2, py: 1.25, mt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <ReactionTally reactions={m.reactions} />
      </Box>
    </Box>
  );
}

// Read-only Moments feed for ALL staff — mirrors the parent app: a scrollable feed of cards
// (inline photo mosaic → full-screen swipe viewer), grouped by month, with a floating
// current-month pill on scroll. Backed by /outreach/staff/feed (any logged-in employee).
export default function StaffMoments() {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [viewer, setViewer] = useState(null); // { photos, index }
  const [curMonth, setCurMonth] = useState(null);
  const [scrolling, setScrolling] = useState(false);
  const sectionRefs = useRef({});

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const data = await outreachService.staffFeed();
      setMoments(Array.isArray(data?.moments) ? data.moments : []);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load moments');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group into month sections (feed is already newest-first).
  const sections = useMemo(() => {
    const order = [];
    const by = {};
    for (const m of moments) {
      const k = monthKeyOf(m.publishedAt || m.createdAt);
      if (!by[k]) { by[k] = []; order.push(k); }
      by[k].push(m);
    }
    return order.map((k) => ({ key: k, label: monthLabelOf(k), moments: by[k] }));
  }, [moments]);

  // Track the top-most month + show the pill while scrolling. Capture-phase listener so it
  // works whether the window or an inner layout container is the scroller.
  useEffect(() => {
    let timer = null;
    const onScroll = () => {
      setScrolling(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), 900);
      let cur = sections[0]?.label || null;
      for (const s of sections) {
        const el = sectionRefs.current[s.key];
        if (el && el.getBoundingClientRect().top <= 100) cur = s.label;
      }
      setCurMonth(cur);
    };
    document.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('scroll', onScroll, true); if (timer) clearTimeout(timer); };
  }, [sections]);

  return (
    <Box sx={{ p: 2, maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h6">Moments</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Photos &amp; updates shared with parents across the school.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : moments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>Nothing shared yet.</Typography>
      ) : (
        sections.map((s) => (
          <Box key={s.key}>
            <Typography
              ref={(el) => { sectionRefs.current[s.key] = el; }}
              variant="caption"
              sx={{ display: 'block', mt: 2.25, ml: 0.5, color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}
            >
              {s.label}
            </Typography>
            {s.moments.map((m) => (
              <MomentCard key={m.uuid} m={m} onOpenPhoto={(photos, index) => setViewer({ photos, index })} />
            ))}
          </Box>
        ))
      )}

      {/* Google-Photos-style current-month pill — floats on the right while scrolling. */}
      {scrolling && curMonth && moments.length > 0 && (
        <Box sx={{
          position: 'fixed', right: 14, top: '45%', zIndex: 1300, pointerEvents: 'none',
          bgcolor: 'rgba(0,0,0,0.82)', color: '#fff', px: 1.75, py: 0.75, borderRadius: 999,
          fontSize: 12.5, fontWeight: 700, letterSpacing: 0.3, boxShadow: 3,
        }}>
          {curMonth}
        </Box>
      )}

      {viewer && (
        <PhotoLightbox
          momentId={null}
          photos={viewer.photos}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onIndex={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
        />
      )}
    </Box>
  );
}
