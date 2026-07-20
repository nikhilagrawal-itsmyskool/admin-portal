import React, { useState } from 'react';
import {
  Box, Stack, Typography, Chip, IconButton, Tooltip, Collapse,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import {
  Add as AddChildIcon, ArrowUpward as UpIcon, ArrowDownward as DownIcon,
  Edit as EditIcon, Delete as DeleteIcon, GridOn as GridIcon,
  ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

const DAYS = [
  { value: 'mon', label: 'Mon' }, { value: 'tue', label: 'Tue' }, { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' }, { value: 'fri', label: 'Fri' }, { value: 'sat', label: 'Sat' },
];

// Renders the nested node tree with per-row actions. Owner-agnostic: the parent
// wires the actual create/reorder/edit/delete calls (plan vs special) via props.
// A leaf that carries per-weekday content can be expanded inline to reveal its
// Mon–Sat grid (the daily focus) without cluttering the tree.
export default function AssemblyTree({ nodes, canManage, onAddChild, onEdit, onMove, onDelete }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = (uuid) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
    return next;
  });

  const renderList = (list, depth) => list.map((n, i) => {
    const isLeaf = !n.children?.length;
    const grid = n.dayContent || [];
    const hasGrid = isLeaf && grid.length > 0;
    const byDay = Object.fromEntries(grid.map((c) => [c.weekday, c.content]));
    const isOpen = expanded.has(n.uuid);
    return (
      <Box key={n.uuid}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, py: 0.75,
            pl: depth * 3, borderBottom: '1px solid', borderColor: 'divider',
            '&:hover .row-actions': { opacity: 1 },
          }}
        >
          <Box sx={{ width: 28, flexShrink: 0 }}>
            {hasGrid && (
              <Tooltip title={isOpen ? 'Hide week grid' : 'Show week grid'}>
                <IconButton size="small" onClick={() => toggle(n.uuid)}>
                  {isOpen ? <ExpandLessIcon fontSize="inherit" /> : <GridIcon fontSize="inherit" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" fontWeight={600} noWrap>{n.title}</Typography>
              {(n.days || []).map((d) => (
                <Chip key={d} label={d} size="small" variant="outlined" sx={{ height: 18, fontSize: 11 }} />
              ))}
              {(n.responsible || []).map((r) => (
                <Chip key={r.uuid} size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: 11 }}
                  label={`${r.role ? r.role + ': ' : ''}${r.targetName || r.targetText || r.targetType}`} />
              ))}
              {n.resources?.length ? (
                <Chip label={`${n.resources.length} link${n.resources.length > 1 ? 's' : ''}`} size="small" sx={{ height: 18, fontSize: 11 }} />
              ) : null}
            </Stack>
            {n.description && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{n.description}</Typography>
            )}
          </Box>
          {canManage && (
            <Stack direction="row" className="row-actions" sx={{ opacity: { xs: 1, md: 0.35 }, transition: 'opacity .15s' }}>
              <Tooltip title="Move up"><span><IconButton size="small" onClick={() => onMove(n, -1)} disabled={i === 0}><UpIcon fontSize="inherit" /></IconButton></span></Tooltip>
              <Tooltip title="Move down"><span><IconButton size="small" onClick={() => onMove(n, 1)} disabled={i === list.length - 1}><DownIcon fontSize="inherit" /></IconButton></span></Tooltip>
              <Tooltip title="Add child"><IconButton size="small" onClick={() => onAddChild(n)}><AddChildIcon fontSize="inherit" /></IconButton></Tooltip>
              <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(n)}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
              <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(n)}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
            </Stack>
          )}
        </Box>

        {hasGrid && (
          <Collapse in={isOpen} unmountOnExit>
            <Box sx={{ pl: depth * 3 + 3.5, pr: 1, py: 1, bgcolor: 'action.hover', overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 520, '& td, & th': { fontSize: 12, py: 0.5 } }}>
                <TableHead>
                  <TableRow>{DAYS.map((d) => <TableCell key={d.value} sx={{ fontWeight: 600 }}>{d.label}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    {DAYS.map((d) => (
                      <TableCell key={d.value} sx={{ verticalAlign: 'top', color: byDay[d.value] ? 'text.primary' : 'text.disabled' }}>
                        {byDay[d.value] || '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        )}

        {n.children?.length ? renderList(n.children, depth + 1) : null}
      </Box>
    );
  });

  return <Box>{renderList(nodes, 0)}</Box>;
}
