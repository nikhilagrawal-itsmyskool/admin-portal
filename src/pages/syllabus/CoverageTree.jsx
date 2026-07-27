import React, { useMemo } from 'react';
import {
  Box, Table, TableBody, TableCell, TableHead, TableRow, Checkbox, Chip, Tooltip,
} from '@mui/material';

// Renders the syllabus node-tree for coverage marking. Coverage sits on leaf
// items (checkboxes); a chapter/unit shows a roll-up (covered/total of its item
// leaves) and completes automatically — it is never directly checkable.
const NON_CONTENT = new Set(['unit', 'section', 'exam', 'revision']);

export default function CoverageTree({ entries = [], monthLabel = {}, canMark, savingIds = {}, onToggle, currentMonth }) {
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
                  rollup.total > 0
                    ? <Chip size="small" color={rollup.cov === rollup.total ? 'success' : 'default'}
                        label={rollup.cov === rollup.total ? '✓ Done' : `${rollup.cov} / ${rollup.total}`} />
                    : null
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
