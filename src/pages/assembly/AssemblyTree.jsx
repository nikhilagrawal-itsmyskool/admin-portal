import React from 'react';
import { Box, Stack, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import {
  Add as AddChildIcon, ArrowUpward as UpIcon, ArrowDownward as DownIcon,
  Edit as EditIcon, Delete as DeleteIcon,
} from '@mui/icons-material';

// Renders the nested node tree with per-row actions. Owner-agnostic: the parent
// wires the actual create/reorder/edit/delete calls (plan vs special) via props.
export default function AssemblyTree({ nodes, canManage, onAddChild, onEdit, onMove, onDelete }) {
  const renderList = (list, depth) => list.map((n, i) => (
    <Box key={n.uuid}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, py: 0.75,
          pl: depth * 3, borderBottom: '1px solid', borderColor: 'divider',
          '&:hover .row-actions': { opacity: 1 },
        }}
      >
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
      {n.children?.length ? renderList(n.children, depth + 1) : null}
    </Box>
  ));

  return <Box>{renderList(nodes, 0)}</Box>;
}
