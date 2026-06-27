import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import TeacherName from './TeacherName';

const DOW_LABEL = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
const FIXED_BG = '#eef1f7';
const TEACH_BG = '#ffffff';
const REG_BG = '#fff4f4';

// Renders a weekday×period grid from a config (days[].slots[]) and entries.
// mode 'class' filters entries by classId; mode 'teacher' by teacherId.
// Band cells (several entries sharing a slot) stack their offerings.
export default function TimetableGrid({ config, entries = [], mode, selectedId, classNameById = {} }) {
  if (!config?.days?.length) return <Typography sx={{ color: '#8f9bb3' }}>No grid configured.</Typography>;

  const days = [...config.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  // Render every sequence actually present, in order — including assembly (-1)
  // and the registration / 0th period (0), which are non-positive.
  const seqs = [...new Set(days.flatMap((d) => (d.slots || []).map((s) => s.sequence)))].sort((a, b) => a - b);

  // entries for the selected class/teacher, keyed by timeSlotId
  const mine = entries.filter((e) => (mode === 'class' ? e.classId === selectedId : e.teacherId === selectedId));
  const bySlot = new Map();
  for (const e of mine) {
    if (!bySlot.has(e.timeSlotId)) bySlot.set(e.timeSlotId, []);
    bySlot.get(e.timeSlotId).push(e);
  }

  const cell = (day, seq) => {
    const slot = (day.slots || []).find((s) => s.sequence === seq);
    if (!slot) return <Box sx={{ minHeight: 52 }} />;
    if (slot.slotType === 'registration') {
      // Attendance period: booked by the class teacher (no subject).
      const regItems = bySlot.get(slot.uuid) || [];
      return (
        <Box sx={{ minHeight: 52, bgcolor: REG_BG, border: '1px solid #f0c9c9', borderRadius: 1, p: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', lineHeight: 1.2 }}>
            {slot.label || 'Registration'}
          </Typography>
          {regItems.map((e) => (
            <Typography key={e.uuid} variant="caption" sx={{ color: '#8f9bb3', display: 'block', lineHeight: 1.2 }}>
              {mode === 'class' ? <TeacherName id={e.teacherId} /> : (classNameById[e.classId] || e.classId)}
            </Typography>
          ))}
          {regItems.length === 0 && <Typography variant="caption" sx={{ color: '#8f9bb3', fontStyle: 'italic' }}>Attendance</Typography>}
        </Box>
      );
    }
    if (slot.slotType !== 'teaching') {
      return (
        <Box sx={{ minHeight: 52, bgcolor: FIXED_BG, borderRadius: 1, p: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" sx={{ color: '#8f9bb3', fontStyle: 'italic' }}>{slot.label || slot.slotType}</Typography>
        </Box>
      );
    }
    const items = bySlot.get(slot.uuid) || [];
    return (
      <Box sx={{ minHeight: 52, bgcolor: TEACH_BG, border: '1px solid #e4e9f2', borderRadius: 1, p: 0.5 }}>
        {items.map((e) => (
          <Box key={e.uuid}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', lineHeight: 1.2 }}>
              {e.subjectName || e.subjectId}{e.bandId ? ' *' : ''}
            </Typography>
            <Typography variant="caption" sx={{ color: '#8f9bb3', display: 'block', lineHeight: 1.2 }}>
              {mode === 'class' ? '' : (classNameById[e.classId] || e.classId)}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Paper variant="outlined" sx={{ overflowX: 'auto', p: 1 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: `60px repeat(${days.length}, minmax(120px, 1fr))`, gap: 0.5, minWidth: 60 + days.length * 120 }}>
        <Box sx={{ fontWeight: 600, p: 0.5 }}><Typography variant="caption">Period</Typography></Box>
        {days.map((d) => (
          <Box key={d.uuid} sx={{ p: 0.5, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.label || DOW_LABEL[d.dayOfWeek] || d.dayOfWeek}</Typography>
          </Box>
        ))}
        {seqs.map((seq) => (
          <React.Fragment key={seq}>
            <Box sx={{ p: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#8f9bb3' }}>{seq}</Typography>
            </Box>
            {days.map((d) => <Box key={`${d.uuid}-${seq}`}>{cell(d, seq)}</Box>)}
          </React.Fragment>
        ))}
      </Box>
      <Typography variant="caption" sx={{ color: '#8f9bb3', mt: 1, display: 'block' }}>* = elective band (parallel options)</Typography>
    </Paper>
  );
}
