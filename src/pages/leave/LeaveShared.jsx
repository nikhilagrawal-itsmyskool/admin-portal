import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Stack } from '@mui/material';
import { useIsMobile } from '../../hooks/useIsMobile';

// Shared status vocabulary + read-only views used by both the teacher (/me) and the
// god (drill-down) leave screens, so both render attendance & penalty identically.
// Desktop shows a real month-calendar grid; phones keep the date-wise card list.

// Reconciled per-day status → { label, color(hex), chip(short) }.
export const DAY_META = {
  present:          { label: 'Present',                color: '#00b887', chip: 'P' },
  present_on_leave: { label: 'Present (had leave)',    color: '#00b887', chip: 'P' },
  leave_paid:       { label: 'On leave',               color: '#3366ff', chip: 'Leave' },
  absence_counted:  { label: 'Absent — leave w/o pay', color: '#e5396b', chip: 'LWP' },
  unauthorized:     { label: 'Absent — unauthorized',  color: '#e5396b', chip: '⚠' },
  holiday:          { label: 'Holiday',                color: '#d99400', chip: '🎉' },
  off:              { label: 'Weekly off',             color: '#8f9bb3', chip: '' },
  suspect:          { label: 'Device down — review',   color: '#d99400', chip: '?' },
  unknown:          { label: 'Not imported',           color: '#c3cad9', chip: '' },
  future:           { label: '',                       color: '#e4e9f2', chip: '' },
};

export const APP_STATUS_COLOR = {
  pending: 'warning', approved: 'success', rejected: 'error', cancelled: 'default',
};

// "YYYY-MM-DD HH:MM:SS" (or ISO) → "HH:MM".
export function timeHM(v) {
  if (!v) return '';
  const s = String(v);
  const m = s.match(/[T ](\d{2}:\d{2})/);
  return m ? m[1] : '';
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Monday-first column index (0=Mon … 6=Sun) for a YYYY-MM-DD date.
function mondayIndex(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return (d.getDay() + 6) % 7;
}

// The counts strip shown above both the calendar and the list.
function CountsStrip({ counts }) {
  const c = counts || {};
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
      <Chip size="small" label={`${c.present || 0} present`} sx={{ bgcolor: '#e5f8f2', color: '#00916e', fontWeight: 700 }} />
      <Chip size="small" label={`${c.paidLeave || 0} on leave`} sx={{ bgcolor: '#eaf0ff', color: '#274bdb', fontWeight: 700 }} />
      <Chip size="small" label={`${c.countedAbsence || 0} absent`} sx={{ bgcolor: '#fde9ef', color: '#c42a56', fontWeight: 700 }} />
      <Chip size="small" label={`${c.holidays || 0} holidays`} sx={{ bgcolor: '#fff5e0', color: '#8a6400', fontWeight: 700 }} />
    </Stack>
  );
}

