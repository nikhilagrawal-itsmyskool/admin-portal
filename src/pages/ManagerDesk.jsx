import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Avatar,
  IconButton, Divider, Button,
} from '@mui/material';
import {
  ChevronRight, ArrowBack, Payments as FeesIcon, DirectionsBus as BusIcon,
  OpenInNew, Refresh,
} from '@mui/icons-material';
import { feesService } from '../services/feesService';
import { inr, errMsg } from './fees/feesUi';

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

const C = { bg: '#f4f7fb', card: '#ffffff', ink: '#0f172a', muted: '#64748b', due: '#b91c1c', fees: '#0f766e', bus: '#b45309', line: '#e6ebf2' };

export default function ManagerDesk() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(null); // { academicYearId, name, dueNow } when drilled in
  const [students, setStudents] = useState(null);
  const [studentsLoading, setStudentsLoading] = useState(false);

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
                        <Typography sx={{ fontSize: 13, color: C.muted }} noWrap>{s.fatherName ? `S/o ${s.fatherName}` : (s.admissionNumber || '')}</Typography>
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

  // ── Landing: today + dues by year + grand total ──────────────────────────────
  const t = summary?.today || {};
  return (
    <Shell>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1.5, pb: 1 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: C.ink }}>Fee Collection</Typography>
        <IconButton onClick={loadSummary} sx={{ color: C.muted }} title="Refresh"><Refresh /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Today */}
      <Card sx={{ borderRadius: 4, mb: 2, bgcolor: C.card }}>
        <CardContent sx={{ py: 2.5 }}>
          <Typography sx={{ fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Collected today</Typography>
          <Typography sx={{ fontSize: 40, fontWeight: 800, color: C.fees, lineHeight: 1.1, my: 0.5 }}>{inr(t.total || 0)}</Typography>
          <Typography sx={{ fontSize: 13, color: C.muted, mb: 1.5 }}>{t.receipts || 0} receipt{(t.receipts || 0) === 1 ? '' : 's'} today</Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flex: 1, bgcolor: '#f0fdfa', borderRadius: 2, p: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: C.fees }}><FeesIcon fontSize="small" /><Typography sx={{ fontSize: 13, fontWeight: 700 }}>Fees</Typography></Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{inr(t.fees?.amount || 0)}</Typography>
              <Typography sx={{ fontSize: 12, color: C.muted }}>{t.fees?.receipts || 0} receipts</Typography>
            </Box>
            <Box sx={{ flex: 1, bgcolor: '#fffbeb', borderRadius: 2, p: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: C.bus }}><BusIcon fontSize="small" /><Typography sx={{ fontSize: 13, fontWeight: 700 }}>Transport</Typography></Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{inr(t.transport?.amount || 0)}</Typography>
              <Typography sx={{ fontSize: 12, color: C.muted }}>{t.transport?.receipts || 0} receipts</Typography>
            </Box>
          </Box>
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
