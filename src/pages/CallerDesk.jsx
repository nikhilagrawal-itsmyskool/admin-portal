import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Chip, Button,
  IconButton, TextField, InputAdornment, Collapse, Divider, MenuItem,
} from '@mui/material';
import {
  Refresh, Search as SearchIcon, Clear as ClearIcon, Phone as PhoneIcon,
  ExpandMore, ExpandLess, Check as CheckIcon,
} from '@mui/icons-material';
import { feesService } from '../services/feesService';
import { inr, errMsg, classRank } from './fees/feesUi';

// Locked single-screen tele-caller desk (role `fee-caller`): the defaulter worklist with
// tap-to-call father/mother numbers and a one-tap "log the call" under each card. Reuses the
// manager topDues engine (dues + unmasked contacts + latest follow-up) and the fees-ext
// follow-up endpoints (gated fee.manager.view).
const C = { bg: '#f4f7fb', card: '#fff', ink: '#0f172a', muted: '#64748b', due: '#b91c1c', fees: '#0f766e', line: '#e6ebf2' };
const REL_LABEL = { father: 'Father', mother: 'Mother', guardian: 'Guardian' };
const relLabel = (r) => REL_LABEL[r] || (r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Contact');
const STATUSES = [
  { v: 'called', label: 'Called', color: '#0369a1', bg: '#e0f2fe' },
  { v: 'promised', label: 'Promised', color: '#b45309', bg: '#fef3c7' },
  { v: 'unreachable', label: 'Unreachable', color: '#475569', bg: '#eef2f7' },
  { v: 'settled', label: 'Settled', color: '#15803d', bg: '#dcfce7' },
];
const stMeta = (v) => STATUSES.find((s) => s.v === v);
const ago = (iso) => {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`;
};

// Module-level so it keeps a stable identity across renders. (Defined inside the component it would
// be a NEW type every render → React remounts the whole tree each keystroke → the search box loses
// focus after one character. This is the "type a letter and it goes away" bug.)
const Shell = ({ children }) => (
  <Box sx={{ minHeight: '100vh', bgcolor: C.bg }}>
    <Box sx={{ maxWidth: 520, mx: 'auto', px: 1.5, pb: 6, pt: 1 }}>{children}</Box>
  </Box>
);

export default function CallerDesk() {
  const [currentAy, setCurrentAy] = useState(null);
  const [data, setData] = useState(null); // topDues response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState(''); // '' = all classes
  const [hideSettled, setHideSettled] = useState(true);
  const [scope, setScope] = useState('year'); // 'year' = current AY dues | 'all' = accumulated across years
  const [openId, setOpenId] = useState(null); // expanded card
  const [history, setHistory] = useState({}); // studentId -> {entries} call-log peek
  const [log, setLog] = useState({ status: '', note: '', promisedDate: '', saving: false });
  const [ok, setOk] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const sm = await feesService.getManagerSummary().catch(() => null);
      const ay = sm?.years?.[0]?.academicYearId || null;
      setCurrentAy(ay);
      setData(await feesService.getManagerTopDues(ay));
    } catch (e) { setError(errMsg(e, 'Could not load the call list')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCard = (id) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id); setLog({ status: '', note: '', promisedDate: '', saving: false }); setOk('');
    if (!history[id]) {
      feesService.getCallerFollowup(id, currentAy)
        .then((r) => setHistory((h) => ({ ...h, [id]: r?.entries || [] })))
        .catch(() => setHistory((h) => ({ ...h, [id]: [] })));
    }
  };

  const saveLog = async (studentId) => {
    if (!log.status) { setError('Pick an outcome first.'); return; }
    setLog((l) => ({ ...l, saving: true })); setError('');
    try {
      await feesService.setCallerFollowup(studentId, {
        academicYearId: currentAy, status: log.status, note: log.note.trim() || null,
        promisedDate: log.status === 'promised' ? (log.promisedDate || null) : null,
      });
      // reflect on the card + refresh the peek
      setData((d) => ({ ...d, rows: (d.rows || []).map((r) => r.studentId === studentId ? { ...r, followup: { status: log.status, at: new Date().toISOString() } } : r) }));
      setHistory((h) => ({ ...h, [studentId]: undefined }));
      feesService.getCallerFollowup(studentId, currentAy).then((r) => setHistory((h) => ({ ...h, [studentId]: r?.entries || [] }))).catch(() => {});
      setOk('Call logged.');
      setLog({ status: '', note: '', promisedDate: '', saving: false });
      if (log.status === 'settled') setOpenId(null);
    } catch (e) { setError(errMsg(e, 'Could not save')); setLog((l) => ({ ...l, saving: false })); }
  };

  const cols = data?.columns || [];
  const curAyId = data?.currentAcademicYearId || cols.find((c) => c.isCurrent)?.academicYearId || null;
  const curName = cols.find((c) => c.isCurrent)?.name || 'This year';
  // amount shown depends on scope: current academic year's dues, or the accumulated all-years total.
  const amt = (r) => (scope === 'all' ? Number(r.total || 0) : Number((curAyId && r.byYear?.[curAyId]) || 0));
  const prior = (r) => Math.max(0, Number(r.total || 0) - Number((curAyId && r.byYear?.[curAyId]) || 0));

  const classList = useMemo(() => {
    const set = new Set((data?.rows || []).map((r) => r.className).filter((c) => c && c !== '—'));
    return [...set].sort((a, b) => classRank(a) - classRank(b));
  }, [data]);

  const rows = useMemo(() => {
    let r = data?.rows || [];
    if (hideSettled) r = r.filter((x) => x.followup?.status !== 'settled');
    if (classFilter) r = r.filter((x) => x.className === classFilter);
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((x) => (x.name || '').toLowerCase().includes(t) || (x.className || '').toLowerCase().includes(t)
      || (x.admissionNumber || '').toLowerCase().includes(t)
      || (x.contacts || []).some((c) => (c.mobile || '').includes(t) || (c.name || '').toLowerCase().includes(t)));
    r = r.filter((x) => amt(x) > 0.5); // only those who owe in the chosen scope
    return [...r].sort((a, b) => amt(b) - amt(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hideSettled, classFilter, q, scope, curAyId]);

  const scopedTotal = rows.reduce((s, r) => s + amt(r), 0);

  if (loading) return <Shell><Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box></Shell>;

  return (
    <Shell>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1.5, pb: 1 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: C.ink }}>Fee Calls</Typography>
        <IconButton onClick={load} sx={{ color: C.muted }} title="Refresh"><Refresh /></IconButton>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setOk('')}>{ok}</Alert>}

      <Card sx={{ borderRadius: 4, mb: 2, bgcolor: '#0f172a' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 13, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>TO CALL</Typography>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#e2e8f0' }}>{rows.length}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>{scope === 'all' ? 'dues · all years' : `dues · ${curName}`}</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#fca5a5' }}>{inr(scopedTotal)}</Typography>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.25 }}>
        <TextField size="small" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Name or phone…" sx={{ flex: 1, bgcolor: '#fff', borderRadius: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            endAdornment: q ? <InputAdornment position="end"><IconButton size="small" onClick={() => setQ('')}><ClearIcon /></IconButton></InputAdornment> : null }} />
        <TextField select size="small" label="Class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
          sx={{ minWidth: 118, bgcolor: '#fff' }}>
          <MenuItem value="">All classes</MenuItem>
          {classList.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.75, mb: 1 }}>
        {[['year', curName], ['all', 'All years']].map(([v, label]) => (
          <Box key={v} onClick={() => setScope(v)}
            sx={{ flex: 1, textAlign: 'center', py: 0.75, borderRadius: 2, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              bgcolor: scope === v ? C.ink : '#eef2f7', color: scope === v ? '#fff' : C.ink }}>
            {label}
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
        <Typography sx={{ fontSize: 12, color: C.muted }}>{rows.length} student{rows.length === 1 ? '' : 's'} · biggest first</Typography>
        <Box onClick={() => setHideSettled((v) => !v)}
          sx={{ px: 1.25, py: 0.4, borderRadius: 5, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, bgcolor: hideSettled ? C.ink : '#eef2f7', color: hideSettled ? '#fff' : C.ink }}>
          {hideSettled ? 'Hiding settled' : 'Showing all'}
        </Box>
      </Box>

      {rows.length === 0 && <Card sx={{ borderRadius: 3 }}><CardContent><Typography sx={{ textAlign: 'center', color: C.muted, py: 3 }}>No one to call. 🎉</Typography></CardContent></Card>}

      {rows.map((r, i) => {
        const open = openId === r.studentId;
        const sm = stMeta(r.followup?.status);
        return (
          <Card key={r.studentId} sx={{ borderRadius: 3, mb: 1.25, overflow: 'hidden' }}>
            <Box onClick={() => openCard(r.studentId)} sx={{ cursor: 'pointer', px: 1.75, py: 1.5, '&:active': { bgcolor: '#f1f5f9' } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: C.ink }} noWrap>
                    <span style={{ color: C.muted, fontWeight: 800 }}>{i + 1}. </span>{r.name}
                    {r.hasLeft && <Chip size="small" label="left" variant="outlined" sx={{ ml: 0.75, height: 18, fontSize: 10 }} />}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: C.muted }}>{r.className}{r.admissionNumber ? ` · ${r.admissionNumber}` : ''}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right', flex: 'none' }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 800, color: C.due, whiteSpace: 'nowrap' }}>{inr(amt(r))}</Typography>
                  {scope === 'year' && prior(r) > 0.5 && <Typography sx={{ fontSize: 10.5, color: C.muted, whiteSpace: 'nowrap', lineHeight: 1.2 }}>+ {inr(prior(r))} earlier yrs</Typography>}
                  {sm && <Chip size="small" label={`${sm.label}${r.followup?.at ? ` · ${ago(r.followup.at)}` : ''}`} sx={{ height: 19, fontSize: 10.5, fontWeight: 700, color: sm.color, bgcolor: sm.bg, mt: 0.25 }} />}
                </Box>
                <Box sx={{ alignSelf: 'center', color: C.muted }}>{open ? <ExpandLess /> : <ExpandMore />}</Box>
              </Box>
            </Box>

            <Collapse in={open} unmountOnExit>
              <Divider sx={{ borderColor: C.line }} />
              <Box sx={{ px: 1.75, py: 1.5 }}>
                {/* dues by year */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
                  {cols.filter((c) => Number(r.byYear?.[c.academicYearId] || 0) > 0).map((c) => (
                    <Chip key={c.academicYearId} size="small" variant="outlined"
                      sx={{ height: 22, fontSize: 11, borderColor: c.isCurrent ? C.fees : C.line, color: c.isCurrent ? C.fees : C.ink }}
                      label={`${c.name}${c.isCurrent ? '*' : ''}: ${inr(r.byYear[c.academicYearId])}`} />
                  ))}
                </Box>

                {/* call buttons (tap places the call) */}
                {(r.contacts || []).filter((c) => c.mobile).length === 0
                  ? <Typography sx={{ fontSize: 12.5, color: C.muted, mb: 1 }}>No phone number on record.</Typography>
                  : (r.contacts || []).filter((c) => c.mobile).map((c, k) => (
                    <Button key={k} fullWidth component="a" href={`tel:${c.mobile}`} startIcon={<PhoneIcon />}
                      variant="contained" sx={{ mb: 0.75, justifyContent: 'flex-start', textTransform: 'none', bgcolor: C.fees, fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#0b5a53' } }}>
                      Call {relLabel(c.relation)}{c.name ? ` — ${c.name}` : ''} · {c.mobile}
                    </Button>
                  ))}

                {/* recent call log */}
                {Array.isArray(history[r.studentId]) && history[r.studentId].length > 0 && (
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Typography sx={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.25 }}>Recent</Typography>
                    {history[r.studentId].slice(0, 3).map((e) => {
                      const es = stMeta(e.status);
                      return (
                        <Typography key={e.uuid} sx={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
                          <span style={{ color: es?.color || C.muted, fontWeight: 700 }}>{es?.label || '—'}</span>
                          <span style={{ color: C.muted }}> · {ago(e.createdAt)}{e.note ? ` — ${e.note}` : ''}</span>
                        </Typography>
                      );
                    })}
                  </Box>
                )}

                {/* log this call */}
                <Typography sx={{ fontSize: 12, color: C.muted, fontWeight: 700, mt: 1, mb: 0.5 }}>Log this call</Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                  {STATUSES.map((s) => {
                    const sel = log.status === s.v;
                    return (
                      <Box key={s.v} onClick={() => setLog((l) => ({ ...l, status: s.v }))}
                        sx={{ px: 1.25, py: 0.6, borderRadius: 2, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          border: `1.5px solid ${sel ? s.color : C.line}`, color: sel ? '#fff' : s.color, bgcolor: sel ? s.color : s.bg }}>
                        {s.label}
                      </Box>
                    );
                  })}
                </Box>
                {log.status === 'promised' && (
                  <TextField type="date" size="small" fullWidth label="Promised by" InputLabelProps={{ shrink: true }}
                    value={log.promisedDate} onChange={(e) => setLog((l) => ({ ...l, promisedDate: e.target.value }))} sx={{ mb: 1, bgcolor: '#fff' }} />
                )}
                <TextField size="small" fullWidth multiline minRows={2} placeholder="Note (what the parent said)…"
                  value={log.note} onChange={(e) => setLog((l) => ({ ...l, note: e.target.value }))} sx={{ mb: 1, bgcolor: '#fff' }} />
                <Button fullWidth variant="contained" startIcon={<CheckIcon />} disabled={!log.status || log.saving}
                  onClick={() => saveLog(r.studentId)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                  {log.saving ? 'Saving…' : 'Save call'}
                </Button>
              </Box>
            </Collapse>
          </Card>
        );
      })}
    </Shell>
  );
}
