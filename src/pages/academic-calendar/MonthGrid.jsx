import React from 'react';
import { Box, Typography } from '@mui/material';
import { monthGridSun, WEEKDAY_HEADS, CHIP_CODES, typeMeta } from './calendarUtils';

// The month grid. `daysByDate` maps yyyy-mm-dd -> CalendarDay ({ weekday, isWeeklyOff,
// holiday, entries }). Cells are clickable (except padding days from adjacent months).
export default function MonthGrid({ year, month, daysByDate, today, onSelect }) {
  const weeks = monthGridSun(year, month);
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75, mb: 0.75 }}>
        {WEEKDAY_HEADS.map((h) => (
          <Typography key={h} variant="caption" align="center" sx={{ fontWeight: 700, letterSpacing: 0.6, color: 'text.disabled', textTransform: 'uppercase' }}>{h}</Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
        {weeks.flat().map((cell) => {
          if (!cell.inMonth) return <Box key={cell.date} sx={{ minHeight: 118, borderRadius: 1.5, bgcolor: 'action.hover', opacity: 0.5 }} />;
          const d = daysByDate[cell.date];
          const hol = d?.holiday;
          const isSun = d?.isWeeklyOff;
          const isToday = cell.date === today;
          const chips = [];
          for (const code of CHIP_CODES) {
            for (const e of (d?.entries || []).filter((x) => x.typeCode === code)) chips.push(e);
          }
          const theme = (d?.entries || []).find((e) => e.typeCode === 'theme');
          return (
            <Box key={cell.date} onClick={() => onSelect(cell.date)}
              sx={{
                minHeight: 118, p: 1, borderRadius: 1.5, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0.5,
                bgcolor: hol ? '#fff7f6' : (isSun ? '#fbfcfe' : 'background.paper'),
                border: '1px solid', borderColor: hol ? '#f6cfca' : 'divider',
                outline: isToday ? '2px solid' : 'none', outlineColor: 'primary.main', outlineOffset: '-2px',
                transition: 'box-shadow .12s, border-color .12s',
                '&:hover': { boxShadow: 2, borderColor: 'primary.light' },
              }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isSun ? 'secondary.main' : 'text.primary' }}>{cell.day}</Typography>
                {hol
                  ? <Box sx={{ fontSize: 9.5, fontWeight: 700, color: '#fff', bgcolor: hol.kind === 'restricted' ? 'warning.main' : 'error.main', px: 0.75, py: 0.25, borderRadius: 3 }}>{hol.kind === 'restricted' ? 'RH' : 'HOLIDAY'}</Box>
                  : (isSun ? <Typography sx={{ fontSize: 9.5, fontWeight: 600, color: 'secondary.main', textTransform: 'uppercase' }}>Off</Typography> : null)}
              </Box>
              {theme && (
                <Typography sx={{ fontSize: 11.5, fontStyle: 'italic', color: '#41506b', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{theme.value}</Typography>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, mt: 'auto' }}>
                {chips.map((e) => {
                  const m = typeMeta(e.typeCode);
                  return (
                    <Box key={e.uuid} title={e.value}
                      sx={{ fontSize: 10.5, lineHeight: 1.25, px: 0.75, py: 0.25, borderRadius: 0.75, fontWeight: 600, color: m.color, bgcolor: m.bg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.value}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