// Desktop: a proper month grid (weekday columns, weeks as rows) — reads like a wall
// calendar rather than a phone feed.
function CalendarGrid({ days }) {
  if (!days.length) return null;
  const lead = mondayIndex(days[0].date);
  const cells = [...Array(lead).fill(null), ...days];
  const cellBorder = '1px solid #eef2f8';
  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: cellBorder, borderLeft: cellBorder }}>
        {WEEKDAYS.map((w) => (
          <Box key={w} sx={{ px: 1, py: 0.75, borderRight: cellBorder, borderBottom: cellBorder, bgcolor: '#f7f9fc', textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.05em' }}>{w}</Typography>
          </Box>
        ))}
        {cells.map((d, i) => {
          if (!d) return <Box key={`lead-${i}`} sx={{ borderRight: cellBorder, borderBottom: cellBorder, bgcolor: '#fafbfc' }} />;
          const meta = DAY_META[d.status] || DAY_META.unknown;
          const dd = d.date.slice(8, 10);
          const isFuture = d.status === 'future';
          const tinted = ['leave_paid', 'absence_counted', 'unauthorized', 'holiday', 'suspect'].includes(d.status);
          const label = d.status === 'holiday' && d.holidayName ? d.holidayName : meta.label;
          return (
            <Box
              key={d.date}
              sx={{
                minHeight: 96, p: 0.85, borderRight: cellBorder, borderBottom: cellBorder,
                bgcolor: tinted ? `${meta.color}12` : '#fff', opacity: isFuture ? 0.45 : 1,
                display: 'flex', flexDirection: 'column', gap: 0.4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#2e3a59', fontVariantNumeric: 'tabular-nums' }}>{dd}</Typography>
                {meta.chip && (
                  <Chip size="small" label={meta.chip} sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: `${meta.color}22`, color: meta.color, '& .MuiChip-label': { px: 0.75 } }} />
                )}
              </Box>
              {label && (
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: meta.color, lineHeight: 1.15 }}>
                  {label}{d.leaveTypeCode && (d.status === 'leave_paid' || d.status === 'absence_counted') ? ` · ${d.leaveTypeCode}` : ''}
                </Typography>
              )}
              {(d.firstIn || d.lastOut) && (
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 'auto' }}>
                  {timeHM(d.firstIn) || '—'} – {timeHM(d.lastOut) || '—'}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

// Phone: the date-wise card list (unchanged — the approved mobile layout).
function DayList({ days }) {
  return (
    <Card variant="outlined">
      <Box>
        {days.filter((d) => d.status !== 'future').map((d) => {
          const meta = DAY_META[d.status] || DAY_META.unknown;
          const dd = d.date.slice(8, 10);
          const holidayRow = d.status === 'holiday';
          return (
            <Box
              key={d.date}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1,
                borderBottom: '1px solid #eef2f8', bgcolor: holidayRow ? '#fff9ec' : 'transparent',
              }}
            >
              <Box sx={{ width: 38, textAlign: 'center', flex: '0 0 auto' }}>
                <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dd}</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase' }}>{(d.weekday || '').slice(0, 3)}</Typography>
              </Box>
              <Box sx={{ width: 4, alignSelf: 'stretch', borderRadius: 2, bgcolor: meta.color, my: 0.5 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#2e3a59' }}>
                  {holidayRow && d.holidayName ? d.holidayName : meta.label}
                  {d.leaveTypeCode && (d.status === 'leave_paid' || d.status === 'absence_counted') ? ` · ${d.leaveTypeCode}` : ''}
                </Typography>
                {(d.firstIn || d.lastOut) && (
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                    In {timeHM(d.firstIn) || '—'} · Out {timeHM(d.lastOut) || '—'}
                  </Typography>
                )}
              </Box>
              {meta.chip && (
                <Chip
                  size="small"
                  label={meta.chip}
                  sx={{ height: 22, fontWeight: 700, fontSize: 11, bgcolor: `${meta.color}22`, color: meta.color }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

// Month reconciliation → calendar on desktop, date-wise cards on phones. `data` is the
// MonthReconciliation from the backend: { days[], counts, monthLabel }.
export function MonthAttendanceView({ data }) {
  const isMobile = useIsMobile();
  if (!data) return null;
  const days = data.days || [];
  return (
    <Box>
      <CountsStrip counts={data.counts} />
      {isMobile ? <DayList days={days} /> : <CalendarGrid days={days} />}
    </Box>
  );
}

// Monthly penalty summary (days of pay). Shows provisional-until-finalized, both plain
// LWP and the escalated ladder figure, and what's currently applied.
export function PenaltyCard({ summary }) {
  if (!summary) return null;
  const isFinal = summary.status === 'final';
  return (
    <Card variant="outlined" sx={{ borderColor: isFinal ? '#00b887' : '#f0c14b' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#222b45' }}>
            Deduction — {summary.month}
          </Typography>
          <Chip
            size="small"
            label={isFinal ? 'Final' : 'Provisional — not final'}
            color={isFinal ? 'success' : 'warning'}
            sx={{ fontWeight: 700 }}
          />
        </Box>
        <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{summary.appliedDeductionDays ?? 0}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>days' pay {isFinal ? 'deducted' : '(applied)'}</Typography>
          </Box>
          {summary.ladderDeductionDays !== summary.plainLwpDays && (
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35, color: '#d99400' }}>{summary.ladderDeductionDays}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>if escalated</Typography>
            </Box>
          )}
        </Stack>
        <Stack spacing={0.5}>
          <Row k="Present days" v={summary.paidDays} />
          <Row k="CL used" v={summary.clUsed} />
          <Row k="Unauthorized absences" v={summary.unauthorizedAbsences} danger />
          <Row k="Counted absences (ladder)" v={summary.countedAbsences} danger />
        </Stack>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1.5 }}>
          Deductions are in days of pay; payroll converts to ₹.
        </Typography>
      </CardContent>
    </Card>
  );
}

function Row({ k, v, danger }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{k}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: danger ? '#e5396b' : '#222b45', fontVariantNumeric: 'tabular-nums' }}>{v ?? 0}</Typography>
    </Box>
  );
}

// Month picker value helper: current month YYYY-MM in IST.
export function thisMonth() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 7);
}
