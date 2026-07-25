import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';

// Compact read-only render of a /resolve result. Shows a "no assembly" state
// when not held (a non-assembly weekday now; a holiday once the academic
// calendar exists — same state, so holidays plug in with no UI change).
function RunNodes({ nodes, depth = 0 }) {
  return (nodes || []).map((n) => (
    <Box key={n.uuid} sx={{ pl: depth ? 1.5 : 0, borderLeft: depth ? '2px solid' : 'none', borderColor: 'divider', ml: depth ? 0.5 : 0, py: 0.25 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" fontWeight={depth ? 400 : 600}>{n.title}</Typography>
        {n.startTime && <Chip size="small" variant="outlined" label={n.startTime} sx={{ height: 16, fontSize: 10 }} />}
        {(n.responsible || []).map((r) => (
          <Chip key={r.uuid} size="small" color="info" variant="outlined" sx={{ height: 16, fontSize: 10 }}
            label={`${r.role ? r.role + ': ' : ''}${r.targetName || r.targetText || r.targetType}`} />
        ))}
      </Stack>
      <RunNodes nodes={n.children} depth={depth + 1} />
    </Box>
  ));
}

export default function ResolvedRunSheet({ resolved, showThemes = true }) {
  if (!resolved) return null;
  if (!resolved.held) {
    return (
      <Box sx={{ color: 'text.secondary', py: 1 }}>
        <Typography variant="body2">No assembly</Typography>
        <Typography variant="caption">({resolved.weekday})</Typography>
      </Box>
    );
  }
  return (
    <Box>
      {resolved.source === 'special' && (
        <Chip size="small" color="secondary" sx={{ mb: 0.5, mr: 0.5 }} label={`Special: ${resolved.title || ''}`} />
      )}
      {showThemes && (resolved.themes || []).map((t) => (
        <Chip key={t.uuid} size="small" variant="outlined" sx={{ mb: 0.5, mr: 0.5 }} label={t.title} />
      ))}
      {/* Day roster people — who's been assigned each responsibility. */}
      {[
        ['Anchor', resolved.anchors],
        ['Owner', resolved.dayOwners],
        ['Commander', resolved.commanders],
        ['Drummer', resolved.drummers],
      ].map(([label, arr]) => {
        const names = (arr || []).map((p) => p.name || p.className || p.studentId).filter(Boolean).join(', ');
        return names ? (
          <Chip key={label} size="small" color="success" variant="outlined" sx={{ mb: 0.5, mr: 0.5 }} label={`${label}: ${names}`} />
        ) : null;
      })}
      {resolved.nodes?.length
        ? <RunNodes nodes={resolved.nodes} />
        : <Typography variant="caption" color="text.secondary">No items for this day.</Typography>}
    </Box>
  );
}
