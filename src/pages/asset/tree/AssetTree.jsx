import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Collapse,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  DriveFileMove as MoveIcon,
  Person as PersonIcon,
  CallSplit as SplitIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Category as TypeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { assetService } from '../../../services/assetService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import AssetFormDialog from '../dialogs/AssetFormDialog';
import MoveAssetDialog from '../dialogs/MoveAssetDialog';
import IndividualizeDialog from '../dialogs/IndividualizeDialog';
import ResponsibilityDialog from '../dialogs/ResponsibilityDialog';
import MovementsDialog from '../dialogs/MovementsDialog';

// ---- tree helpers ----
function flatten(nodes, acc = []) {
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) flatten(n.children, acc);
  }
  return acc;
}

function collectDescendantIds(node, acc = new Set()) {
  acc.add(node.uuid);
  for (const c of node.children || []) collectDescendantIds(c, acc);
  return acc;
}

function buildNameById(nodes, map = {}) {
  for (const n of nodes) {
    map[n.uuid] = n.name;
    if (n.children?.length) buildNameById(n.children, map);
  }
  return map;
}

// ---- single node row (recursive) ----
function AssetNode({ node, depth, onAction }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isBucket = !node.assetCode && node.quantity > 1;

  const respColor = node.isDelegated ? 'warning' : node.responsibilitySource === 'self' ? 'primary' : 'default';
  const respVariant = node.responsibilitySource === 'inherited' ? 'outlined' : 'filled';

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 0.75,
          pl: depth * 3,
          borderBottom: '1px solid #f0f3f8',
          '&:hover': { backgroundColor: '#f7f9fc' },
          '&:hover .node-actions': { opacity: 1 },
        }}
      >
        <IconButton
          size="small"
          onClick={() => setOpen((o) => !o)}
          sx={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>

        <Chip label={node.typeLabel || node.typeCode || 'asset'} size="small" variant="outlined" />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{node.name}</Typography>

        {isBucket && <Chip label={`×${node.quantity}`} size="small" color="info" variant="outlined" />}
        {node.assetCode && (
          <Chip label={node.assetCode} size="small" sx={{ fontFamily: 'monospace' }} variant="outlined" />
        )}
        {node.assetStatus && node.assetStatus !== 'active' && (
          <Chip label={node.assetStatus} size="small" color="error" variant="outlined" />
        )}

        {node.responsibilitySource === 'none' ? (
          <Chip label="Unassigned" size="small" variant="outlined" sx={{ color: '#8f9bb3' }} />
        ) : (
          <Tooltip
            title={
              node.isDelegated
                ? 'Delegated (differs from inherited owner)'
                : node.responsibilitySource === 'inherited'
                ? 'Inherited from a parent'
                : 'Assigned here'
            }
          >
            <Chip
              icon={<PersonIcon />}
              label={node.effectiveResponsibleName || node.effectiveResponsibleId}
              size="small"
              color={respColor}
              variant={respVariant}
            />
          </Tooltip>
        )}

        <Box className="node-actions" sx={{ ml: 'auto', opacity: 0.25, transition: 'opacity 0.15s' }}>
          <Tooltip title="Add child">
            <IconButton size="small" onClick={() => onAction('addChild', node)}><AddIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onAction('edit', node)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Responsibility">
            <IconButton size="small" onClick={() => onAction('responsibility', node)}><PersonIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Move">
            <IconButton size="small" onClick={() => onAction('move', node)}><MoveIcon fontSize="small" /></IconButton>
          </Tooltip>
          {isBucket && (
            <Tooltip title="Individualize (tag items)">
              <IconButton size="small" onClick={() => onAction('individualize', node)}><SplitIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          <Tooltip title="Movement history">
            <IconButton size="small" onClick={() => onAction('movements', node)}><HistoryIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onAction('delete', node)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          {node.children.map((child) => (
            <AssetNode key={child.uuid} node={child} depth={depth + 1} onAction={onAction} />
          ))}
        </Collapse>
      )}
    </Box>
  );
}

