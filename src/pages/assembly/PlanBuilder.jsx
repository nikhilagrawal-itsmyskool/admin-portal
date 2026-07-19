import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Chip, Stack, Alert, IconButton,
  Autocomplete, TextField, Divider, CircularProgress, Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Publish as PublishIcon, Save as SaveIcon,
} from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';
import { classService } from '../../services/classService';
import { useCan } from '../../permissions/can';

// Read-only render of the authored tree (interactive editing arrives in Phase B).
function TreeView({ nodes, depth = 0 }) {
  if (!nodes?.length) return null;
  return (
    <Box sx={{ pl: depth ? 3 : 0 }}>
      {nodes.map((n) => (
        <Box key={n.uuid} sx={{ py: 0.75, borderLeft: depth ? '2px solid' : 'none', borderColor: 'divider', pl: depth ? 2 : 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" fontWeight={600}>{n.title}</Typography>
            {(n.days || []).map((d) => <Chip key={d} label={d} size="small" variant="outlined" sx={{ height: 18, fontSize: 11 }} />)}
            {(n.responsible || []).map((r) => (
              <Chip key={r.uuid} size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: 11 }}
                label={`${r.role ? r.role + ': ' : ''}${r.targetName || r.targetText || r.targetType}`} />
            ))}
            {n.resources?.length ? <Chip label={`${n.resources.length} link${n.resources.length > 1 ? 's' : ''}`} size="small" sx={{ height: 18, fontSize: 11 }} /> : null}
          </Stack>
          {n.description && <Typography variant="caption" color="text.secondary">{n.description}</Typography>}
          <TreeView nodes={n.children} depth={depth + 1} />
        </Box>
      ))}
    </Box>
  );
}

export default function PlanBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('assembly.manage');

  const [plan, setPlan] = useState(null);
  const [tree, setTree] = useState([]);
  const [weekdays, setWeekdays] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [dirtyClasses, setDirtyClasses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadPlan = useCallback(async () => {
    const [detail, treeData] = await Promise.all([
      assemblyService.getPlan(id),
      assemblyService.getTree(id),
    ]);
    setPlan(detail);
    setTree(treeData || []);
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
        const detail = await loadPlan();
        const classes = await classService.getClasses({ academic_year_id: detail.academicYearId });
        setClassOptions(Array.isArray(classes) ? classes : classes?.classes || []);
      } catch (err) {
        setError(err.response?.data?.error?.description || 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadPlan]);

  const toggleDay = async (value) => {
    if (!canManage || !plan) return;
    const next = plan.days.includes(value) ? plan.days.filter((d) => d !== value) : [...plan.days, value];
    if (next.length === 0) { setError('A plan must keep at least one assembly weekday'); return; }
    setError('');
    try {
      const updated = await assemblyService.setPlanDays(id, next);
      setPlan(updated);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to update weekdays');
    }
  };

  const saveClasses = async () => {
    setError(''); setMsg('');
    try {
      const updated = await assemblyService.setPlanClasses(id, selectedClasses.map((c) => c.uuid));
      setPlan(updated);
      setDirtyClasses(false);
      setMsg('Audience saved');
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save audience');
    }
  };

  const publish = async () => {
    setError(''); setMsg('');
    try { setPlan(await assemblyService.publishPlan(id)); setMsg('Plan published'); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to publish'); }
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
            <Tooltip title="Interactive tree editing (add / reorder / responsible / resources) is coming next">
              <Chip label="read-only preview" size="small" variant="outlined" />
            </Tooltip>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          {tree.length === 0
            ? <Typography variant="body2" color="text.secondary">No blocks yet. The tree editor will let you build the running order (blocks → segments → …).</Typography>
            : <TreeView nodes={tree} />}
        </CardContent>
      </Card>
    </Box>
  );
}
