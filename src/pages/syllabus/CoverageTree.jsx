import React, { useMemo } from 'react';
import {
  Box, Table, TableBody, TableCell, TableHead, TableRow, Checkbox, Chip, Tooltip,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';

// Renders the syllabus node-tree for coverage marking. Coverage sits on leaf
// items (checkboxes); a chapter/unit shows a roll-up (covered/total of its item
// leaves) and completes automatically — it is never directly checkable.
//
// Two layouts from one data model: a compact TABLE on wide screens (admin), and a
// full-width TAP LIST on phones (teacher PWA) so nothing scrolls sideways — each
// topic is one tappable row with the checkbox up front and component/page/month
// folded into a small meta line.
const NON_CONTENT = new Set(['unit', 'section', 'exam', 'revision']);

export default function CoverageTree({ entries = [], monthLabel = {}, canMark, savingIds = {}, onToggle, currentMonth }) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));

  const rows = useMemo(() => {
    const byId = new Map(entries.map((e) => [e.uuid, e]));
    const children = new Map();
    entries.forEach((e) => {
      if (!e.parentEntryId) return;
      if (!children.has(e.parentEntryId)) children.set(e.parentEntryId, []);
      children.get(e.parentEntryId).push(e);
    });
    const isLeaf = (e) => !children.has(e.uuid);
    const depth = (e) => { let d = 0; let p = e.parentEntryId; while (p) { d += 1; p = byId.get(p)?.parentEntryId; } return d; };
    const leafDesc = (e) => {
      const out = []; const st = [...(children.get(e.uuid) || [])];
      while (st.length) { const n = st.pop(); if (isLeaf(n)) { if (!NON_CONTENT.has(n.entryType)) out.push(n); } else st.push(...(children.get(n.uuid) || [])); }
      return out;
    };
    return entries.map((e) => {
      const leaf = isLeaf(e);
      const group = !leaf;
      const checkable = leaf && !NON_CONTENT.has(e.entryType);
      let rollup = null;
      if (group) { const ld = leafDesc(e); rollup = { cov: ld.filter((x) => x.covered).length, total: ld.length }; }
      return { e, group, checkable, rollup, d: depth(e) };
    });
  }, [entries]);

  const rollupChip = (rollup) => (rollup.total > 0
    ? <Chip size="small" color={rollup.cov === rollup.total ? 'success' : 'default'}
        label={rollup.cov === rollup.total ? '✓ Done' : `${rollup.cov} / ${rollup.total}`} />
    : null);

  // Page is primary info (shown on the main line); component + month are secondary.
  const metaBits = (e) => [
    e.component || null,
    monthLabel[e.month] || e.month || null,
  ].filter(Boolean);
  const pageTag = (e) => (e.pageRef
    ? <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap' }}>p.{e.pageRef}</Typography>
    : null);

  // ── Phone: full-width tap list ───────────────────────────────────────────
  if (isNarrow) {
    return (
      <Box>
        {rows.map(({ e, group, checkable, rollup, d }) => {
          const pad = 1.5 + Math.min(d, 3) * 1.75;
          if (group) {
            return (
              <Box key={e.uuid} sx={{
                display: 'flex', alignItems: 'center', gap: 1, pl: pad, pr: 1.5, py: 1,
                bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider',
              }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, flex: 1, lineHeight: 1.3 }}>
                  {e.topicNo ? `${e.topicNo}. ` : ''}{e.title}
                </Typography>
                {pageTag(e)}
                {rollup && rollupChip(rollup)}
              </Box>
            );
          }
          const meta = metaBits(e);
          const disabled = !canMark || Boolean(savingIds[e.uuid]);
          return (
            <Box
              key={e.uuid}
              onClick={checkable && !disabled ? () => onToggle(e) : undefined}
              sx={{
                display: 'flex', alignItems: 'flex-start', gap: 1, pl: pad - 0.5, pr: 1.5, py: 1,
                borderBottom: 1, borderColor: 'divider',
                bgcolor: e.covered ? 'action.selected' : 'transparent',
                cursor: checkable && !disabled ? 'pointer' : 'default',
                '&:active': checkable && !disabled ? { bgcolor: 'action.focus' } : undefined,
              }}
            >
              {checkable ? (
                <Checkbox sx={{ p: 0.5, mt: '-2px' }} checked={Boolean(e.covered)} disabled={disabled}
                  onClick={(ev) => ev.stopPropagation()} onChange={() => onToggle(e)} />
              ) : (
                <Chip size="small" variant="outlined" label={e.entryType} sx={{ mt: 0.25 }} />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography sx={{ fontSize: 14, lineHeight: 1.35, flex: 1, minWidth: 0 }}>
                    {e.topicNo ? `${e.topicNo}. ` : ''}{e.title}
                  </Typography>
                  {pageTag(e)}
                </Box>
                {meta.length > 0 && (
                  <Typography variant="caption" sx={{ color: e.month === currentMonth ? 'error.main' : 'text.secondary', display: 'block', mt: 0.25 }}>
                    {meta.join(' · ')}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  // ── Wide: table ──────────────────────────────────────────────────────────
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 110 }} align="center">Done</TableCell>
            <TableCell>Chapter / Item</TableCell>
            <TableCell sx={{ width: 150 }}>Component</TableCell>
            <TableCell sx={{ width: 90 }}>Month</TableCell>
            <TableCell sx={{ width: 70 }}>Page</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ e, group, checkable, rollup, d }) => (
            <TableRow key={e.uuid} hover
              sx={{ bgcolor: group ? 'action.hover' : (e.covered ? 'action.selected' : 'inherit') }}>
              <TableCell align="center">
                {group ? (
                  rollupChip(rollup)
                ) : checkable ? (
                  <Tooltip title={canMark ? '' : 'You cannot mark coverage'}>
                    <span>
                      <Checkbox size="small" checked={Boolean(e.covered)}
                        disabled={!canMark || Boolean(savingIds[e.uuid])} onChange={() => onToggle(e)} />
                    </span>
                  </Tooltip>
                ) : <Chip size="small" variant="outlined" label={e.entryType} />}
              </TableCell>
              <TableCell sx={{ pl: 1 + d * 3, fontWeight: group ? 700 : 400 }}>
                {e.topicNo ? `${e.topicNo}. ` : ''}{e.title}
              </TableCell>
              <TableCell>{e.component || (group ? '' : '-')}</TableCell>
              <TableCell sx={{ color: e.month === currentMonth ? 'error.main' : undefined, fontWeight: e.month === currentMonth ? 700 : 400 }}>
                {monthLabel[e.month] || e.month}
              </TableCell>
              <TableCell>{e.pageRef || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
