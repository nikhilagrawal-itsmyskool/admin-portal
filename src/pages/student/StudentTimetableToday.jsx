import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip, Skeleton } from '@mui/material';
import { Schedule as ClockIcon } from '@mui/icons-material';
import { timetableService } from '../../services/timetableService';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// "08:00" / "08:00:00" -> "8:00 AM"
const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  let hh = parseInt(h, 10);
  const ap = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${m} ${ap}`;
};

// Non-teaching slot types render as muted bands (no subject/teacher).
const NON_PERIOD = new Set(['break', 'lunch', 'assembly', 'interval']);

export default function StudentTimetableToday({ classId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!classId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await timetableService.getClassToday(classId);
        if (alive) setData(res);
      } catch {
        if (alive) setData({ note: 'Could not load the timetable' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [classId]);

  const slots = data?.slots || [];

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <ClockIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Today's Timetable</Typography>
          {data?.dayOfWeek != null && <Chip size="small" variant="outlined" label={DOW[data.dayOfWeek]} />}
          {data?.seasonName && <Chip size="small" variant="outlined" color="primary" label={data.seasonName} />}
        </Stack>

        {loading ? (
          <Stack spacing={1}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={44} />)}</Stack>
        ) : !classId ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No class assigned for this session.
          </Typography>
        ) : slots.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            {data?.note || 'No timetable for today.'}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {slots.map((s) => {
              const isNow = s.timeSlotId === data.nowSlotId;
              const isNext = s.timeSlotId === data.nextSlotId;
              const isPeriod = !NON_PERIOD.has(s.slotType);
              const subjects = (s.entries || []).map((e) => e.subjectName).filter(Boolean).join(' / ');
              const teachers = (s.entries || []).map((e) => e.teacherName).filter(Boolean).join(', ');
              const title = isPeriod ? (subjects || s.label || 'Free period') : (s.label || s.slotType);

              return (
                <Box
                  key={s.timeSlotId}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2,
                    border: '1px solid',
                    borderColor: isNow ? 'primary.main' : '#eef1f6',
                    bgcolor: isNow ? 'primary.50' : isPeriod ? '#fff' : '#f8fafc',
                    boxShadow: isNow ? '0 0 0 1px rgba(25,118,210,0.25)' : 'none',
                  }}
                >
                  {/* time rail */}
                  <Box sx={{ minWidth: 74, textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', lineHeight: 1.2 }}>
                      {fmtTime(s.startTime)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{fmtTime(s.endTime)}</Typography>
                  </Box>
                  <Box sx={{ width: 3, alignSelf: 'stretch', borderRadius: 2, bgcolor: isNow ? 'primary.main' : isPeriod ? '#cbd5e1' : '#e2e8f0' }} />
                  {/* content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: isPeriod ? 600 : 500, color: isPeriod ? 'text.primary' : 'text.secondary' }} noWrap>
                      {title}
                    </Typography>
                    {isPeriod && teachers && (
                      <Typography variant="caption" color="text.secondary" noWrap>{teachers}</Typography>
                    )}
                  </Box>
                  {isNow && <Chip size="small" color="primary" label="Now" sx={{ height: 22 }} />}
                  {isNext && !isNow && <Chip size="small" variant="outlined" label="Next" sx={{ height: 22 }} />}
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