export default function AssetTree() {
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [types, setTypes] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // dialog state
  const [formDialog, setFormDialog] = useState({ open: false, asset: null, parent: null });
  const [moveDialog, setMoveDialog] = useState({ open: false, asset: null });
  const [indivDialog, setIndivDialog] = useState({ open: false, asset: null });
  const [respDialog, setRespDialog] = useState({ open: false, asset: null });
  const [movementsDialog, setMovementsDialog] = useState({ open: false, asset: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, asset: null });
  const [deleting, setDeleting] = useState(false);

  const flat = flatten(tree);
  const nameById = buildNameById(tree);

  useEffect(() => {
    loadLookups();
    loadTree();
  }, []);

  const loadLookups = async () => {
    try {
      const [t, c, s] = await Promise.all([
        assetService.getTypes(),
        assetService.getConditions(),
        assetService.getStatuses(),
      ]);
      setTypes(t.types || []);
      setConditions(c.conditions || []);
      setStatuses(s.statuses || []);
    } catch (err) {
      console.error('Failed to load lookups', err);
    }
  };

  const loadTree = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await assetService.getTree();
      setTree(data);
    } catch (err) {
      setError('Failed to load asset tree');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action, node) => {
    switch (action) {
      case 'addChild': setFormDialog({ open: true, asset: null, parent: node }); break;
      case 'edit': setFormDialog({ open: true, asset: node, parent: null }); break;
      case 'responsibility': setRespDialog({ open: true, asset: node }); break;
      case 'move': setMoveDialog({ open: true, asset: node }); break;
      case 'individualize': setIndivDialog({ open: true, asset: node }); break;
      case 'movements': setMovementsDialog({ open: true, asset: node }); break;
      case 'delete': setDeleteDialog({ open: true, asset: node }); break;
      default: break;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await assetService.deleteAsset(deleteDialog.asset.uuid);
      setDeleteDialog({ open: false, asset: null });
      loadTree();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete asset');
      setDeleteDialog({ open: false, asset: null });
    } finally {
      setDeleting(false);
    }
  };

  // Candidates for a move = every asset except the node and its descendants.
  const moveCandidates = () => {
    if (!moveDialog.asset) return [];
    const node = flat.find((n) => n.uuid === moveDialog.asset.uuid) || moveDialog.asset;
    const forbidden = collectDescendantIds(node);
    return flat.filter((n) => !forbidden.has(n.uuid));
  };

  const afterMutation = () => loadTree();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Asset Register</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<TypeIcon />} onClick={() => navigate('/asset/types')}>
            Asset Types
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadTree}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormDialog({ open: true, asset: null, parent: null })}>
            Add Root Asset
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ p: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : tree.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: '#8f9bb3' }}>
            <Typography variant="body1" sx={{ mb: 1 }}>No assets yet.</Typography>
            <Typography variant="body2">Start by adding a root asset (e.g. a Building or Room).</Typography>
          </Box>
        ) : (
          tree.map((node) => (
            <AssetNode key={node.uuid} node={node} depth={0} onAction={handleAction} />
          ))
        )}
      </Card>

      <AssetFormDialog
        open={formDialog.open}
        asset={formDialog.asset}
        parent={formDialog.parent}
        types={types}
        conditions={conditions}
        statuses={statuses}
        onClose={() => setFormDialog({ open: false, asset: null, parent: null })}
        onSaved={afterMutation}
      />

      <MoveAssetDialog
        open={moveDialog.open}
        asset={moveDialog.asset}
        candidates={moveCandidates()}
        onClose={() => setMoveDialog({ open: false, asset: null })}
        onMoved={afterMutation}
      />

      <IndividualizeDialog
        open={indivDialog.open}
        asset={indivDialog.asset}
        onClose={() => setIndivDialog({ open: false, asset: null })}
        onDone={afterMutation}
      />

      <ResponsibilityDialog
        open={respDialog.open}
        asset={respDialog.asset}
        onClose={() => setRespDialog({ open: false, asset: null })}
        onSaved={afterMutation}
      />

      <MovementsDialog
        open={movementsDialog.open}
        asset={movementsDialog.asset}
        nameById={nameById}
        onClose={() => setMovementsDialog({ open: false, asset: null })}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Asset"
        message={`Delete "${deleteDialog.asset?.name}"? Assets with active children cannot be deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, asset: null })}
        loading={deleting}
      />
    </Box>
  );
}
