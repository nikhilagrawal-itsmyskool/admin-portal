import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Avatar,
  IconButton, Divider, Button, TextField, InputAdornment,
} from '@mui/material';
import {
  ChevronRight, ChevronLeft, ArrowBack, Payments as FeesIcon, DirectionsBus as BusIcon,
  OpenInNew, Refresh, Search as SearchIcon, Clear as ClearIcon,
} from '@mui/icons-material';
import { feesService } from '../services/feesService';
import { inr, errMsg, PAYMENT_MODE_LABELS } from './fees/feesUi';
import { todayIso } from '../utils/date';

const DAY_MS = 24 * 60 * 60 * 1000;
const stepDay = (iso, d) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + d * DAY_MS).toISOString().slice(0, 10);
const dayLabel = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

// Grade order for grouping the due list (Nursery → XII), so classes read top-to-bottom naturally.
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
const gradeRank = (cls) => {
  const s = String(cls || '').toUpperCase().trim();
  if (s.startsWith('NUR')) return 0;
  if (s.startsWith('LKG')) return 1;
  if (s.startsWith('UKG')) return 2;
  const m = s.match(/^([IVX]+)\b/);
  const r = m && ROMAN[m[1]];
  return r ? 2 + r : 99;
};
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const stripTitle = (name) => String(name || '').replace(/^\s*(mr|mrs|ms|smt|shri|sri|dr|md)\.?\s*/i, '').trim();
// Gender-aware guardian line: son → S/o, daughter → D/o, unknown → C/o. Empty when no father on record.
const guardianLine = (gender, father) => {
  if (!father) return '';
  const g = String(gender || '').trim().toUpperCase().charAt(0);
  const pfx = g === 'F' ? 'D/o' : g === 'M' ? 'S/o' : 'C/o';
  return `${pfx} ${stripTitle(father)}`;
};

const C = { bg: '#f4f7fb', card: '#ffffff', ink: '#0f172a', muted: '#64748b', due: '#b91c1c', fees: '#0f766e', bus: '#b45309', line: '#e6ebf2' };

