import React, { useState } from 'react';
import {
  Card, CardContent, Box, Stack, Typography, TextField, Button, IconButton, Alert, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { activityCalendarService } from '../../services/activityCalendarService';
import { typeMeta } from './calendarUtils';

// Manage the calendar's columns (entry types). Reorder/rename/add — Excel headers are
// matched to these by name on import. Deleting a type in use is blocked by the backend.
export default function ColumnsTab({ types, canManage, onChanged }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const run = async (fn) => {
    setBusy(true); setErr('');
    try { await fn(); await onChanged(); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        These are the calendar's columns. Rename or add your own — a new column becomes an entry type any day can carry. Excel headers are matched to these by name on import.
      </Alert>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      <Card>
        <CardContent>
          <Stack spacing={1}>
            {types.map((t) => {
              const meta = typeMeta(t.code);
              return (
                <Box key={t.uuid} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: meta.color }} />
                  {editId === t.uuid ? (
                    <>
                      <TextField size="small" value={editName} onChange={(e) => setEditName(e.target.value)} sx={{ flex: 1 }} autoFocus />
                      <IconButton size="small" color="primary" disabled={busy || !editName.trim()} onClick={() => run(async () => { await activityCalendarService.updateType(t.uuid, { name: editName.trim() }); setEditId(null); })}><CheckIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => setEditId(null)}><CloseIcon fontSize="small" /></IconButton>
                    </>
                  ) : (
                    <>
                      <Typography sx={{ fontWeight: 600, flex: 1 }}>{t.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'ui-monospace, monospace' }}>{t.code}</Typography>
                      {canManage && (
                        <>
                          <Tooltip title="Rename"><IconButton size="small" onClick={() => { setEditId(t.uuid); setEditName(t.name); }}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                          <Tooltip title="Delete"><IconButton size="small" onClick={() => run(() => activityCalendarService.deleteType(t.uuid))}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                        </>
                      )}
                    </>
                  )}
                </Box>
              );
            })}
          </Stack>

          {canManage && (adding ? (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <TextField size="small" placeholder="Column name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus sx={{ flex: 1 }} />
              <Button variant="contained" disabled={busy || !newName.trim()} onClick={() => run(async () => { await activityCalendarService.createType({ name: newName.trim() }); setNewName(''); setAdding(false); })}>Add</Button>
              <Button onClick={() => { setAdding(false); setNewName(''); }}>Cancel</Button>
            </Stack>
          ) : (
            <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setAdding(true)}>Add a column</Button>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
