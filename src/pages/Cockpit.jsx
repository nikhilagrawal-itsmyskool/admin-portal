import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Card, CircularProgress, useMediaQuery } from '@mui/material';
import { useNavigate, Navigate } from 'react-router-dom';
import { useCan } from '../permissions/can';
import { ACTIONS } from '../permissions/actions';
import { useAcademicYear } from '../context/AcademicYearContext';
import { todayIso, fmtDate } from '../utils/date';
import { assemblyService } from '../services/assemblyService';
import { feedbackService } from '../services/feedbackService';
import { leaveService } from '../services/leaveService';
import { studentService } from '../services/studentService';
import { syllabusService } from '../services/syllabusService';

// Director's Cockpit / School Pulse — the busy director's at-a-glance heartbeat. Each card
// is a health signal; drill-downs deep-link into the real screen. Fed by the pulse/summary
// endpoints (assembly/pulse, feedback/summary + flow, leave/summary, houses/analytics,
// syllabus/overview, assembly/leaderboard). See the approved mockups.

const C = {
  ink: '#222b45', muted: '#8f9bb3', border: '#e4e9f2', page: '#edf1f7', paper: '#fff',
  primary: '#3366ff', primaryDk: '#274bdb', good: '#2e9e2e', warn: '#e8930c', crit: '#e12d2d',
  serious: '#e0642e', assembly: '#1e88e5', feedback: '#0097a7', leave: '#3d5afe', syllabus: '#8e24aa',
  exams: '#5e35b1', house: '#ec407a',
};
const SHADOW = '0 0.5rem 1rem 0 rgba(44,51,73,0.1)';

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const istMinutes = (signedAt) => { const d = new Date(signedAt); return (d.getUTCHours() * 60 + d.getUTCMinutes() + 330) % 1440; };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const dowLabel = (s) => { const d = new Date(`${s}T00:00:00Z`); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]; };
const dayLabel = (s) => `${dowLabel(s)} ${Number(s.slice(8, 10))}`;

function classifyChecklist(day, dueMin, today) {
  if (!day.signedAt) return day.date < today ? 'miss' : 'pending';
  if (dueMin == null) return 'signed';
  return istMinutes(day.signedAt) > dueMin ? 'late' : 'ontime';
}

