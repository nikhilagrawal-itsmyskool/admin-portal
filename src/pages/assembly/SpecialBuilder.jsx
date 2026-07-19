import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Chip, Stack, Alert, IconButton,
  Divider, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Publish as PublishIcon, Add as AddIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { classService } from '../../services/classService';
import { useCan } from '../../permissions/can';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AssemblyTree from './AssemblyTree';
import NodeEditorDrawer from './NodeEditorDrawer';

const findNode = (list, uuid) => {
  for (const n of list) {
    if (n.uuid === uuid) return n;
    const c = findNode(n.children || [], uuid);
    if (c) return c;
  }
  return null;
};
const siblingsOf = (tree, node) => (!node.parentId ? tree : findNode(tree, node.parentId)?.children || []);

export default function SpecialBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('assembly.manage');

  const [special, setSpecial] = useState(null);
  const [tree, setTree] = useState([]);
  const [weekdays, setWeekdays] = useState([]);
  const [roles, setRoles] = useState([]);
  const [targetTypes, setTargetTypes] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [editNode, setEditNode] = useState(null);
  const [addDialog, setAddDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, node: null });
  const [deleteSpecialOpen, setDeleteSpecialOpen] = useState(false);

  const refresh = useCallback(async (keepEditUuid) => {
    const detail = await assemblyService.getSpecial(id);
    setSpecial(detail);
    setTree(detail.nodes || []);
    if (keepEditUuid) setEditNode(findNode(detail.nodes || [], keepEditUuid));
    return detail;
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const lookups = await assemblyService.getLookups();
        setWeekdays(lookups?.weekdays || []);
        setRoles(lookups?.responsibleRoles || []);
        setTargetTypes(lookups?.responsibleTargetTypes || []);
        const detail = await refresh();
        const classes = await classService.getClasses({ academic_year_id: detail.academicYearId });
        setClassOptions(Array.isArray(classes) ? classes : classes?.classes || []);
      } catch (err) {
        setError(err.response?.data?.error?.description || 'Failed to load special assembly');
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const wrap = async (fn, keepEditUuid) => {
    setError('');
    try { await fn(); await refresh(keepEditUuid); }
    catch (err) { setError(err.response?.data?.error?.description || 'Action failed'); }
  };

  const submitAdd = () => {
    const title = (addDialog.title || '').trim();
    if (!title) return;
    const parentId = addDialog.parentId || undefined;
    setAddDialog(null);
    wrap(() => assemblyService.createSpecialNode(id, { parentId, title }));
  };

  const move = (node, dir) => {
    const sibs = siblingsOf(tree, node);
    const i = sibs.findIndex((s) => s.uuid === node.uuid);
    const j = i + dir;
    if (j < 0 || j >= sibs.length) return;
    const order = sibs.map((s) => s.uuid);
    [order[i], order[j]] = [order[j], order[i]];
    wrap(() => assemblyService.reorderSpecialNodes(id, node.parentId || null, order));
  };

  const del = async () => {
    const node = deleteDialog.node;
    setDeleteDialog({ open: false, node: null });
    await wrap(() => assemblyService.deleteNode(node.uuid));
  };

  const publish = async () => {
    setError(''); setMsg('');
    try { setSpecial(await assemblyService.publishSpecial(id)); setMsg('Special assembly published'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to publish'); }
  };

  const removeSpecial = async () => {
    setDeleteSpecialOpen(false);
    try { await assemblyService.deleteSpecial(id); navigate(`/assembly/plans/${special.planId}`); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to delete'); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  if (!special) return <Alert severity="error">{error || 'Special assembly not found'}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <IconButton onClick={() => navigate(`/assembly/plans/${special.planId}`)}><BackIcon /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">{special.title}</Typography>
          <Typography variant="body2" color="text.secondary">Special assembly · {special.specialDate}</Typography>
        </Box>
        <Chip label={special.publishStatus === 'published' ? 'Published' : special.publishStatus === 'archived' ? 'Archived' : 'Draft'}
          color={special.publishStatus === 'published' ? 'success' : 'default'}
          variant={special.publishStatus === 'published' ? 'filled' : 'outlined'} />
        {canManage && special.publishStatus !== 'published' &&
          <Button variant="contained" startIcon={<PublishIcon />} onClick={publish}>Publish</Button>}
        {canManage && <IconButton color="error" onClick={() => setDeleteSpecialOpen(true)}><DeleteIcon /></IconButton>}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Assembly structure (this date only)</Typography>
            {canManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setAddDialog({ parentId: null, title: '' })}>Add block</Button>}
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {tree.length === 0
            ? <Typography variant="body2" color="text.secondary">Empty. Add blocks to build this day's special running order.</Typography>
            : <AssemblyTree
                nodes={tree} canManage={canManage}
                onAddChild={(n) => setAddDialog({ parentId: n.uuid, title: '' })}
                onEdit={(n) => setEditNode(n)}
                onMove={move}
                onDelete={(n) => setDeleteDialog({ open: true, node: n })}
              />}
        </CardContent>
      </Card>

      <NodeEditorDrawer
        open={Boolean(editNode)} node={editNode} onClose={() => setEditNode(null)}
        onSaved={() => refresh(editNode?.uuid)}
        weekdays={weekdays} roles={roles} targetTypes={targetTypes} parentEffectiveDays={[]} hideDays
        classOptions={classOptions} academicYearId={special.academicYearId}
      />

      <Dialog open={Boolean(addDialog)} onClose={() => setAddDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>{addDialog?.parentId ? 'Add child node' : 'Add block'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth size="small" label="Title" sx={{ mt: 1 }}
            value={addDialog?.title || ''} onChange={(e) => setAddDialog({ ...addDialog, title: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitAdd}>Add</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open} title="Delete node"
        message={`Delete "${deleteDialog.node?.title || ''}" and all its child nodes?`}
        onConfirm={del} onCancel={() => setDeleteDialog({ open: false, node: null })}
      />
      <ConfirmDialog
        open={deleteSpecialOpen} title="Delete special assembly"
        message={`Delete the "${special.title}" special assembly for ${special.specialDate}? This cannot be undone.`}
        onConfirm={removeSpecial} onCancel={() => setDeleteSpecialOpen(false)}
      />
    </Box>
  );
}
