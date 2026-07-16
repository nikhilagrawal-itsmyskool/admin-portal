import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Chip, CircularProgress, Skeleton, Tooltip,
} from '@mui/material';
import { EventAvailable as AttIcon } from '@mui/icons-material';
import { attendanceService } from '../../services/attendanceService';
import { academicCalendarService } from '../../services/academicCalendarService';

// Semantic status palette (consistent everywhere attendance is shown).
const STATUS = {
  present: { color: '#22c55e', label: 'Present' },
  absent: { color: '#ef4444', label: 'Absent' },
  leave: { color: '#f59e0b', label: 'Leave' },
  late: { color: '#3b82f6', label: 'Late' },
};
const NONE = '#eef1f6';
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function StatTile({ value, label, color }) {
  return (
    <Box sx={{ flex: 1, minWidth: 88, textAlign: 'center', py: 1.25, borderRadius: 2, bgcolor: `${color}14`, border: `1px solid ${color}33` }}>
      <Typography sx={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}

// One month as a mini calendar heatmap.
function MonthGrid({ year, month, map }) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return (
    <Box sx={{ width: 168 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>{MONTHS[month]} {year}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {WD.map((w, i) => (
          <Typography key={i} variant="caption" sx={{ textAlign: 'center', color: 'text.disabled', fontSize: 10 }}>{w}</Typography>
        ))}
        {cells.map((d, i) => {
          if (!d) return <Box key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const st = map[iso];
          const color = st ? STATUS[st]?.color || NONE : NONE;
          const cell = (
            <Box sx={{
              aspectRatio: '1 / 1', borderRadius: '5px', bgcolor: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, color: st ? '#fff' : 'text.disabled',
            }}>{d}</Box>
          );
          return st ? (
            <Tooltip key={i} title={`${d} ${MONTHS[month]} — ${STATUS[st]?.label || st}`} arrow>{cell}</Tooltip>
          ) : <Box key={i}>{cell}</Box>;
        })}
      </Box>
    </Box>
  );
}

export default function StudentAttendancePanel({ studentId }) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState([]);
  const [yearName, setYearName] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const cur = await academicCalendarService.getCurrentAcademicYear();
        if (alive) setYearName(cur?.name || '');
        const data = await attendanceService.getStudentAttendance(studentId, cur?.uuid ? { academicYearId: cur.uuid } : {});
        if (alive) setDays(data.days || []);
      } catch {
        if (alive) setDays([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [studentId]);

  const { map, totals, months } = useMemo(() => {
    const map = {};
    const totals = { present: 0, absent: 0, leave: 0, late: 0 };
    const monthSet = new Set();
    for (const d of days) {
      map[d.date] = d.status;
      if (totals[d.status] !== undefined) totals[d.status]++;
      monthSet.add(d.date.slice(0, 7)); // YYYY-MM
    }
    const months = [...monthSet].sort().map((ym) => {
      const [y, m] = ym.split('-');
      return { year: +y, month: +m - 1 };
    });
    return { map, totals, months };
  }, [days]);

  const working = totals.present + totals.absent + totals.late;
  const percent = working > 0 ? Math.round(((totals.present + totals.late) / working) * 100) : 0;
  const pctColor = percent >= 85 ? '#22c55e' : percent >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <AttIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Attendance</Typography>
          {yearName && <Chip size="small" variant="outlined" label={yearName} />}
        </Stack>

        {loading ? (
          <Skeleton variant="rounded" height={160} />
        ) : working === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No attendance recorded for this session yet.
          </Typography>
        ) : (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 3 }}>
              {/* Percentage ring */}
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress variant="determinate" value={100} size={104} thickness={4} sx={{ color: '#eef1f6' }} />
                <CircularProgress variant="determinate" value={percent} size={104} thickness={4}
                  sx={{ color: pctColor, position: 'absolute', left: 0, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: pctColor, lineHeight: 1 }}>{percent}%</Typography>
                  <Typography variant="caption" color="text.secondary">attendance</Typography>
                </Box>
              </Box>
              {/* Stat tiles */}
              <Stack direction="row" spacing={1.25} sx={{ flex: 1, width: '100%' }}>
                <StatTile value={totals.present} label="Present" color={STATUS.present.color} />
                <StatTile value={totals.absent} label="Absent" color={STATUS.absent.color} />
                <StatTile value={totals.leave} label="Leave" color={STATUS.leave.color} />
                <StatTile value={working} label="Working days" color="#64748b" />
              </Stack>
            </Stack>

            {/* Calendar heatmaps */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 1 }}>
              {months.map((m) => <MonthGrid key={`${m.year}-${m.month}`} year={m.year} month={m.month} map={map} />)}
            </Box>

            {/* Legend */}
            <Stack direction="row" spacing={2} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
              {Object.values(STATUS).map((s) => (
                <Stack key={s.label} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: s.color }} />
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
