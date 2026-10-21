import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Chip, Alert, CircularProgress,
  Grid, Autocomplete, MenuItem, Checkbox, FormControlLabel, Divider, LinearProgress, Tooltip,
} from '@mui/material';
import {
  Language as WebsiteIcon, CloudUpload as PushIcon, LocalOffer as TagIcon, CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';
import { fmtDateTime, todayIso } from '../../utils/date';
import { websiteService } from '../../services/websiteService';

// One selectable photo: thumbnail, select toggle, and (when selected) a per-image tag picker.
function PhotoCard({ photo, selected, tags, value, onToggle, onTags }) {
  return (
    <Card variant="outlined" sx={{ borderColor: selected ? 'primary.main' : undefined, borderWidth: selected ? 2 : 1 }}>
      <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={onToggle}>
        <Box sx={{ width: '100%', height: 120, bgcolor: 'action.hover', overflow: 'hidden' }}>
          {photo.imageUrl
            ? <Box component="img" src={photo.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption" color="text.secondary">no preview</Typography></Box>}
        </Box>
        {selected && <CheckIcon color="primary" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: '#fff', borderRadius: '50%' }} />}
      </Box>
      {selected && (
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Autocomplete
            multiple size="small" options={tags} getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={value}
            onChange={(_, v) => onTags(v.map((t) => t.id))}
            renderInput={(params) => <TextField {...params} placeholder="tags" variant="standard" />}
            renderTags={(val, getTagProps) => val.map((o, i) => <Chip size="small" label={o.name} {...getTagProps({ index: i })} key={o.id} />)}
          />
        </CardContent>
      )}
    </Card>
  );
}

export default function WebsitePublish() {
  const { user } = useAuth();
  const allowed = can(user, ACTIONS.WEBSITE_PUBLISH);

  const [config, setConfig] = useState({ enabled: false, eventTypes: [], academicSessions: [] });
  const [tags, setTags] = useState([]);
  const [moments, setMoments] = useState([]);
  const [momentId, setMomentId] = useState('');
  const [moment, setMoment] = useState(null);
  const [loadingMoment, setLoadingMoment] = useState(false);

  // selection: photoId -> string[] of tag ids. A photo is "selected" iff present here.
  const [photoTags, setPhotoTags] = useState({});
  const [bulkTags, setBulkTags] = useState([]);

  // event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [eventDate, setEventDate] = useState(todayIso());
  const [eventType, setEventType] = useState([]);
  const [academicSession, setAcademicSession] = useState([]);
  const [entryTags, setEntryTags] = useState([]);
  const [doPublish, setDoPublish] = useState(false);

  const [pubs, setPubs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pollId, setPollId] = useState(null);
  const [pollStatus, setPollStatus] = useState(null); // { pushStatus, pushDetail }
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const loadPubs = useCallback(async () => {
    try { setPubs(await websiteService.listPublications()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    websiteService.config().then(setConfig).catch(() => {});
    websiteService.tags().then((t) => setTags(Array.isArray(t) ? t : [])).catch(() => {});
    websiteService.sourceMoments('published').then((m) => setMoments(Array.isArray(m) ? m : [])).catch(() => {});
    loadPubs();
  }, [allowed, loadPubs]);

  const selectMoment = async (id) => {
    setMomentId(id); setMoment(null); setPhotoTags({});
    if (!id) return;
    setLoadingMoment(true);
    try {
      const m = await websiteService.sourceMoment(id);
      setMoment(m);
      setEventTitle(m?.title || '');
      setEventDetails(m?.body || '');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load moment');
    } finally { setLoadingMoment(false); }
  };

  const togglePhoto = (photoId) => {
    setPhotoTags((prev) => {
      const next = { ...prev };
      if (next[photoId]) delete next[photoId];
      else next[photoId] = [];
      return next;
    });
  };

  const selectedIds = Object.keys(photoTags);

  const applyBulk = () => {
    if (!bulkTags.length || !selectedIds.length) return;
    const ids = bulkTags.map((t) => t.id);
    setPhotoTags((prev) => {
      const next = { ...prev };
      for (const pid of Object.keys(next)) next[pid] = Array.from(new Set([...(next[pid] || []), ...ids]));
      return next;
    });
  };

  const tagObjs = (ids) => (ids || []).map((id) => tags.find((t) => t.id === id)).filter(Boolean);

  const push = async () => {
    setErr(''); setSuccess('');
    if (selectedIds.length < 4 || selectedIds.length > 30) { setErr('Select between 4 and 30 photos.'); return; }
    if (!eventTitle.trim()) { setErr('Event title is required.'); return; }
    if (!eventDetails.trim()) { setErr('Event details are required.'); return; }
    if (!eventType.length) { setErr('Pick at least one event type.'); return; }
    if (!academicSession.length) { setErr('Pick at least one academic session.'); return; }
    setBusy(true);
    try {
      const photos = selectedIds.map((pid) => ({ photoId: pid, tags: photoTags[pid] || [] }));
      const pub = await websiteService.pushEvent({
        sourceMomentId: momentId,
        photos,
        fields: { eventTitle: eventTitle.trim(), eventDetails: eventDetails.trim(), eventDate, eventType, academicSession },
        entryTags,
        publish: doPublish,
      });
      setSuccess('Queued — uploading to the website…');
      setPollId(pub.uuid);
      setPollStatus({ pushStatus: pub.pushStatus, pushDetail: pub.pushDetail });
      await loadPubs();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to queue the push');
    } finally { setBusy(false); }
  };

  // Poll the queued push until done/failed.
  useEffect(() => {
    if (!pollId) return undefined;
    let t;
    const tick = async () => {
      try {
        const p = await websiteService.getPublication(pollId);
        if (!alive.current) return;
        setPollStatus({ pushStatus: p.pushStatus, pushDetail: p.pushDetail });
        if (p.pushStatus === 'done') {
          setSuccess(`Published ${p.assetCount} tagged photos to the website${p.contentfulStatus === 'published' ? ' (live)' : ' (draft in Contentful)'}.`);
          setPollId(null); loadPubs();
          setPhotoTags({}); setBulkTags([]); setEventType([]); setAcademicSession([]); setEntryTags([]);
          return;
        }
        if (p.pushStatus === 'failed') { setErr(`Push failed: ${p.pushDetail || 'unknown error'}`); setPollId(null); loadPubs(); return; }
        t = setTimeout(tick, 2500);
      } catch { t = setTimeout(tick, 4000); }
    };
    t = setTimeout(tick, 2000);
    return () => clearTimeout(t);
  }, [pollId, loadPubs]);

  if (!allowed) {
    return <Box sx={{ p: 2 }}><Typography variant="h5" sx={{ mb: 1 }}>Website</Typography><Alert severity="info">You don't have access to the website publisher.</Alert></Box>;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <WebsiteIcon color="primary" />
        <Typography variant="h5">Publish to Website</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pick a Moment, choose a few photos, tag them (home-page gallery, a club, a house…), and push them to the
        website as a School Event. Tags on each image drive where it appears on the site.
      </Typography>

      {!config.enabled && <Alert severity="warning" sx={{ mb: 2 }}>Website publishing isn't configured for this school.</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {config.enabled && (
        <>
          {/* 1. Source moment */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <TextField select label="Moment to curate from" size="small" fullWidth value={momentId} onChange={(e) => selectMoment(e.target.value)}>
                <MenuItem value="">—</MenuItem>
                {moments.map((m) => (
                  <MenuItem key={m.uuid} value={m.uuid}>{m.title || '(no title)'} — {m.photoCount} photo{m.photoCount === 1 ? '' : 's'}</MenuItem>
                ))}
              </TextField>
            </CardContent>
          </Card>

          {/* 2. Photo selection + tagging */}
          {loadingMoment ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box> : moment && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle2">{selectedIds.length} selected</Typography>
                  <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Autocomplete
                      multiple size="small" options={tags} getOptionLabel={(o) => o.name}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      value={bulkTags} onChange={(_, v) => setBulkTags(v)}
                      renderInput={(params) => <TextField {...params} label="Tags to apply in bulk" placeholder="e.g. Gallery: Home Page" />}
                    />
                  </Box>
                  <Button startIcon={<TagIcon />} variant="outlined" onClick={applyBulk} disabled={!bulkTags.length || !selectedIds.length}>
                    Apply to {selectedIds.length} selected
                  </Button>
                </Stack>
                <Grid container spacing={1}>
                  {(moment.photos || []).map((p) => (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={p.photoId}>
                      <PhotoCard
                        photo={p}
                        selected={!!photoTags[p.photoId]}
                        tags={tags}
                        value={tagObjs(photoTags[p.photoId])}
                        onToggle={() => togglePhoto(p.photoId)}
                        onTags={(ids) => setPhotoTags((prev) => ({ ...prev, [p.photoId]: ids }))}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* 3. Event form + push */}
          {moment && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>School Event details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}><TextField label="Event title" size="small" fullWidth value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} /></Grid>
                  <Grid item xs={12} md={4}><TextField label="Event date" type="date" size="small" fullWidth value={eventDate} onChange={(e) => setEventDate(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
                  <Grid item xs={12}><TextField label="Event details" size="small" fullWidth multiline minRows={2} value={eventDetails} onChange={(e) => setEventDetails(e.target.value)} /></Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete multiple size="small" options={config.eventTypes} value={eventType} onChange={(_, v) => setEventType(v)}
                      renderInput={(params) => <TextField {...params} label="Event type" placeholder="e.g. Celebration" />} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete multiple size="small" options={config.academicSessions} value={academicSession} onChange={(_, v) => setAcademicSession(v)}
                      renderInput={(params) => <TextField {...params} label="Academic session" placeholder="e.g. 2026-2027" />} />
                  </Grid>
                  <Grid item xs={12}>
                    <Autocomplete multiple size="small" options={tags} getOptionLabel={(o) => o.name} isOptionEqualToValue={(o, v) => o.id === v.id}
                      value={tagObjs(entryTags)} onChange={(_, v) => setEntryTags(v.map((t) => t.id))}
                      renderInput={(params) => <TextField {...params} label="Entry tags (optional)" />} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel control={<Checkbox checked={doPublish} onChange={(e) => setDoPublish(e.target.checked)} />}
                      label="Publish live on Contentful now (otherwise it's created as a draft for you to review)" />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" startIcon={<PushIcon />} onClick={push} disabled={busy || !!pollId}>
                      {busy ? 'Queuing…' : 'Push to website'}
                    </Button>
                    {pollId && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">Uploading… {pollStatus?.pushDetail || ''}</Typography>
                        <LinearProgress sx={{ mt: 0.5 }} />
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Recent publications */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Recent website pushes</Typography>
          {pubs.length === 0 ? <Typography variant="body2" color="text.secondary">Nothing pushed yet.</Typography> : (
            <Stack spacing={1}>
              {pubs.map((p) => (
                <Card key={p.uuid} variant="outlined"><CardContent sx={{ py: 1.2, '&:last-child': { pb: 1.2 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>{p.title || '(untitled)'}</Typography>
                    <Chip size="small" label={
                      p.pushStatus === 'done' ? (p.contentfulStatus === 'published' ? 'Published' : 'Draft in CMS')
                        : p.pushStatus === 'failed' ? 'Failed' : (p.pushDetail || p.pushStatus)
                    } color={p.pushStatus === 'done' ? (p.contentfulStatus === 'published' ? 'success' : 'default') : p.pushStatus === 'failed' ? 'error' : 'info'}
                      variant={p.pushStatus === 'done' && p.contentfulStatus === 'published' ? 'filled' : 'outlined'} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {p.assetCount} photos{p.createdbyName ? ` · ${p.createdbyName}` : ''}{p.createdAt ? ` · ${fmtDateTime(p.createdAt)}` : ''}
                    {p.pushStatus === 'done' && p.contentfulStatus !== 'published' && (
                      <Button size="small" sx={{ ml: 1 }} onClick={async () => { try { await websiteService.publish(p.uuid); await loadPubs(); setSuccess('Published live.'); } catch (e) { setErr(e.response?.data?.error?.description || 'Publish failed'); } }}>Publish live</Button>
                    )}
                  </Typography>
                </CardContent></Card>
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