// Cash / Cheque / Online tally for a collection total — the manager counts the cash cell against the drawer.
const ModeStrip = ({ modes }) => {
  if (!modes) return null;
  const cells = [
    { key: 'cash', label: 'Cash', bg: '#ecfdf5', color: C.fees },
    { key: 'cheque', label: 'Cheque / DD', bg: '#f8fafc', color: C.ink },
    { key: 'online', label: 'Online', bg: '#f8fafc', color: C.ink },
  ];
  if (!cells.some((c) => Number(modes[c.key]?.amount || 0) > 0)) return null;
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {cells.map((c) => {
        const m = modes[c.key] || {};
        return (
          <Box key={c.key} sx={{ flex: 1, textAlign: 'center', bgcolor: c.bg, borderRadius: 2, py: 1, border: `1px solid ${C.line}` }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{c.label}</Typography>
            <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: c.color, lineHeight: 1.2 }}>{inr(m.amount || 0)}</Typography>
            <Typography sx={{ fontSize: 11, color: C.muted }}>{Number(m.receipts || 0)} rcpt{Number(m.receipts || 0) === 1 ? '' : 's'}</Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default function ManagerDesk() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(null); // { academicYearId, name, dueNow } when drilled in
  const [students, setStudents] = useState(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [dayDate, setDayDate] = useState(null); // ISO date when the day/receipts view is open
  const [dayFilter, setDayFilter] = useState('all'); // all | fees | transport
  const [day, setDay] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);

  const loadDay = (date) => {
    setDayLoading(true); setDay(null); setError('');
    feesService.getManagerDay(date)
      .then(setDay)
      .catch((e) => setError(errMsg(e, 'Could not load collection')))
      .finally(() => setDayLoading(false));
  };
  const openDay = (filter) => { const d = todayIso(); setDayFilter(filter); setDayDate(d); loadDay(d); };
  const gotoDay = (d) => { setDayDate(d); loadDay(d); };

  // Find a student → per-student dues
  const [find, setFind] = useState(false);
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null); // selected student row
  const [studentDues, setStudentDues] = useState(null);
  const [duesLoading, setDuesLoading] = useState(false);
  const searchRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    if (!find || picked) return;
    if (dq.length < 1) { setResults(null); setSearching(false); return; }
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController(); abortRef.current = ac;
    setSearching(true);
    feesService.getManagerSearch(dq, ac.signal)
      .then((r) => { setResults(r || []); setSearching(false); })
      .catch((e) => { if (e.name !== 'CanceledError' && e.code !== 'ERR_CANCELED') { setSearching(false); setResults([]); } });
  }, [dq, find, picked]);

  // Ctrl/⌘+K opens the search view (desktop bonus)
  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setFind(true); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pickStudent = (row) => {
    setPicked(row); setStudentDues(null); setDuesLoading(true); setError('');
    feesService.getManagerStudentDues(row.studentId)
      .then(setStudentDues)
      .catch((e) => setError(errMsg(e, 'Could not load dues')))
      .finally(() => setDuesLoading(false));
  };
  const closeFind = () => { setFind(false); setPicked(null); setQ(''); setDq(''); setResults(null); };

  const loadSummary = () => {
    setLoading(true); setError('');
    feesService.getManagerSummary()
      .then(setSummary)
      .catch((e) => setError(errMsg(e, 'Could not load')))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadSummary(); }, []);

  const openYear = (y) => {
    setYear(y); setStudents(null); setStudentsLoading(true);
    feesService.getManagerDueStudents(y.academicYearId)
      .then(setStudents)
      .catch((e) => setError(errMsg(e, 'Could not load students')))
      .finally(() => setStudentsLoading(false));
  };

  // group students by class in grade order
  const grouped = useMemo(() => {
    if (!students) return [];
    const g = {};
    students.forEach((s) => { (g[s.className] ||= []).push(s); });
    return Object.entries(g)
      .map(([className, list]) => ({ className, list, total: list.reduce((a, s) => a + Number(s.dueNow || 0), 0) }))
      .sort((a, b) => gradeRank(a.className) - gradeRank(b.className) || a.className.localeCompare(b.className));
  }, [students]);

  const Shell = ({ children }) => (
    <Box sx={{ minHeight: '100vh', bgcolor: C.bg }}>
      <Box sx={{ maxWidth: 520, mx: 'auto', px: 1.5, pb: 6, pt: 1 }}>{children}</Box>
    </Box>
  );

  if (loading) return <Shell><Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box></Shell>;

  // ── Day view: a day's collection + the receipts behind it (any date) ──────────
  if (dayDate) {
    const today = todayIso();
    const filtered = (day?.rows || []).filter((r) => dayFilter === 'all' || r.type === dayFilter);
    const FilterPill = ({ id, label, amount }) => (
      <Box onClick={() => setDayFilter(id)}
        sx={{ flex: 1, textAlign: 'center', py: 1, borderRadius: 2, cursor: 'pointer',
          bgcolor: dayFilter === id ? C.ink : '#eef2f7', color: dayFilter === id ? '#fff' : C.ink }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: dayFilter === id ? 0.8 : 0.6 }}>{label}</Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{inr(amount)}</Typography>
      </Box>
    );
    return (
      <Shell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
          <IconButton onClick={() => setDayDate(null)} sx={{ color: C.ink }}><ArrowBack /></IconButton>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.ink }}>Collection</Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Card sx={{ borderRadius: 4, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 1 }}>
            <IconButton onClick={() => gotoDay(stepDay(dayDate, -1))} sx={{ color: C.ink }}><ChevronLeft /></IconButton>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{dayDate === today ? 'Today' : dayLabel(dayDate)}</Typography>
              {dayDate === today
                ? <Typography sx={{ fontSize: 12, color: C.muted }}>{dayLabel(dayDate)}</Typography>
                : <Typography onClick={() => gotoDay(today)} sx={{ fontSize: 12, color: C.fees, cursor: 'pointer', fontWeight: 700 }}>Jump to today</Typography>}
            </Box>
            <IconButton disabled={dayDate >= today} onClick={() => gotoDay(stepDay(dayDate, 1))} sx={{ color: C.ink }}><ChevronRight /></IconButton>
          </Box>
          <Divider sx={{ borderColor: C.line }} />
          <Box sx={{ textAlign: 'center', pt: 2, pb: 1 }}>
            <Typography sx={{ fontSize: 36, fontWeight: 800, color: C.fees, lineHeight: 1.05 }}>{inr(day?.total || 0)}</Typography>
            <Typography sx={{ fontSize: 13, color: C.muted }}>{day?.receipts || 0} receipt{(day?.receipts || 0) === 1 ? '' : 's'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, px: 1.5, pb: 1.5 }}>
            <FilterPill id="all" label="All" amount={day?.total || 0} />
            <FilterPill id="fees" label="Fees" amount={day?.fees?.amount || 0} />
            <FilterPill id="transport" label="Transport" amount={day?.transport?.amount || 0} />
          </Box>
          {day?.modes && <Box sx={{ px: 1.5, pb: 1.75 }}><ModeStrip modes={day.modes} /></Box>}
        </Card>

        {dayLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Card sx={{ borderRadius: 3 }}><CardContent><Typography sx={{ textAlign: 'center', color: C.muted, py: 3 }}>No {dayFilter === 'all' ? '' : `${dayFilter} `}receipts on this day.</Typography></CardContent></Card>
        ) : (
          <Card sx={{ borderRadius: 3 }}>
            {filtered.map((r, i) => (
              <Box key={i}>
                {i > 0 && <Divider sx={{ borderColor: C.line }} />}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.25 }}>
                  <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: r.type === 'transport' ? C.bus : C.fees, flex: 'none' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: C.ink }} noWrap>{r.payerName}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: C.muted }} noWrap>{r.className} · {PAYMENT_MODE_LABELS[r.paymentMode] || r.paymentMode || '—'}{r.time ? ` · ${r.time}` : ''}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.ink, whiteSpace: 'nowrap' }}>{inr(r.amount)}</Typography>
                </Box>
              </Box>
            ))}
          </Card>
        )}
      </Shell>
    );
  }

  // ── Year drill-down: who owes, by class ──────────────────────────────────────
  if (year) {
    return (
      <Shell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5, position: 'sticky', top: 0, bgcolor: C.bg, zIndex: 1 }}>
          <IconButton onClick={() => setYear(null)} sx={{ color: C.ink }}><ArrowBack /></IconButton>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{year.name}</Typography>
            <Typography sx={{ fontSize: 14, color: C.muted }}>Total due <b style={{ color: C.due }}>{inr(year.dueNow)}</b></Typography>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {studentsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : !students || students.length === 0 ? (
          <Card sx={{ borderRadius: 3 }}><CardContent><Typography sx={{ textAlign: 'center', color: C.muted, py: 3 }}>No dues in this year. 🎉</Typography></CardContent></Card>
        ) : (
          grouped.map((grp) => (
            <Box key={grp.className} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5, mb: 0.75 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: C.ink }}>Class {grp.className}</Typography>
                <Typography sx={{ fontSize: 14, color: C.muted }}>{grp.list.length} · <b style={{ color: C.due }}>{inr(grp.total)}</b></Typography>
              </Box>
              <Card sx={{ borderRadius: 3 }}>
                {grp.list.map((s, i) => (
                  <Box key={s.studentId}>
                    {i > 0 && <Divider sx={{ borderColor: C.line }} />}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.25 }}>
                      <Avatar src={s.photoUrl || undefined} sx={{ width: 46, height: 46, bgcolor: '#dbe4f0', color: C.ink, fontWeight: 700, fontSize: 15 }}>
                        {initials(s.name)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 16, fontWeight: 700, color: C.ink }} noWrap>{s.name}</Typography>
                        <Typography sx={{ fontSize: 13, color: C.muted }} noWrap>{guardianLine(s.gender, s.fatherName) || s.admissionNumber || ''}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 17, fontWeight: 800, color: C.due, whiteSpace: 'nowrap' }}>{inr(s.dueNow)}</Typography>
                    </Box>
                  </Box>
                ))}
              </Card>
            </Box>
          ))
        )}
      </Shell>
    );
  }

  // ── Student dues: consolidated + year by year ────────────────────────────────
  if (picked) {
    const st = studentDues?.student || picked;
    const yrs = studentDues?.years || [];
    return (
      <Shell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
          <IconButton onClick={() => setPicked(null)} sx={{ color: C.ink }}><ArrowBack /></IconButton>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.ink }}>Student dues</Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Card sx={{ borderRadius: 4, mb: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <Avatar src={st.photoUrl || undefined} sx={{ width: 58, height: 58, bgcolor: '#dbe4f0', color: C.ink, fontWeight: 700, fontSize: 20 }}>{initials(st.name)}</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 19, fontWeight: 800, color: C.ink }} noWrap>{st.name}</Typography>
              <Typography sx={{ fontSize: 13.5, color: C.muted }} noWrap>{st.className}{guardianLine(st.gender, st.fatherName) ? ` · ${guardianLine(st.gender, st.fatherName)}` : ''}</Typography>
              {st.admissionNumber && <Typography sx={{ fontSize: 12, color: C.muted }}>{st.admissionNumber}</Typography>}
            </Box>
          </CardContent>
        </Card>

        {duesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : yrs.length === 0 ? (
          <Card sx={{ borderRadius: 3 }}><CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography sx={{ color: '#16a34a', fontWeight: 700, fontSize: 18 }}>All cleared 🎉</Typography>
            <Typography sx={{ color: C.muted, fontSize: 13 }}>No dues in any year.</Typography>
          </CardContent></Card>
        ) : (
          <>
            <Card sx={{ borderRadius: 4, mb: 2, bgcolor: '#0f172a' }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 13, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>OWES NOW</Typography>
                  <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#fca5a5' }}>{inr(studentDues.owesNow)}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>incl. upcoming</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>{inr(studentDues.totalRemaining)}</Typography>
                </Box>
              </CardContent>
            </Card>
            <Typography sx={{ fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, px: 0.5, mb: 1 }}>Year by year</Typography>
            <Card sx={{ borderRadius: 4 }}>
              {yrs.map((y, i) => (
                <Box key={y.academicYearId}>
                  {i > 0 && <Divider sx={{ borderColor: C.line }} />}
                  <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5 }}>
                    <Typography sx={{ flex: 1, fontSize: 17, fontWeight: 700, color: C.ink }}>{y.name}</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: 17, fontWeight: 800, color: C.due }}>{inr(y.dueNow)} <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>due now</span></Typography>
                      {y.fullYear > y.dueNow + 0.5 && <Typography sx={{ fontSize: 12.5, color: C.muted }}>{inr(y.fullYear)} full year</Typography>}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Card>
          </>
        )}
      </Shell>
    );
  }

  // ── Find a student ───────────────────────────────────────────────────────────
  if (find) {
    const rows = results || [];
    return (
      <Shell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
          <IconButton onClick={closeFind} sx={{ color: C.ink }}><ArrowBack /></IconButton>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.ink }}>Find a student</Typography>
        </Box>
        <TextField
          fullWidth autoFocus inputRef={searchRef} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Type a student's name…" sx={{ mb: 2, bgcolor: '#fff', borderRadius: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            endAdornment: q ? <InputAdornment position="end"><IconButton size="small" onClick={() => setQ('')}><ClearIcon /></IconButton></InputAdornment> : null,
          }}
        />
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {searching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={26} /></Box>
        ) : dq.length < 1 ? (
          <Typography sx={{ textAlign: 'center', color: C.muted, py: 4 }}>Type a name to search.</Typography>
        ) : rows.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: C.muted, py: 4 }}>No student found for &ldquo;{dq}&rdquo;.</Typography>
        ) : (
          <Card sx={{ borderRadius: 3 }}>
            {rows.map((r, i) => (
              <Box key={r.studentId}>
                {i > 0 && <Divider sx={{ borderColor: C.line }} />}
                <Box onClick={() => pickStudent(r)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.25, cursor: 'pointer', '&:active': { bgcolor: '#f1f5f9' } }}>
                  <Avatar src={r.photoUrl || undefined} sx={{ width: 46, height: 46, bgcolor: '#dbe4f0', color: C.ink, fontWeight: 700, fontSize: 15 }}>{initials(r.name)}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: C.ink }} noWrap>{r.name}</Typography>
                    <Typography sx={{ fontSize: 13, color: C.muted }} noWrap>{r.className}{guardianLine(r.gender, r.fatherName) ? ` · ${guardianLine(r.gender, r.fatherName)}` : ''}</Typography>
                  </Box>
                  <ChevronRight sx={{ color: C.muted }} />
                </Box>
              </Box>
            ))}
          </Card>
        )}
      </Shell>
    );
  }

  // ── Landing: today + dues by year + grand total ──────────────────────────────
  const t = summary?.today || {};
  return (
    <Shell>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1.5, pb: 1 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: C.ink }}>Fee Collection</Typography>
        <IconButton onClick={loadSummary} sx={{ color: C.muted }} title="Refresh"><Refresh /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Find a student (tap, or Ctrl+K) */}
      <Card onClick={() => setFind(true)} sx={{ borderRadius: 3, mb: 2, cursor: 'pointer', '&:active': { bgcolor: '#eef2f7' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.5 }}>
          <SearchIcon sx={{ color: C.muted }} />
          <Typography sx={{ flex: 1, fontSize: 16, color: C.muted }}>Find a student…</Typography>
          <ChevronRight sx={{ color: C.muted }} />
        </Box>
      </Card>

      {/* Today — tap the total or a card to see the receipts (and step to any day) */}
      <Card sx={{ borderRadius: 4, mb: 2, bgcolor: C.card }}>
        <CardContent sx={{ py: 2.5 }}>
          <Box onClick={() => openDay('all')} sx={{ cursor: 'pointer' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Collected today</Typography>
              <Typography sx={{ fontSize: 12, color: C.fees, fontWeight: 700 }}>View receipts ›</Typography>
            </Box>
            <Typography sx={{ fontSize: 40, fontWeight: 800, color: C.fees, lineHeight: 1.1, my: 0.5 }}>{inr(t.total || 0)}</Typography>
            <Typography sx={{ fontSize: 13, color: C.muted, mb: 1.5 }}>{t.receipts || 0} receipt{(t.receipts || 0) === 1 ? '' : 's'} today</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box onClick={() => openDay('fees')} sx={{ flex: 1, bgcolor: '#f0fdfa', borderRadius: 2, p: 1.25, cursor: 'pointer', '&:active': { bgcolor: '#dcfce7' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: C.fees }}><FeesIcon fontSize="small" /><Typography sx={{ fontSize: 13, fontWeight: 700 }}>Fees</Typography></Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{inr(t.fees?.amount || 0)}</Typography>
              <Typography sx={{ fontSize: 12, color: C.muted }}>{t.fees?.receipts || 0} receipts ›</Typography>
            </Box>
            <Box onClick={() => openDay('transport')} sx={{ flex: 1, bgcolor: '#fffbeb', borderRadius: 2, p: 1.25, cursor: 'pointer', '&:active': { bgcolor: '#fef3c7' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: C.bus }}><BusIcon fontSize="small" /><Typography sx={{ fontSize: 13, fontWeight: 700 }}>Transport</Typography></Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{inr(t.transport?.amount || 0)}</Typography>
              <Typography sx={{ fontSize: 12, color: C.muted }}>{t.transport?.receipts || 0} receipts ›</Typography>
            </Box>
          </Box>
          {t.modes && <Box sx={{ mt: 1.5 }}><ModeStrip modes={t.modes} /></Box>}
        </CardContent>
      </Card>

      {/* Dues by year */}
      <Typography sx={{ fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, px: 0.5, mb: 1 }}>Dues by year (tap to see students)</Typography>
      <Card sx={{ borderRadius: 4, mb: 2 }}>
        {(summary?.years || []).map((y, i) => {
          const has = Number(y.dueNow || 0) > 0;
          return (
            <Box key={y.academicYearId}>
              {i > 0 && <Divider sx={{ borderColor: C.line }} />}
              <Box
                onClick={() => has && openYear(y)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.75, cursor: has ? 'pointer' : 'default', '&:active': has ? { bgcolor: '#f1f5f9' } : {} }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{y.name}</Typography>
                  <Typography sx={{ fontSize: 13, color: C.muted }}>{has ? `${y.students} student${y.students === 1 ? '' : 's'} owe` : 'All cleared'}</Typography>
                </Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: has ? C.due : '#16a34a' }}>{has ? inr(y.dueNow) : '✓'}</Typography>
                {has && <ChevronRight sx={{ color: C.muted }} />}
              </Box>
            </Box>
          );
        })}
      </Card>

      {/* Grand total */}
      <Card sx={{ borderRadius: 4, bgcolor: '#0f172a' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
          <Typography sx={{ fontSize: 15, color: '#cbd5e1', fontWeight: 700 }}>Total outstanding<br /><span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>all years, due now</span></Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: '#fca5a5' }}>{inr(summary?.grandTotalDueNow || 0)}</Typography>
        </CardContent>
      </Card>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button size="small" startIcon={<OpenInNew />} onClick={() => navigate('/?full=1')} sx={{ color: C.muted, textTransform: 'none' }}>
          Switch to full view
        </Button>
      </Box>
    </Shell>
  );
}