// ── small building blocks ──────────────────────────────────────────────────────
function SectionLabel({ children, hint }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 3.5, mb: 1.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{children}</Typography>
      {hint && <Typography sx={{ fontSize: 12.5, color: '#5a6478' }}>— {hint}</Typography>}
      <Box sx={{ flex: 1, height: '1px', bgcolor: C.border }} />
    </Box>
  );
}
function Panel({ title, status, statusColor, legend, children }) {
  return (
    <Card variant="outlined" sx={{ borderColor: C.border, borderRadius: 2, boxShadow: SHADOW, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5, mb: 0.5 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 650, color: C.ink }}>{title}</Typography>
        {status && (
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: statusColor || C.muted, display: 'inline-flex', alignItems: 'center', gap: 0.7, whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusColor || C.muted }} />{status}
          </Typography>
        )}
      </Box>
      {legend && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.6, fontSize: 11.5, color: C.muted, mb: 1 }}>{legend}</Box>}
      {children}
    </Card>
  );
}
const Leg = ({ c, square, children }) => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
    <Box component="span" sx={{ width: 9, height: 9, borderRadius: square ? '2px' : '50%', bgcolor: c === 'ring' ? 'transparent' : c, border: c === 'ring' ? `1.5px solid ${C.crit}` : 'none' }} />{children}
  </Box>
);
function Detail({ children, onOpen, openLabel }) {
  return (
    <Box sx={{ mt: 1.2, bgcolor: C.page, border: `1px solid ${C.border}`, borderRadius: 1.5, px: 1.5, py: 1, fontSize: 13, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, minHeight: 40 }}>
      {children}
      {onOpen && <Box component="a" onClick={onOpen} sx={{ ml: 'auto', color: C.primary, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{openLabel} ›</Box>}
    </Box>
  );
}
const Who = ({ c = C.crit, children }) => (
  <Box component="span" sx={{ fontSize: 12, fontWeight: 600, px: 1, py: 0.2, borderRadius: 1, bgcolor: `${c}1f`, color: c }}>{children}</Box>
);

// ── checklist on-time timeline (time up the y-axis) ─────────────────────────────
function ChecklistChart({ days, dueMin, today, onPick }) {
  const W = 760, L = 46, R = 748, T = 42, B = 196;
  const times = days.filter((d) => d.signedAt).map((d) => istMinutes(d.signedAt));
  let lo = Math.min(...times, dueMin ?? Infinity), hi = Math.max(...times, dueMin ?? -Infinity);
  if (!isFinite(lo) || !isFinite(hi)) { lo = 7 * 60; hi = 8 * 60; }
  lo -= 12; hi += 12; if (hi - lo < 30) { hi = lo + 30; }
  const x = (i) => L + ((R - L) * (i + 0.5)) / Math.max(days.length, 1);
  const y = (m) => B - ((B - T) * (m - lo)) / (hi - lo);
  const ticks = [lo, (lo + hi) / 2, hi].map(Math.round);
  const els = [];
  if (dueMin != null) {
    els.push(<rect key="zg" x={L} y={y(dueMin)} width={R - L} height={B - y(dueMin)} fill={C.good} opacity={0.06} />);
    els.push(<rect key="zw" x={L} y={T} width={R - L} height={y(dueMin) - T} fill={C.warn} opacity={0.07} />);
  }
  ticks.forEach((m, k) => {
    els.push(<line key={`gl${k}`} x1={L} y1={y(m)} x2={R} y2={y(m)} stroke={C.border} />);
    els.push(<text key={`gt${k}`} x={L - 8} y={y(m) + 3.5} textAnchor="end" fontSize="10" fill={C.muted}>{hhmm(m)}</text>);
  });
  if (dueMin != null) {
    els.push(<line key="due" x1={L} y1={y(dueMin)} x2={R} y2={y(dueMin)} stroke={C.serious} strokeWidth="1.6" strokeDasharray="5 4" />);
    els.push(<text key="duel" x={R} y={y(dueMin) - 6} textAnchor="end" fontSize="10.5" fontWeight="700" fill={C.serious}>DUE {hhmm(dueMin)}</text>);
  }
  // house-on-duty bands
  let bandStart = 0;
  for (let i = 1; i <= days.length; i++) {
    if (i === days.length || days[i].house !== days[bandStart].house) {
      const cx = (x(bandStart) + x(i - 1)) / 2;
      if (days[bandStart].house) els.push(<text key={`hb${bandStart}`} x={cx} y={T - 12} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.ink}>{days[bandStart].house} on duty</text>);
      if (i < days.length) els.push(<line key={`hs${i}`} x1={(x(i - 1) + x(i)) / 2} y1={T - 6} x2={(x(i - 1) + x(i)) / 2} y2={B} stroke={C.border} />);
      bandStart = i;
    }
  }
  days.forEach((d, i) => {
    const cx = x(i), status = classifyChecklist(d, dueMin, today);
    els.push(<g key={`g${i}`} style={{ cursor: 'pointer' }} onClick={() => onPick(i)}>
      <rect x={cx - 24} y={T - 6} width={48} height={B - T + 30} fill="transparent" />
      <text x={cx} y={B + 16} textAnchor="middle" fontSize="9.5" fill={C.muted}>{dayLabel(d.date)}</text>
      {status === 'miss' && <><g stroke={C.crit} strokeWidth="2.2" strokeLinecap="round"><line x1={cx - 4} y1={T + 4} x2={cx + 4} y2={T + 12} /><line x1={cx + 4} y1={T + 4} x2={cx - 4} y2={T + 12} /></g><text x={cx} y={T + 24} textAnchor="middle" fontSize="8" fontWeight="700" fill={C.crit}>MISS</text></>}
      {status === 'pending' && <><circle cx={cx} cy={dueMin != null ? y(dueMin) : (T + B) / 2} r="5" fill="none" stroke={C.muted} strokeWidth="1.6" strokeDasharray="2 2" /><text x={cx} y={(dueMin != null ? y(dueMin) : (T + B) / 2) + 18} textAnchor="middle" fontSize="8" fontWeight="700" fill={C.muted}>NOW</text></>}
      {(status === 'ontime' || status === 'late' || status === 'signed') && (() => {
        const m = istMinutes(d.signedAt), col = status === 'late' ? C.warn : status === 'ontime' ? C.good : C.primary;
        return <><circle cx={cx} cy={y(m)} r="5.5" fill={col} /><text x={cx} y={y(m) + (status === 'late' ? -10 : 16)} textAnchor="middle" fontSize="9" fontWeight="600" fill={col}>{hhmm(m)}</text></>;
      })()}
    </g>);
  });
  return <Box sx={{ overflowX: 'auto' }}><svg viewBox={`0 0 ${W} 236`} style={{ width: '100%', minWidth: 520, height: 'auto', display: 'block' }}>{els}</svg></Box>;
}

// ── evaluator daily coverage matrix ─────────────────────────────────────────────
function EvaluatorMatrix({ days, evalTotal, sel, onPick }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', gap: '2px', minWidth: 440 }}>
        {days.map((d, i) => {
          const total = Math.max(d.expected, evalTotal, 1);
          const cnt = d.submitted, full = cnt >= d.expected && d.expected > 0;
          const isFuture = d.expected === 0;
          const cc = isFuture ? C.muted : full ? C.good : C.warn;
          return (
            <Box key={i} onClick={() => onPick(i)} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.7, py: 0.6, borderRadius: 1.5, cursor: 'pointer', bgcolor: sel === i ? `${C.primary}17` : 'transparent', outline: sel === i ? `1.5px solid ${C.primary}66` : 'none' }}>
              <Typography sx={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{dayLabel(d.date).replace(' ', '')}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {Array.from({ length: total }).map((_, k) => (
                  <Box key={k} sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: k < cnt ? C.good : 'transparent', border: k < cnt ? 'none' : `1.5px solid ${k < d.expected ? C.crit : C.border}` }} />
                ))}
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: cc }}>{cnt}/{d.expected || evalTotal}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ── generic vertical-bar / grouped-bar / line chart via inline svg ──────────────
function svgWrap(children, vbH) {
  return <Box sx={{ overflowX: 'auto' }}><svg viewBox={`0 0 760 ${vbH}`} style={{ width: '100%', minWidth: 520, height: 'auto', display: 'block' }}>{children}</svg></Box>;
}

function FeedbackFlow({ weeks, onPick }) {
  const L = 40, R = 748, T = 16, B = 170, n = weeks.length;
  const max = Math.max(4, ...weeks.map((w) => Math.max(w.opened, w.resolved))) + 2;
  const bw = (R - L) / Math.max(n, 1), gw = bw * 0.3, y = (v) => B - ((B - T) * v) / max;
  const els = [];
  [0, Math.round(max / 2), max].forEach((v, k) => { els.push(<line key={`g${k}`} x1={L} y1={y(v)} x2={R} y2={y(v)} stroke={C.border} />); els.push(<text key={`t${k}`} x={L - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill={C.muted}>{v}</text>); });
  weeks.forEach((w, i) => {
    const cx = L + bw * (i + 0.5);
    els.push(<g key={`w${i}`} style={{ cursor: 'pointer' }} onClick={() => onPick(i)}>
      <rect x={L + bw * i} y={T} width={bw} height={B - T + 22} fill="transparent" />
      <rect x={cx - gw - 1} y={y(w.opened)} width={gw} height={B - y(w.opened)} rx="3" fill={C.serious} />
      <rect x={cx + 1} y={y(w.resolved)} width={gw} height={B - y(w.resolved)} rx="3" fill={C.good} />
      <text x={cx} y={B + 16} textAnchor="middle" fontSize="9" fill={C.muted}>{fmtWeek(w.weekStart)}</text>
    </g>);
  });
  return svgWrap(els, 200);
}
function BacklogLine({ weeks }) {
  const L = 40, R = 748, T = 16, B = 170, n = weeks.length;
  const vals = weeks.map((w) => w.backlog), max = Math.max(4, ...vals) + 3;
  const step = (R - L) / Math.max(n - 1, 1), y = (v) => B - ((B - T) * v) / max;
  const pts = vals.map((v, i) => [L + step * i, y(v)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const els = [];
  [0, Math.round(max / 2), max].forEach((v, k) => { els.push(<line key={`g${k}`} x1={L} y1={y(v)} x2={R} y2={y(v)} stroke={C.border} />); els.push(<text key={`t${k}`} x={L - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill={C.muted}>{v}</text>); });
  els.push(<path key="area" d={`${line} L${pts[n - 1][0]} ${B} L${pts[0][0]} ${B} Z`} fill={C.crit} opacity={0.11} />);
  els.push(<path key="line" d={line} fill="none" stroke={C.crit} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />);
  pts.forEach((p, i) => { els.push(<circle key={`c${i}`} cx={p[0]} cy={p[1]} r={i === n - 1 ? 4.5 : 3} fill={C.crit} />); els.push(<text key={`x${i}`} x={p[0]} y={B + 16} textAnchor="middle" fontSize="9" fill={C.muted}>{fmtWeek(weeks[i].weekStart)}</text>); });
  return svgWrap(els, 200);
}
const fmtWeek = (s) => `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(s.slice(5, 7)) - 1]} ${Number(s.slice(8, 10))}`;

function LeaveBars({ days, sel, onPick }) {
  const L = 40, R = 748, T = 18, B = 150, n = days.length;
  const max = Math.max(2, ...days.map((d) => d.count)) + 1;
  const bw = (R - L) / Math.max(n, 1), pad = bw * 0.24, y = (v) => B - ((B - T) * v) / max;
  const els = [];
  [0, Math.round(max / 2), max].forEach((v, k) => { els.push(<line key={`g${k}`} x1={L} y1={y(v)} x2={R} y2={y(v)} stroke={C.border} />); els.push(<text key={`t${k}`} x={L - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill={C.muted}>{v}</text>); });
  days.forEach((d, i) => {
    const isToday = i === n - 1, col = isToday ? C.primaryDk : d.count >= 4 ? C.warn : '#7fa5ff', cx = L + bw * i;
    els.push(<g key={`d${i}`} style={{ cursor: 'pointer' }} onClick={() => onPick(i)}>
      <rect x={cx} y={T} width={bw} height={B - T + 22} fill="transparent" />
      {sel === i && <rect x={cx + pad - 2} y={y(d.count) - 2} width={bw - pad * 2 + 4} height={B - y(d.count) + 2} rx="4" fill="none" stroke={`${C.primary}66`} strokeWidth="1.5" />}
      <rect x={cx + pad} y={y(d.count)} width={bw - pad * 2} height={B - y(d.count)} rx="3" fill={col} />
      <text x={cx + bw / 2} y={y(d.count) - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill={col}>{d.count}</text>
      <text x={cx + bw / 2} y={B + 16} textAnchor="middle" fontSize="9" fill={C.muted}>{isToday ? 'Today' : dayLabel(d.date)}</text>
    </g>);
  });
  return svgWrap(els, 174);
}

// ── main page ───────────────────────────────────────────────────────────────────
export default function Cockpit() {
  const can = useCan();
  const navigate = useNavigate();
  const { academicYearId } = useAcademicYear();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [sel, setSel] = useState({ cl: -1, ev: -1, fb: -1, lv: -1 });

  const today = todayIso();
  const range = useMemo(() => ({ to: today, from: addDays(today, isMobile ? -8 : -15) }), [today, isMobile]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setErr(false);
      const ay = academicYearId || undefined;
      const soft = (p) => p.catch(() => null);
      const [pulse, fbSummary, fbFlow, leave, houses, syllabus, leaderboard] = await Promise.all([
        soft(assemblyService.getPulse(range.from, range.to)),
        soft(feedbackService.summary(ay)),
        soft(feedbackService.flow({ weeks: 8, academicYearId: ay })),
        soft(leaveService.summary(range.from, range.to)),
        ay ? soft(studentService.getHouseAnalytics(ay)) : Promise.resolve(null),
        soft(syllabusService.getOverview({ academicYearId: ay })),
        soft(assemblyService.getLeaderboard(addDays(today, -95), today)),
      ]);
      if (!alive) return;
      setData({ pulse, fbSummary, fbFlow, leave, houses, syllabus, leaderboard });
    })().catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [range.from, range.to, academicYearId, today]);

  if (!can(ACTIONS.COCKPIT_VIEW)) return <Navigate to="/" replace />;

  if (!data) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><CircularProgress /></Box>;
  }

  const { pulse, fbSummary, fbFlow, leave, houses, syllabus, leaderboard } = data;
  const tail = (arr, n) => (arr && arr.length > n ? arr.slice(arr.length - n) : arr || []);
  const dueMin = pulse && pulse.dueTime ? (() => { const [h, m] = pulse.dueTime.split(':').map(Number); return h * 60 + m; })() : null;
  const clDays = tail(pulse?.checklist, isMobile ? 7 : 12);
  const evDays = tail(pulse?.grading, isMobile ? 7 : 12);
  const lvDays = tail(leave?.days, isMobile ? 7 : 14);
  const evalTotal = Math.max(1, ...(pulse?.grading || []).map((d) => d.expected || 0));

  // syllabus behind derivation (plain compute — must stay below the hooks)
  const syl = (() => {
    if (!syllabus || !syllabus.rows) return null;
    const idx = syllabus.currentMonthIndex ?? 0;
    let onTrack = 0; const behind = [];
    for (const r of syllabus.rows) {
      const expectedByNow = (r.monthlyScheduled || []).slice(0, idx + 1).reduce((a, b) => a + b, 0);
      const bestCovered = Math.max(0, ...(r.sections || []).map((s) => s.coveredCount || 0));
      if (expectedByNow > 0 && bestCovered < expectedByNow) behind.push(`${r.grade} – ${r.subjectName}`);
      else onTrack++;
    }
    return { total: syllabus.rows.length, onTrack, behind };
  })();

  const openScreen = (path) => navigate(path);
  const selClamp = (key, arr) => (sel[key] >= 0 && sel[key] < arr.length ? sel[key] : arr.length - 1);

  // ── detail renderers ──
  const clDetail = () => {
    const i = selClamp('cl', clDays); if (i < 0) return null; const d = clDays[i];
    const st = classifyChecklist(d, dueMin, today);
    return (
      <Detail onOpen={() => openScreen('/assembly/checklist')} openLabel="Open checklist">
        <b>{dayLabel(d.date)}{d.house ? ` · ${d.house} House` : ''}</b>
        {st === 'miss' && <Who>Missed — no sign-off</Who>}
        {st === 'pending' && <Who c={C.primary}>Pending — not submitted yet</Who>}
        {(st === 'ontime' || st === 'late' || st === 'signed') && (
          <Who c={st === 'late' ? C.warn : C.good}>signed {hhmm(istMinutes(d.signedAt))}{dueMin != null ? (st === 'late' ? ` — ${istMinutes(d.signedAt) - dueMin} min late` : ' — on time') : ''}</Who>
        )}
      </Detail>
    );
  };
  const evDetail = () => {
    const i = selClamp('ev', evDays); if (i < 0) return null; const d = evDays[i];
    const full = d.submitted >= d.expected && d.expected > 0;
    return (
      <Detail onOpen={() => openScreen('/assembly/grading')} openLabel="Open grading">
        <b>{dayLabel(d.date)} · {d.submitted}/{d.expected || evalTotal}</b>
        {full ? <Who c={C.good}>all submitted ✓</Who> : (d.expected === 0 ? <Box component="span" sx={{ color: C.muted }}>no assembly / no evaluators</Box> : <>missing: {(d.missing || []).slice(0, 6).map((m, k) => <Who key={k}>{m.name || 'Unknown'}</Who>)}</>)}
      </Detail>
    );
  };
  const fbDetail = () => {
    if (!fbFlow?.weeks?.length) return null;
    const i = sel.fb >= 0 && sel.fb < fbFlow.weeks.length ? sel.fb : fbFlow.weeks.length - 1;
    const w = fbFlow.weeks[i], net = w.opened - w.resolved;
    return (
      <Detail onOpen={() => openScreen('/feedback')} openLabel="Open feedback">
        <b>{fmtWeek(w.weekStart)}</b><Who>{w.opened} opened</Who><Who c={C.good}>{w.resolved} resolved</Who>
        <Box component="span" sx={{ fontWeight: 700, color: net > 0 ? C.crit : C.good }}>{net > 0 ? `+${net}` : net} to backlog</Box>
      </Detail>
    );
  };
  const lvDetail = () => {
    const i = selClamp('lv', lvDays); if (i < 0) return null; const d = lvDays[i];
    return (
      <Detail onOpen={() => openScreen('/leave/day')} openLabel="Open leave">
        <b>{i === lvDays.length - 1 ? 'Today' : dayLabel(d.date)} · {d.count} out</b>
        {(d.names || []).slice(0, 8).map((n, k) => <Who key={k} c={C.leave}>{n.name || 'Staff'}{n.leaveTypeCode ? ` (${n.leaveTypeCode})` : ''}</Who>)}
        {!d.count && <Box component="span" sx={{ color: C.muted }}>nobody on leave</Box>}
      </Detail>
    );
  };

  const twoCol = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.35fr 1fr', gap: 1.75 };
  const evenCol = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 1.75 };

  // feedback status
  const fbOpen = fbFlow?.open ?? fbSummary?.open ?? 0;
  const fbBehind = fbFlow && fbFlow.weeks?.length ? (() => { const w = fbFlow.weeks[fbFlow.weeks.length - 1]; return w.opened > w.resolved; })() : false;

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
      {/* header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.primaryDk, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: C.good }} /> Director · School Pulse
          </Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: C.ink, mt: 0.5 }}>School Pulse</Typography>
          <Typography sx={{ fontSize: 13.5, color: C.muted }}>{fmtDate(today)} · last {isMobile ? 7 : 14} days</Typography>
        </Box>
      </Box>

      {err && <Card variant="outlined" sx={{ p: 2, mb: 2, borderColor: C.border }}><Typography color="error">Some pulse data couldn't load. Showing what's available.</Typography></Card>}

      {/* ASSEMBLY */}
      <SectionLabel hint="tap any day to drill in">Assembly · daily heartbeat</SectionLabel>
      <Box sx={twoCol}>
        <Panel title="Checklist submitted on time" status={pulse?.dueTime ? undefined : 'set a due time'} statusColor={C.warn}
          legend={<><Leg c={C.good}>On time</Leg><Leg c={C.warn}>Late</Leg><Leg c={C.crit}>Missed</Leg><Leg c={C.muted}>Pending</Leg></>}>
          {clDays.length ? <><ChecklistChart days={clDays} dueMin={dueMin} today={today} onPick={(i) => setSel((s) => ({ ...s, cl: i }))} />{clDetail()}</>
            : <Typography sx={{ color: C.muted, py: 3, textAlign: 'center' }}>No assembly checklist activity in this window.</Typography>}
        </Panel>
        <Panel title="Evaluators graded"
          legend={<><Leg c={C.good} square>Submitted</Leg><Leg c="ring" square>Not submitted</Leg></>}>
          {evDays.length ? <><EvaluatorMatrix days={evDays} evalTotal={evalTotal} sel={selClamp('ev', evDays)} onPick={(i) => setSel((s) => ({ ...s, ev: i }))} />{evDetail()}</>
            : <Typography sx={{ color: C.muted, py: 3, textAlign: 'center' }}>No grading activity in this window.</Typography>}
        </Panel>
      </Box>

      {/* FEEDBACK */}
      <SectionLabel hint="opened vs resolved, and the backlog">Feedback · are tickets clearing?</SectionLabel>
      <Box sx={twoCol}>
        <Panel title="Opened vs resolved · each week" status={fbBehind ? 'falling behind' : 'keeping up'} statusColor={fbBehind ? C.crit : C.good}
          legend={<><Leg c={C.serious}>Opened</Leg><Leg c={C.good}>Resolved</Leg></>}>
          {fbFlow?.weeks?.length ? <><FeedbackFlow weeks={fbFlow.weeks} onPick={(i) => setSel((s) => ({ ...s, fb: i }))} />{fbDetail()}</>
            : <Typography sx={{ color: C.muted, py: 3, textAlign: 'center' }}>No feedback tickets yet.</Typography>}
        </Panel>
        <Panel title="Open backlog" status={fbFlow ? `${fbOpen} open · oldest ${fbFlow.oldestOpenDays}d` : undefined} statusColor={C.crit}
          legend={<Leg c={C.crit}>Tickets still open at week end</Leg>}>
          {fbFlow?.weeks?.length ? <BacklogLine weeks={fbFlow.weeks} /> : <Typography sx={{ color: C.muted, py: 3, textAlign: 'center' }}>—</Typography>}
        </Panel>
      </Box>

      {/* LEAVE */}
      <SectionLabel hint="tap a day to see names">Leave · who's out</SectionLabel>
      <Panel title="Staff on leave · per day" status={leave ? `${leave.pending} awaiting your approval →` : undefined} statusColor={C.warn}
        legend={<><Leg c="#7fa5ff">On leave</Leg><Leg c={C.primaryDk}>Today</Leg><Leg c={C.warn}>4+ out (cover risk)</Leg></>}>
        {lvDays.length ? <><LeaveBars days={lvDays} sel={selClamp('lv', lvDays)} onPick={(i) => setSel((s) => ({ ...s, lv: i }))} />{lvDetail()}</>
          : <Typography sx={{ color: C.muted, py: 3, textAlign: 'center' }}>No approved leave in this window.</Typography>}
      </Panel>

      {/* ACADEMICS & HOUSES */}
      <SectionLabel hint="coverage and house sizes">Academics &amp; houses</SectionLabel>
      <Box sx={evenCol}>
        <Panel title="Syllabus coverage vs plan" status={syl ? `${syl.behind.length} behind` : undefined} statusColor={C.warn}>
          {syl ? <>
            <Box sx={{ display: 'flex', height: 16, borderRadius: 1, overflow: 'hidden', mt: 1, bgcolor: C.page }}>
              <Box sx={{ width: `${syl.total ? (syl.onTrack / syl.total) * 100 : 0}%`, bgcolor: C.good }} />
              <Box sx={{ width: `${syl.total ? (syl.behind.length / syl.total) * 100 : 0}%`, bgcolor: C.crit }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, mt: 1 }}>
              <span><b style={{ color: C.ink }}>{syl.onTrack}</b> of {syl.total} plans on track</span>
              <span><b style={{ color: C.crit }}>{syl.behind.length}</b> behind</span>
            </Box>
            {syl.behind.length > 0 && <>
              <Typography sx={{ fontSize: 10.5, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', mt: 1.8, mb: 1 }}>Behind schedule</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {syl.behind.slice(0, 8).map((b, k) => <Box key={k} sx={{ fontSize: 12.5, px: 1.3, py: 0.5, borderRadius: 1, bgcolor: `${C.warn}22`, color: '#8a5600' }}>{b}</Box>)}
              </Box>
            </>}
            <Detail onOpen={() => openScreen('/syllabus/overview')} openLabel="Open syllabus overview"><span /></Detail>
          </> : <Typography sx={{ color: C.muted, py: 3, textAlign: 'center' }}>No syllabus plans for this year.</Typography>}
        </Panel>
        <Panel title="House balance · sizes & split" status={houses ? `${houses.summary?.needHouse ?? 0} unassigned` : undefined} statusColor={C.warn}>
          {houses?.houses?.length ? <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, mt: 0.5 }}>
              {(() => { const max = Math.max(1, ...houses.houses.map((h) => h.total)); return houses.houses.map((h) => (
                <Box key={h.uuid} sx={{ display: 'grid', gridTemplateColumns: '80px 1fr 48px', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{h.name}</Typography>
                  <Box sx={{ height: 14, borderRadius: 1, overflow: 'hidden', display: 'flex', bgcolor: C.page, width: `${(h.total / max) * 100}%` }}>
                    <Box sx={{ width: `${h.total ? (h.boys / h.total) * 100 : 0}%`, bgcolor: C.primary }} />
                    <Box sx={{ width: `${h.total ? (h.girls / h.total) * 100 : 0}%`, bgcolor: C.house }} />
                  </Box>
                  <Typography sx={{ fontSize: 12.5, color: C.muted, textAlign: 'right' }}>{h.total}</Typography>
                </Box>
              )); })()}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, mt: 1.4 }}>
              <span>spread <b style={{ color: C.ink }}>±{(() => { const t = houses.houses.map((h) => h.total); return Math.max(...t) - Math.min(...t); })()}</b></span>
              <span><Box component="span" sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '2px', bgcolor: C.primary, mr: 0.5 }} />boys<Box component="span" sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '2px', bgcolor: C.house, mx: 0.5, ml: 1 }} />girls</span>
            </Box>
            <Detail onOpen={() => openScreen('/students/houses')} openLabel="Open house balance"><span /></Detail>
          </> : <Typography sx={{ color: C.muted, py: 3, textAlign: 'center' }}>House analytics unavailable{academicYearId ? '' : ' (select an academic year)'}.</Typography>}
        </Panel>
      </Box>

      {/* JUMP TO — desktop only */}
      {!isMobile && (
        <>
          <SectionLabel hint="open the full screen">Jump to</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.75 }}>
            {[
              ['Feedback', '/feedback', C.feedback, [[fbOpen, 'open'], [fbSummary?.awaitingDirector ?? 0, 'awaiting you']]],
              ['Leave', '/leave/day', C.leave, [[leave?.pending ?? 0, 'pending'], [lvDays.length ? lvDays[lvDays.length - 1].count : 0, 'out today']]],
              ['Syllabus', '/syllabus/overview', C.syllabus, [[syl?.onTrack ?? '—', 'on track'], [syl?.behind.length ?? 0, 'behind']]],
              ['House balance', '/students/houses', C.house, [[houses?.houses?.length ?? 0, 'houses'], [houses?.summary?.needHouse ?? 0, 'to place']]],
              ['Leaderboard', '/assembly/leaderboard', C.assembly, [[leaderboard?.houseOfTheMonth?.houseName || '—', 'leading'], [(leaderboard?.standings?.length ?? 0), 'houses']]],
              ['Assembly', '/assembly/leaderboard', C.exams, [[clDays.length && clDays[clDays.length - 1].house || '—', 'on duty'], ['this', 'week']]],
            ].map(([title, path, col, stats]) => (
              <Card key={title} variant="outlined" onClick={() => openScreen(path)} sx={{ borderColor: C.border, borderRadius: 2, boxShadow: SHADOW, p: 1.75, cursor: 'pointer', transition: '.12s', '&:hover': { transform: 'translateY(-2px)', borderColor: `${col}88` } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 1.2, bgcolor: `${col}1f`, color: col, display: 'grid', placeItems: 'center', fontWeight: 800 }}>{title[0]}</Box>
                  <Box component="span" sx={{ color: C.muted }}>›</Box>
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: 650, color: C.ink, mt: 1 }}>{title}</Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  {stats.map(([n, l], k) => <Box key={k}><Typography sx={{ fontSize: 18, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{n}</Typography><Typography sx={{ fontSize: 11, color: C.muted }}>{l}</Typography></Box>)}
                </Box>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* STANDINGS */}
      <SectionLabel hint="assembly leaderboard, this term">House standings</SectionLabel>
      <Card variant="outlined" sx={{ borderColor: C.border, borderRadius: 2, boxShadow: SHADOW, p: 2.2 }}>
        {leaderboard?.standings?.filter((s) => s.houseId).length ? (() => {
          const rows = leaderboard.standings.filter((s) => s.houseId);
          const max = Math.max(1, ...rows.map((r) => r.average));
          return rows.map((r, i) => (
            <Box key={r.houseId} sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 48px', alignItems: 'center', gap: 1.5, mb: 1.2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{r.houseName}{i === 0 ? ' ★' : ''}</Typography>
              <Box sx={{ height: 11, borderRadius: 5, bgcolor: C.page, overflow: 'hidden' }}><Box sx={{ height: '100%', width: `${(r.average / max) * 100}%`, bgcolor: [C.crit, C.primary, C.warn, C.good][i % 4], borderRadius: 5 }} /></Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.ink, textAlign: 'right' }}>{r.average}</Typography>
            </Box>
          ));
        })() : <Typography sx={{ color: C.muted, py: 2, textAlign: 'center' }}>No leaderboard scores this term.</Typography>}
      </Card>

      <Box sx={{ height: 40 }} />
    </Box>
  );
}
