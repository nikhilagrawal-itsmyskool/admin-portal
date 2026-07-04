import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton, Alert, Chip, Grid, MenuItem, TextField,
  Autocomplete, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { transportService } from '../../../services/transportService';
import { studentService } from '../../../services/studentService';
import { classService } from '../../../services/classService';
import { academicCalendarService } from '../../../services/academicCalendarService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useCan } from '../../../permissions/can';

export default function AssignmentList() {
  const can = useCan();
  const canManage = can('transport.manage');

  const [assignments, setAssignments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // student picker — server-side async search (name + optional class filter)
  const [studentOptions, setStudentOptions] = useState([]);
  const [studentInput, setStudentInput] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [pickClass, setPickClass] = useState(null); // null = All classes

  const searchSeq = useRef(0);
  const searchTimer = useRef(null);
  const searchAbort = useRef(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // filters
  const [direction, setDirection] = useState('');
  const [routeFilter, setRouteFilter] = useState('');

  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({ academicYearId: '', student: null, routeId: '', stopId: '' });
  const [routeStops, setRouteStops] = useState([]);

  const loadAssignments = async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (direction) params.direction = direction;
      if (routeFilter) params.routeId = routeFilter;
      const data = await transportService.getAssignments(params);
      setAssignments(data || []);
    } catch {
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  // Server-side student search. A monotonic sequence + AbortController guard
  // ensure a slow response for an earlier keystroke can never overwrite a newer
  // one (the "type Arjun → nothing, edit → appears" race).
  const runStudentSearch = useCallback((name, classId) => {
    const seq = ++searchSeq.current;
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setStudentLoading(true);

    const params = {};
    if (name && name.trim()) params.name = name.trim();
    if (classId) params.classId = classId;

    studentService
      .searchStudents(params, controller.signal)
      .then((data) => {
        if (seq !== searchSeq.current) return; // superseded by a newer search
        setStudentOptions(Array.isArray(data) ? data : data?.students || []);
      })
      .catch(() => {
        if (controller.signal.aborted || seq !== searchSeq.current) return;
        setStudentOptions([]);
      })
      .finally(() => {
        if (seq === searchSeq.current) setStudentLoading(false);
      });
  }, []);

  const debouncedStudentSearch = useCallback((name, classId) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runStudentSearch(name, classId), 250);
  }, [runStudentSearch]);

  useEffect(() => {
    (async () => {
      try {
        const [rts, yrs, cls] = await Promise.all([
          transportService.getRoutes(),
          academicCalendarService.getAcademicYears(),
          classService.getClasses(),
        ]);
        setRoutes(rts || []);
        setYears(Array.isArray(yrs) ? yrs : yrs?.academicYears || []);
        setClasses(Array.isArray(cls) ? cls : cls?.classes || []);
        try {
          const cur = await academicCalendarService.getCurrentAcademicYear();
          if (cur?.uuid) setAddForm((f) => ({ ...f, academicYearId: cur.uuid }));
        } catch { /* no current year */ }
      } catch {
        setError('Failed to load routes / classes');
      }
    })();
    loadAssignments();
  }, []);

  // Populate the (unfiltered) student list when the Assign dialog opens; reset
  // the picker when it closes.
  useEffect(() => {
    if (addOpen) {
      runStudentSearch('', undefined);
    } else {
      setPickClass(null);
      setStudentInput('');
      setStudentOptions([]);
    }
  }, [addOpen, runStudentSearch]);

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchAbort.current?.abort();
  }, []);

  // When a route is picked in the add dialog, load its stops.
  const onPickRoute = async (routeId) => {
    setAddForm((f) => ({ ...f, routeId, stopId: '' }));
    setRouteStops([]);
    if (!routeId) return;
    try {
      const r = await transportService.getRoute(routeId);
      setRouteStops(r.stops || []);
    } catch {
      setError('Failed to load route stops');
    }
  };

  const saveAssignment = async () => {
    if (!addForm.academicYearId || !addForm.student || !addForm.routeId || !addForm.stopId) {
      setError('Select academic year, student, route and stop'); return;
    }
    setSaving(true); setError('');
    try {
      await transportService.createAssignment({
        academicYearId: addForm.academicYearId,
        studentId: addForm.student.uuid,
        routeId: addForm.routeId,
        stopId: addForm.stopId,
      });
      setAddOpen(false);
      setAddForm((f) => ({ ...f, student: null, routeId: '', stopId: '' }));
      setRouteStops([]);
      setSuccess('Student assigned');
      loadAssignments();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to assign student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await transportService.deleteAssignment(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadAssignments();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to remove assignment');
      setDeleteDialog({ open: false, item: null });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'studentName', headerName: 'Student', flex: 1, minWidth: 160, valueFormatter: (v) => v || '-' },
    {
      field: 'direction', headerName: 'Direction', width: 120,
      renderCell: (params) => <Chip size="small" label={params.value === 'morning' ? 'Morning' : 'Evening'}
        color={params.value === 'morning' ? 'warning' : 'info'} variant="outlined" />,
    },
    { field: 'routeName', headerName: 'Route', flex: 1, minWidth: 140, valueFormatter: (v) => v || '-' },
    { field: 'stopName', headerName: 'Stop', flex: 1, minWidth: 140, valueFormatter: (v) => v || '-' },
    {
      field: 'actions', headerName: 'Actions', width: 90, sortable: false,
      renderCell: (params) => canManage && (
        <IconButton size="small" color="error" title="Remove" onClick={() => setDeleteDialog({ open: true, item: params.row })}><DeleteIcon fontSize="small" /></IconButton>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Student Assignments</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>Assign Student</Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField fullWidth select size="small" label="Direction" value={direction} onChange={(e) => setDirection(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="morning">Morning</MenuItem>
                <MenuItem value="evening">Evening</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth select size="small" label="Route" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}>
                <MenuItem value="">All Routes</MenuItem>
                {routes.map((r) => <MenuItem key={r.uuid} value={r.uuid}>{r.name} ({r.direction})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="contained" size="small" onClick={loadAssignments}>Apply</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
        rows={assignments}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
      />

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Student to Route</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Academic Year" value={addForm.academicYearId}
                onChange={(e) => setAddForm({ ...addForm, academicYearId: e.target.value })} size="small">
                {years.map((y) => <MenuItem key={y.uuid} value={y.uuid}>{y.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={classes}
                getOptionLabel={(o) => o?.name || ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={pickClass}
                onChange={(_, v) => { setPickClass(v); runStudentSearch(studentInput, v?.uuid); }}
                renderInput={(params) => <TextField {...params} label="Class (filter)" size="small" placeholder="All classes" />}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={studentOptions}
                loading={studentLoading}
                filterOptions={(x) => x}
                getOptionLabel={(o) => {
                  if (!o?.name) return '';
                  const cls = o.className || o.class_name;
                  return cls ? `${o.name} — ${cls}` : o.name;
                }}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={addForm.student}
                onChange={(_, v) => setAddForm({ ...addForm, student: v })}
                inputValue={studentInput}
                onInputChange={(_, v, reason) => {
                  setStudentInput(v);
                  if (reason === 'input') debouncedStudentSearch(v, pickClass?.uuid);
                }}
                noOptionsText={studentLoading ? 'Searching…' : 'No students'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Student"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {studentLoading ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Route" value={addForm.routeId} onChange={(e) => onPickRoute(e.target.value)} size="small">
                <MenuItem value="">Select route</MenuItem>
                {routes.map((r) => <MenuItem key={r.uuid} value={r.uuid}>{r.name} ({r.direction})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Stop" value={addForm.stopId} onChange={(e) => setAddForm({ ...addForm, stopId: e.target.value })}
                size="small" disabled={!addForm.routeId} helperText={addForm.routeId && routeStops.length === 0 ? 'This route has no stops yet' : ' '}>
                {routeStops.map((s) => <MenuItem key={s.stopId} value={s.stopId}>{s.sequence}. {s.name}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveAssignment} disabled={saving}>{saving ? 'Saving...' : 'Assign'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Remove Assignment"
        message={`Remove ${deleteDialog.item?.studentName || 'this student'} from the ${deleteDialog.item?.direction || ''} route?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
