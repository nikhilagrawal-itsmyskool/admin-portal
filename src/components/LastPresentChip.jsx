import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { EventAvailable } from '@mui/icons-material';

// "Last present" = the most recent date a student physically attended (present / late /
// half-day), across all years. Colour cues how long the gap is: fresh (≤3 days) green,
// stale (4–10) amber, long (>10) red — so a creeping absence stands out at a glance.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(d) {
  const [y, m, day] = String(d).split('-');
  return `${Number(day)} ${MON[Number(m) - 1] || m} ${y}`;
}

function daysAgo(d) {
  const [y, m, day] = String(d).split('-').map(Number);
  if (!y || !m || !day) return null;
  const then = Date.UTC(y, m - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - then) / 86400000);
}

// compact: list-cell mode — just the "Xd ago" (tooltip shows the date), em-dash when never present.
export default function LastPresentChip({ date, size = 'small', showIcon = true, prefix = 'Last present', compact = false }) {
  if (!date) {
    if (compact) return <span style={{ color: 'rgba(0,0,0,0.38)' }}>—</span>;
    return <Chip size={size} variant="outlined" label="No attendance yet" sx={{ color: 'text.disabled' }} />;
  }
  const n = daysAgo(date);
  const ago = n == null ? '' : n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n}d ago`;
  const color = n == null ? 'default' : n <= 3 ? 'success' : n <= 10 ? 'warning' : 'error';
  return (
    <Tooltip title={`Last present: ${fmtDate(date)}`}>
      <Chip
        size={size}
        color={color}
        variant="outlined"
        {...(showIcon && !compact ? { icon: <EventAvailable /> } : {})}
        label={compact ? ago : `${prefix} · ${ago}`}
      />
    </Tooltip>
  );
}
