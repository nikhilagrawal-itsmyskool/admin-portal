import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Chip, Stack, Alert, IconButton,
  Autocomplete, TextField, Divider, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, List, ListItemButton, ListItemText,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Publish as PublishIcon, Save as SaveIcon, Add as AddIcon,
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
const siblingsOf = (tree, node) => {
  if (!node.parentId) return tree;
  return findNode(tree, node.parentId)?.children || [];
};

// Read-only render of a resolved day (effective responsible already applied).
function ResolvedNodes({ nodes, depth = 0 }) {
  return (nodes || []).map((n) => (
    <Box key={n.uuid} sx={{ py: 0.5, borderLeft: depth ? '2px solid' : 'none', borderColor: 'divider', ml: depth ? 1 : 0, pl: depth ? 2 : 0 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" fontWeight={600}>{n.title}</Typography>
        {n.startTime && <Chip size="small" variant="outlined" label={n.startTime} sx={{ height: 18, fontSize: 11 }} />}
        {(n.responsible || []).map((r) => (
          <Chip key={r.uuid} size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: 11 }}
            label={`${r.role ? r.role + ': ' : ''}${r.targetName || r.targetText || r.targetType}`} />
        ))}
      </Stack>
      {n.description && <Typography variant="caption" color="text.secondary">{n.description}</Typography>}
      <ResolvedNodes nodes={n.children} depth={depth + 1} />
    </Box>
  ));
}

