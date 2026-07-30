import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Chip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { syllabusService } from '../../../services/syllabusService';
import { useCan } from '../../../permissions/can';

export default function SubjectList() {
  const can = useCan();
  const canManage = can('syllabus.manage');

  const [grades, setGrades] = useState([]);
  const [filterGrade, setFilterGrade] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState({ open: false, item: null, grade: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try { setGrades((await syllabusService.getGrades()) || []); } catch { /* noop */ }
    })();
  }, []);

  const load = async (grade = filterGrade) => {
    setLoading(true); setError('');
    try {
      setSubjects((await syllabusService.getSubjects(grade ? { grade } : {})) || []);
    } catch {
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterGrade]);

  const openAdd = () => setDialog({ open: true, item: null, grade: filterGrade || '', name: '', description: '' });
  const openEdit = (item) => setDialog({ open: true, item, grade: item.grade || '', name: item.name || '', description: item.description || '' });

  const save = async () => {
    if (!dialog.name.trim()) { setError('Subject name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { grade: dialog.grade || null, name: dialog.name.trim(), description: dialog.description.trim() || undefined };
      if (dialog.item) await syllabusService.updateSubject(dialog.item.uuid, payload);
      else await syllabusService.createSubject(payload);
      setDialog({ open: false, item: null, grade: '', name: '', description: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await syllabusService.deleteSubject(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete subject');
      setDeleteDialog({ open: false, item: null });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      field: 'grade', headerName: 'Grade', width: 90,
      renderCell: (p) => (p.value ? <Chip size="small" label={p.value} /> : <Chip size="small" variant="outlined" label="—" />),
    },
    { field: 'name', headerName: 'Subject', flex: 1, minWidth: 180 },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 200, valueFormatter: (v) => v || '-' },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (params) => (
        <Box>
          {canManage && <IconButton size="small" title="Edit" onClick={() => openEdit(params.row)}><EditIcon fontSize="small" /></IconButton>}
          {canManage && <IconButton size="small" color="error" title="Delete" onClick={() => setDeleteDialog({ open: true, item: params.row })}><DeleteIcon fontSize="small" /></IconButton>}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4">Syllabus Subjects</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField select size="small" label="Grade" value={filterGrade} sx={{ minWidth: 160 }}
            onChange={(e) => setFilterGrade(e.target.value)}>
            <MenuItem value="">All grades</MenuItem>
            {grades.map((g) => <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>)}
          </TextField>
          {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Subject</Button>}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <ResponsiveDataGrid
        rows={subjects}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
        disableRowSelectionOnClick
        sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
      />

      <Dialog open={dialog.open} onClose={() => setDialog({ ...dialog, open: false })} fullWidth maxWidth="sm">
        <DialogTitle>{dialog.item ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Grade" value={dialog.grade} sx={{ mt: 1, mb: 2 }} size="small"
            onChange={(e) => setDialog({ ...dialog, grade: e.target.value })}
            helperText="Subjects are scoped per grade">
            <MenuItem value="">No grade (shared)</MenuItem>
            {grades.map((g) => <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>)}
          </TextField>
          <TextField autoFocus fullWidth label="Subject Name" value={dialog.name} sx={{ mb: 2 }}
            onChange={(e) => setDialog({ ...dialog, name: e.target.value })} size="small" />
          <TextField fullWidth label="Description (optional)" value={dialog.description}
            onChange={(e) => setDialog({ ...dialog, description: e.target.value })} size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ ...dialog, open: false })}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Subject"
        message={`Delete subject "${deleteDialog.item?.name || ''}"? A subject used by a plan cannot be deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
