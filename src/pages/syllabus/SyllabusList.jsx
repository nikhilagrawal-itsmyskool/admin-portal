import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, IconButton,
  Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { syllabusService } from '../../services/syllabusService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';

export default function SyllabusList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('syllabus.manage');

  const [years, setYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [streams, setStreams] = useState([]);

  const [filter, setFilter] = useState({ academicYearId: '', grade: '', streamCode: '', subjectId: '' });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialog, setDialog] = useState(null); // { grade, subjectId, layout, book, note }
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [yrs, grds, subs, lookups, strms] = await Promise.all([
          academicCalendarService.getAcademicYears(),
          syllabusService.getGrades(),
          syllabusService.getSubjects(),
          syllabusService.getLookups(),
          syllabusService.getStreams(),
        ]);
        const yearList = Array.isArray(yrs) ? yrs : yrs?.academicYears || [];
        setYears(yearList);
        setGrades(grds || []);
        setSubjects(subs || []);
        setLayouts(lookups?.layouts || []);
        setStreams(strms || []);
        const cur = yearList.find((y) => y.isCurrent) || yearList[0];
        if (cur?.uuid) setFilter((f) => ({ ...f, academicYearId: cur.uuid }));
      } catch {
        setError('Failed to load syllabus filters');
      }
    })();
  }, []);

  const load = async (f = filter) => {
    if (!f.academicYearId) return;
    setLoading(true); setError('');
    try {
      const params = { academicYearId: f.academicYearId };
      if (f.grade) params.grade = f.grade;
      if (f.streamCode) params.streamCode = f.streamCode;
      if (f.subjectId) params.subjectId = f.subjectId;
      setPlans((await syllabusService.getSyllabi(params)) || []);
    } catch {
      setError('Failed to load syllabus plans');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (filter.academicYearId) load(); /* eslint-disable-next-line */ }, [filter.academicYearId, filter.grade, filter.streamCode, filter.subjectId]);

  const hasStreams = streams.length > 0;
  const streamName = (code) => streams.find((s) => (s.code || '').toLowerCase() === (code || '').toLowerCase())?.name || code;

  const openCreate = () => setDialog({ grade: '', streamCode: '', subjectId: '', layout: 'junior', book: '', note: '' });

  const create = async () => {
    if (!dialog.grade || !dialog.subjectId) { setError('Grade and subject are required'); return; }
    setSaving(true); setError('');
    try {
      const created = await syllabusService.createSyllabus({
        academicYearId: filter.academicYearId,
        grade: dialog.grade,
        streamCode: dialog.streamCode || undefined,
        subjectId: dialog.subjectId,
        layout: dialog.layout,
        book: dialog.book.trim() || undefined,
        note: dialog.note.trim() || undefined,
      });
      setDialog(null);
      navigate(`/syllabus/plans/${created.uuid}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await syllabusService.deleteSyllabus(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete plan');
      setDeleteDialog({ open: false, item: null });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'grade', headerName: 'Grade', width: 90 },
    ...(hasStreams ? [{
      field: 'streamCode', headerName: 'Stream', width: 120, sortable: false,
      renderCell: (p) => (p.value
        ? <Chip size="small" color="info" variant="outlined" label={streamName(p.value)} />
        : <Chip size="small" variant="outlined" label="Common" />),
    }] : []),
    { field: 'subjectName', headerName: 'Subject', flex: 1, minWidth: 160, valueFormatter: (v) => v || '-' },
    {
      field: 'layout', headerName: 'Layout', width: 110,
      renderCell: (p) => <Chip size="small" variant="outlined" label={p.value === 'senior' ? 'Senior' : 'Junior'} />,
    },
    { field: 'book', headerName: 'Book', flex: 1, minWidth: 120, valueFormatter: (v) => v || '-' },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" title="Open / build" onClick={() => navigate(`/syllabus/plans/${params.row.uuid}`)}><EditIcon fontSize="small" /></IconButton>
          {canManage && <IconButton size="small" color="error" title="Delete" onClick={() => setDeleteDialog({ open: true, item: params.row })}><DeleteIcon fontSize="small" /></IconButton>}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Syllabus Plans</Typography>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Plan</Button>}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={hasStreams ? 3 : 4}>
              <TextField fullWidth select size="small" label="Academic Year" value={filter.academicYearId}
                onChange={(e) => setFilter({ ...filter, academicYearId: e.target.value })}>
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}{y.isCurrent ? ' (current)' : ''}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={hasStreams ? 3 : 4}>
              <TextField fullWidth select size="small" label="Grade" value={filter.grade}
                onChange={(e) => setFilter({ ...filter, grade: e.target.value })}>
                <MenuItem value="">All grades</MenuItem>
                {grades.map((g) => <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>)}
              </TextField>
            </Grid>
            {hasStreams && (
              <Grid item xs={12} md={3}>
                <TextField fullWidth select size="small" label="Stream" value={filter.streamCode}
                  onChange={(e) => setFilter({ ...filter, streamCode: e.target.value })}>
                  <MenuItem value="">All streams</MenuItem>
                  <MenuItem value="common">Common (no stream)</MenuItem>
                  {streams.map((s) => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} md={hasStreams ? 3 : 4}>
              <TextField fullWidth select size="small" label="Subject" value={filter.subjectId}
                onChange={(e) => setFilter({ ...filter, subjectId: e.target.value })}>
                <MenuItem value="">All subjects</MenuItem>
                {subjects.map((s) => <MenuItem key={s.uuid} value={s.uuid}>{s.name}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
        rows={plans}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        disableRowSelectionOnClick
        sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
      />

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>Add Syllabus Plan</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select size="small" label="Grade" value={dialog?.grade || ''}
                onChange={(e) => setDialog({ ...dialog, grade: e.target.value })}>
                {grades.map((g) => <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>)}
              </TextField>
            </Grid>
            {hasStreams && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select size="small" label="Stream" value={dialog?.streamCode || ''}
                  onChange={(e) => setDialog({ ...dialog, streamCode: e.target.value })}
                  helperText="Leave as Common if the subject applies to every stream">
                  <MenuItem value="">Common (all streams)</MenuItem>
                  {streams.map((s) => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select size="small" label="Subject" value={dialog?.subjectId || ''}
                onChange={(e) => setDialog({ ...dialog, subjectId: e.target.value })}>
                {subjects.map((s) => <MenuItem key={s.uuid} value={s.uuid}>{s.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select size="small" label="Layout" value={dialog?.layout || 'junior'}
                onChange={(e) => setDialog({ ...dialog, layout: e.target.value })}>
                {(layouts.length ? layouts : [{ value: 'junior', label: 'Junior' }, { value: 'senior', label: 'Senior' }])
                  .map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Book (optional)" value={dialog?.book || ''}
                onChange={(e) => setDialog({ ...dialog, book: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" label="Footer note (optional)" value={dialog?.note || ''}
                placeholder="e.g. Current affairs and assembly activities are also part of the syllabus."
                onChange={(e) => setDialog({ ...dialog, note: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create & Build'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Syllabus Plan"
        message={`Delete the ${deleteDialog.item?.grade || ''} ${deleteDialog.item?.subjectName || ''} plan and all its entries? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
