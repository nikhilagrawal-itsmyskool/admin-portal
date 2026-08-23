import React from 'react';
import { Box, Typography } from '@mui/material';
import { monthGridSun, WEEKDAY_HEADS, CHIP_CODES, typeMeta, typeAbbr } from './calendarUtils';

const MAX_CHIPS = 3; // entries shown per cell before "+N more" (keeps cells scroll-free)

// The month grid. `daysByDate` maps yyyy-mm-dd -> CalendarDay ({ weekday, isWeeklyOff,
// holiday, entries }). Cells are clickable (except padding days from adjacent months).
export default function MonthGrid({ year, month, daysByDate, today, onSelect }) {
  const weeks = monthGridSun(year, month);
  return (
    // Fills the height its parent gives it; rows share that height equally, so the
    // whole month is visible on any monitor. A busy day scrolls inside its own cell.
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75, mb: 0.75, flex: '0 0 auto' }}>
        {WEEKDAY_HEADS.map((h) => (
          <Typography key={h} variant="caption" align="center" sx={{ fontWeight: 700, letterSpacing: 0.6, color: 'text.disabled', textTransform: 'uppercase' }}>{h}</Typography>
        ))}
      </Box>
      <Box sx={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))`, gap: 0.75 }}>
        {weeks.flat().map((cell) => {
          if (!cell.inMonth) return <Box key={cell.date} sx={{ borderRadius: 1.5, bgcolor: 'action.hover', opacity: 0.5 }} />;
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
                minHeight: 0, p: 0.75, borderRadius: 1.5, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0.4, overflow: 'hidden',
                bgcolor: hol ? '#fff7f6' : (isSun ? '#fbfcfe' : 'background.paper'),
                border: '1px solid', borderColor: hol ? '#f6cfca' : 'divider',
                outline: isToday ? '2px solid' : 'none', outlineColor: 'primary.main', outlineOffset: '-2px',
                transition: 'box-shadow .12s, border-color .12s',
                '&:hover': { boxShadow: 2, borderColor: 'primary.light' },
              }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flex: '0 0 auto' }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: isSun ? 'secondary.main' : 'text.primary' }}>{cell.day}</Typography>
                {hol
                  ? <Box sx={{ fontSize: 9, fontWeight: 700, color: '#fff', bgcolor: hol.kind === 'restricted' ? 'warning.main' : 'error.main', px: 0.6, py: 0.2, borderRadius: 3 }}>{hol.kind === 'restricted' ? 'RH' : 'HOLIDAY'}</Box>
                  : (isSun ? <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'secondary.main', textTransform: 'uppercase' }}>Off</Typography> : null)}
              </Box>
              {/* Clamped (never scrolls): theme + a few tagged entries + "+N more".
                  Full detail is one tap away in the day view / drawer. */}
              <Box sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                {theme && (
                  <Typography sx={{ fontSize: 11, fontStyle: 'italic', color: '#41506b', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: '0 0 auto' }}>{theme.value}</Typography>
                )}
                {chips.slice(0, MAX_CHIPS).map((e) => {
                  const m = typeMeta(e.typeCode);
                  return (
                    <Box key={e.uuid} title={`${e.typeName}: ${e.value}`}
                      sx={{ fontSize: 10.5, lineHeight: 1.25, px: 0.6, py: 0.25, borderRadius: 0.75, color: m.color, bgcolor: m.bg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '0 0 auto' }}>
                      <Box component="span" sx={{ fontWeight: 800, letterSpacing: 0.3, mr: 0.5 }}>{typeAbbr(e.typeCode, e.typeName)}</Box>
                      <Box component="span" sx={{ fontWeight: 500 }}>{e.value}</Box>
                    </Box>
                  );
                })}
                {chips.length > MAX_CHIPS && (
                  <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', flex: '0 0 auto' }}>+{chips.length - MAX_CHIPS} more</Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