export default function PlanBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('assembly.manage');

  const [plan, setPlan] = useState(null);
  const [tree, setTree] = useState([]);
  const [weekdays, setWeekdays] = useState([]);
  const [roles, setRoles] = useState([]);
  const [targetTypes, setTargetTypes] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [dirtyClasses, setDirtyClasses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [editNode, setEditNode] = useState(null);
  const [addDialog, setAddDialog] = useState(null); // { parentId, title }
  const [deleteDialog, setDeleteDialog] = useState({ open: false, node: null });
  const [specials, setSpecials] = useState([]);
  const [specialDialog, setSpecialDialog] = useState(null); // { specialDate, title, source }
  const [previewDate, setPreviewDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewErr, setPreviewErr] = useState('');
  const [houseMode, setHouseMode] = useState(false);

  // ceilingMap[nodeId] = effective weekdays of its PARENT (plan days for roots).
  const ceilingMap = {};
  (function walk(list, parentEff) {
    list.forEach((n) => {
      ceilingMap[n.uuid] = parentEff;
      walk(n.children || [], n.days?.length ? n.days : parentEff);
    });
  })(tree, plan?.days || []);

  const refreshTree = useCallback(async (keepEditUuid) => {
    const treeData = await assemblyService.getTree(id);
    setTree(treeData || []);
    if (keepEditUuid) setEditNode(findNode(treeData || [], keepEditUuid));
  }, [id]);

  const loadPlan = useCallback(async () => {
    const detail = await assemblyService.getPlan(id);
    setPlan(detail);
    setSelectedClasses((detail.classes || []).map((c) => ({ uuid: c.classId, name: c.className })));
    setDirtyClasses(false);
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
        try { setHouseMode((await assemblyService.getConfig())?.mode === 'house'); } catch { /* default template */ }
        const detail = await loadPlan();
        await refreshTree();
        setSpecials((await assemblyService.getSpecials(id)) || []);
        const classes = await classService.getClasses({ academic_year_id: detail.academicYearId });
        setClassOptions(Array.isArray(classes) ? classes : classes?.classes || []);
      } catch (err) {
        setError(err.response?.data?.error?.description || 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadPlan, refreshTree]);

  const wrap = async (fn, keepEditUuid) => {
    setError('');
    try { await fn(); await refreshTree(keepEditUuid); }
    catch (err) { setError(err.response?.data?.error?.description || 'Action failed'); }
  };

  const toggleDay = (value) => {
    if (!canManage || !plan) return;
    const next = plan.days.includes(value) ? plan.days.filter((d) => d !== value) : [...plan.days, value];
    if (next.length === 0) { setError('A plan must keep at least one assembly weekday'); return; }
    setError('');
    assemblyService.setPlanDays(id, next).then(setPlan)
      .catch((err) => setError(err.response?.data?.error?.description || 'Failed to update weekdays'));
  };

  const saveClasses = async () => {
    setError(''); setMsg('');
    try {
      const updated = await assemblyService.setPlanClasses(id, selectedClasses.map((c) => c.uuid));
      setPlan(updated); setDirtyClasses(false); setMsg('Audience saved');
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save audience'); }
  };

  const publish = async () => {
    setError(''); setMsg('');
    try { setPlan(await assemblyService.publishPlan(id)); setMsg('Plan published'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to publish'); }
  };

  const submitAdd = () => {
    const title = (addDialog.title || '').trim();
    if (!title) return;
    const parentId = addDialog.parentId || undefined;
    setAddDialog(null);
    wrap(() => assemblyService.createNode(id, { parentId, title }));
  };

  const submitSpecial = async () => {
    const { specialDate, title, source } = specialDialog;
    if (!specialDate || !title.trim()) { setError('Date and title are required'); return; }
    setError('');
    try {
      const created = await assemblyService.createSpecial(id, { specialDate, title: title.trim(), source });
      setSpecialDialog(null);
      navigate(`/assembly/specials/${created.uuid}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to create special assembly');
    }
  };

  const doPreview = async () => {
    if (!previewDate) return;
    setPreviewErr(''); setPreview(null);
    try { setPreview(await assemblyService.resolve(id, previewDate)); }
    catch (err) { setPreviewErr(err.response?.data?.error?.description || 'Failed to resolve'); }
  };

  const move = (node, dir) => {
    const sibs = siblingsOf(tree, node);
    const i = sibs.findIndex((s) => s.uuid === node.uuid);
    const j = i + dir;
    if (j < 0 || j >= sibs.length) return;
    const order = sibs.map((s) => s.uuid);
    [order[i], order[j]] = [order[j], order[i]];
    wrap(() => assemblyService.reorderNodes(id, node.parentId || null, order));
  };

  const del = async () => {
    const node = deleteDialog.node;
    setDeleteDialog({ open: false, node: null });
    await wrap(() => assemblyService.deleteNode(node.uuid));
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  if (!plan) return <Alert severity="error">{error || 'Plan not found'}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <IconButton onClick={() => navigate('/assembly')}><BackIcon /></IconButton>
        <Typography variant="h4" sx={{ flex: 1 }}>{plan.name}</Typography>
        <Chip label={plan.publishStatus === 'published' ? 'Published' : plan.publishStatus === 'archived' ? 'Archived' : 'Draft'}
          color={plan.publishStatus === 'published' ? 'success' : 'default'}
          variant={plan.publishStatus === 'published' ? 'filled' : 'outlined'} />
        {canManage && plan.publishStatus !== 'published' &&
          <Button variant="contained" startIcon={<PublishIcon />} onClick={publish}>Publish</Button>}
      </Box>
      {plan.scopeLabel && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{plan.scopeLabel}</Typography>}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Assembly weekdays</Typography>
          <Typography variant="caption" color="text.secondary">The days this plan holds assembly — the ceiling for every node's days.</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {weekdays.map((w) => (
              <Chip key={w.value} label={w.label} size="small"
                color={plan.days.includes(w.value) ? 'primary' : 'default'}
                variant={plan.days.includes(w.value) ? 'filled' : 'outlined'}
                onClick={() => toggleDay(w.value)} clickable={canManage} />
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Audience (classes)</Typography>
          <Typography variant="caption" color="text.secondary">Classes attending this assembly. A class can belong to only one plan per year.</Typography>
          <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mt: 1 }}>
            <Autocomplete
              multiple size="small" sx={{ flex: 1 }} disabled={!canManage}
              options={classOptions}
              getOptionLabel={(o) => o.name || ''}
              isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
              value={selectedClasses}
              onChange={(_e, val) => { setSelectedClasses(val); setDirtyClasses(true); }}
              renderInput={(params) => <TextField {...params} placeholder="Select classes" />}
            />
            {canManage && <Button variant="outlined" startIcon={<SaveIcon />} onClick={saveClasses} disabled={!dirtyClasses}>Save</Button>}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Assembly structure</Typography>
            {canManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setAddDialog({ parentId: null, title: '' })}>Add block</Button>}
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {tree.length === 0
            ? <Typography variant="body2" color="text.secondary">No blocks yet. Add a block (e.g. Opening, Presentation, Closing) to start the running order.</Typography>
            : <AssemblyTree
                nodes={tree} canManage={canManage}
                onAddChild={(n) => setAddDialog({ parentId: n.uuid, title: '' })}
                onEdit={(n) => setEditNode(n)}
                onMove={move}
                onDelete={(n) => setDeleteDialog({ open: true, node: n })}
              />}
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Box>
              <Typography variant="subtitle2">Special assemblies</Typography>
              <Typography variant="caption" color="text.secondary">Date-specific assemblies that replace this plan for the day.</Typography>
            </Box>
            {canManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setSpecialDialog({ specialDate: '', title: '', source: 'cloned' })}>Add special</Button>}
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {specials.length === 0
            ? <Typography variant="body2" color="text.secondary">None yet.</Typography>
            : (
              <List dense disablePadding>
                {specials.map((s) => (
                  <ListItemButton key={s.uuid} onClick={() => navigate(`/assembly/specials/${s.uuid}`)}>
                    <ListItemText primary={`${s.specialDate} — ${s.title}`} />
                    <Chip size="small" label={s.publishStatus === 'published' ? 'Published' : 'Draft'}
                      color={s.publishStatus === 'published' ? 'success' : 'default'}
                      variant={s.publishStatus === 'published' ? 'filled' : 'outlined'} />
                  </ListItemButton>
                ))}
              </List>
            )}
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Preview a date</Typography>
          <Typography variant="caption" color="text.secondary">See exactly what assembly resolves for a date (a published special overrides the template).</Typography>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
            <TextField type="date" size="small" label="Date" InputLabelProps={{ shrink: true }}
              value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} />
            <Button variant="outlined" onClick={doPreview} disabled={!previewDate}>Preview</Button>
          </Stack>
          {previewErr && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setPreviewErr('')}>{previewErr}</Alert>}
          {preview && (
            <Box sx={{ mt: 2 }}>
              {!preview.held ? (
                <Alert severity="info">No assembly is held on this date ({preview.weekday}).</Alert>
              ) : (
                <>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    <Chip size="small" color={preview.source === 'special' ? 'secondary' : 'default'}
                      label={preview.source === 'special' ? `Special: ${preview.title || ''}` : 'Regular template'} />
                    {(preview.themes || []).map((t) => <Chip key={t.uuid} size="small" variant="outlined" label={`Theme: ${t.title}`} />)}
                  </Stack>
                  {preview.nodes?.length ? <ResolvedNodes nodes={preview.nodes} /> : <Typography variant="body2" color="text.secondary">No items resolve for this day.</Typography>}
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(specialDialog)} onClose={() => setSpecialDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>Add special assembly</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField type="date" size="small" label="Date" InputLabelProps={{ shrink: true }}
              value={specialDialog?.specialDate || ''} onChange={(e) => setSpecialDialog({ ...specialDialog, specialDate: e.target.value })} />
            <TextField size="small" label="Title" placeholder="e.g. Independence Day"
              value={specialDialog?.title || ''} onChange={(e) => setSpecialDialog({ ...specialDialog, title: e.target.value })} />
            <TextField select size="small" label="Start from" value={specialDialog?.source || 'cloned'}
              onChange={(e) => setSpecialDialog({ ...specialDialog, source: e.target.value })}>
              <MenuItem value="cloned">Clone that day's template</MenuItem>
              <MenuItem value="blank">Blank</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSpecialDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitSpecial}>Create &amp; edit</Button>
        </DialogActions>
      </Dialog>

      <NodeEditorDrawer
        open={Boolean(editNode)} node={editNode} onClose={() => setEditNode(null)}
        onSaved={() => refreshTree(editNode?.uuid)}
        weekdays={weekdays} roles={roles} targetTypes={targetTypes}
        parentEffectiveDays={editNode ? ceilingMap[editNode.uuid] : []}
        classOptions={classOptions} academicYearId={plan.academicYearId}
        houseMode={houseMode}
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
        open={deleteDialog.open}
        title="Delete node"
        message={`Delete "${deleteDialog.node?.title || ''}" and all its child nodes? This cannot be undone.`}
        onConfirm={del}
        onCancel={() => setDeleteDialog({ open: false, node: null })}
      />
    </Box>
  );
}
