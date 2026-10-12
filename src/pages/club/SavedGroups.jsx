import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, Button, Card, Table, TableHead, TableRow, TableCell, TableBody,
  Alert, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { clubService } from '../../services/clubService';
import { useCan } from '../../permissions/can';
import { GroupBuilderDialog } from './PlanningBoard';

// School-level reusable groups, maintained live. Editing a saved group updates every plan that
// references it. Read-only inside a plan (clone there for a one-off).
export default function SavedGroups() {
  const can = useCan();
  const canManage = can('club.plan.manage');
  const [groups, setGroups] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [dialog, setDialog] = useState(null); // { mode:'new' } | { mode:'edit', group:{uuid,name,members} }

  const load = useCallback(async () => {
    setErr('');
    try { setGroups(await clubService.listSavedGroups()); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load'); setGroups([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openEdit = async (g) => {
    try {
      const full = await clubService.getSavedGroup(g.uuid);
      setDialog({ mode: 'edit', group: { uuid: g.uuid, name: full.name, members: (full.members || []).map((m) => ({ studentId: m.studentId, name: m.studentNameSnapshot })) } });
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to open group'); }
  };

  const save = async (name, members) => {
    setErr(''); setMsg('');
    try {
      if (dialog.mode === 'edit') await clubService.updateSavedGroup(dialog.group.uuid, { name, members });
      else await clubService.createSavedGroup({ name, members });
      setDialog(null); setMsg('Saved.'); load();
    } catch (e) { setErr(e.response?.data?.error?.description || 'Save failed'); }
  };

  const del = async (id) => { try { await clubService.deleteSavedGroup(id); load(); } catch (e) { setErr(e.response?.data?.error?.description || 'Delete failed'); } };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Saved Groups</Typography>
          <Typography variant="body2" color="text.secondary">Reusable student groups. Live — edits here update every plan that uses the group.</Typography>
        </Box>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ mode: 'new' })}>New saved group</Button>}
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {groups === null ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : (
        <Card variant="outlined"><Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Students</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.uuid} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{g.name}</TableCell>
                  <TableCell>{g.memberCount ?? g.strengthSnapshot ?? 0}</TableCell>
                  <TableCell align="right">
                    {canManage && <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(g)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                    {canManage && <Tooltip title="Delete"><IconButton size="small" onClick={() => del(g.uuid)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                  </TableCell>
                </TableRow>
              ))}
              {!groups.length && <TableRow><TableCell colSpan={3}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No saved groups yet. Create one here, or promote a custom group from a plan.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box></Card>
      )}

      {dialog && (
        <GroupBuilderDialog
          title={dialog.mode === 'edit' ? 'Edit saved group' : 'New saved group'}
          submitLabel={dialog.mode === 'edit' ? 'Save' : 'Create'}
          initialName={dialog.group?.name || ''}
          initialMembers={dialog.group?.members || []}
          onClose={() => setDialog(null)}
          onSubmit={save}
        />
      )}
    </Box>
  );
}
