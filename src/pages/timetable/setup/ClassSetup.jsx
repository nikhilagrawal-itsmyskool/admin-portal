import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Tabs, Tab, Stack, Alert, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, Chip, Divider, CircularProgress,
  MenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Person as PersonIcon } from '@mui/icons-material';
import { timetableService } from '../../../services/timetableService';
import { AcademicYearSelect, ClassSelect } from '../components/Selectors';
import BlockRulesEditor from '../components/BlockRulesEditor';
import TeacherName from '../components/TeacherName';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

function blockSummary(blockRules) {
  if (!blockRules?.blocks?.length) return 'singles';
  return blockRules.blocks.map((b) => `${b.count}×${b.size}`).join(', ');
}

// ---------------------------------------------------------------- Class Teacher
function ClassTeacherTab({ classId, academicYearId }) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  // Subjects this class teacher is assigned to teach this class — the candidates
  // for the first-period pin.
  const [teacherSubjects, setTeacherSubjects] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await timetableService.getClassTeachers({ classId, academicYearId });
      setCurrent((data.classTeachers || [])[0] || null);
    } catch { setError('Failed to load class teacher'); }
    finally { setLoading(false); }
  }, [classId, academicYearId]);

  useEffect(() => { load(); }, [load]);

  // Load the class teacher's assigned subjects (for the first-period dropdown).
  useEffect(() => {
    if (!current?.teacherId) { setTeacherSubjects([]); return; }
    let active = true;
    timetableService.getTeachingAssignments({ classId, academicYearId, teacherId: current.teacherId })
      .then((d) => { if (active) setTeacherSubjects(d.assignments || []); })
      .catch(() => { if (active) setTeacherSubjects([]); });
    return () => { active = false; };
  }, [current?.teacherId, classId, academicYearId]);

  const onSelect = async (emp) => {
    setError('');
    try {
      if (current) await timetableService.updateClassTeacher(current.uuid, { teacherId: emp.uuid });
      else await timetableService.createClassTeacher({ academicYearId, classId, teacherId: emp.uuid });
      load();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to set class teacher'); }
  };
  const remove = async () => {
    try { await timetableService.deleteClassTeacher(current.uuid); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to remove'); }
  };
  const setFirstPeriodSubject = async (subjectId) => {
    setError('');
    try {
      await timetableService.updateClassTeacher(current.uuid, { firstPeriodSubjectId: subjectId || null });
      load();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to set first-period subject'); }
  };

  if (loading) return <CircularProgress />;
  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 2 }}>
        The class teacher takes the first period of every day automatically during generation.
      </Typography>
      {current ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip icon={<PersonIcon />} label={<TeacherName id={current.teacherId} />} color="primary" />
            <Button variant="outlined" onClick={() => setPicker(true)}>Change</Button>
            <Button variant="outlined" color="error" onClick={remove}>Remove</Button>
          </Stack>
          <TextField select label="First-period subject" sx={{ maxWidth: 360 }}
            value={current.firstPeriodSubjectId || ''}
            onChange={(e) => setFirstPeriodSubject(e.target.value)}
            helperText="Which of the class teacher's subjects goes in the first period each day.">
            <MenuItem value="">Auto (subject with most periods/week)</MenuItem>
            {teacherSubjects.map((a) => (
              <MenuItem key={a.subjectId} value={a.subjectId}>{a.subjectName || a.subjectId}</MenuItem>
            ))}
          </TextField>
        </Stack>
      ) : (
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setPicker(true)}>Set Class Teacher</Button>
      )}
      <EmployeeSearchDialog open={picker} onClose={() => setPicker(false)} onSelect={onSelect} />
    </Box>
  );
}

// ----------------------------------------------------------------- Subjects tab
function SubjectsTab({ classId, academicYearId, subjects }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState({ open: false, row: null });
  const [del, setDel] = useState({ open: false, row: null });

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await timetableService.getClassSubjects({ classId, academicYearId }); setRows(data.classSubjects || []); }
    catch { setError('Failed to load subjects'); } finally { setLoading(false); }
  }, [classId, academicYearId]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { field: 'subjectName', headerName: 'Subject', flex: 1, minWidth: 180 },
    { field: 'periodsPerWeek', headerName: 'Periods/Week', width: 130 },
    { field: 'blocks', headerName: 'Blocks', width: 160, valueGetter: (value, row) => blockSummary(row.blockRules), sortable: false },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (p) => (
        <Box>
          <IconButton size="small" onClick={() => setDialog({ open: true, row: p.row })}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => setDel({ open: true, row: p.row })}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  const handleDelete = async () => {
    try { await timetableService.deleteClassSubject(del.row.uuid); setDel({ open: false, row: null }); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to delete'); setDel({ open: false, row: null }); }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, row: null })}>Add Subject</Button>
      </Box>
      <DataGrid rows={rows} columns={columns} getRowId={(r) => r.uuid} loading={loading} autoHeight
        pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick
        sx={{ border: 'none' }} />
      {dialog.open && (
        <ClassSubjectDialog classId={classId} academicYearId={academicYearId} subjects={subjects} row={dialog.row}
          onClose={() => setDialog({ open: false, row: null })} onSaved={load} />
      )}
      <ConfirmDialog open={del.open} title="Remove Subject" message={`Remove "${del.row?.subjectName}" from this class?`}
        onConfirm={handleDelete} onCancel={() => setDel({ open: false, row: null })} />
    </Box>
  );
}

function ClassSubjectDialog({ classId, academicYearId, subjects, row, onClose, onSaved }) {
  const isEdit = Boolean(row?.uuid);
  const [subjectId, setSubjectId] = useState(row?.subjectId || '');
  const [periodsPerWeek, setPeriodsPerWeek] = useState(row?.periodsPerWeek || 1);
  const [blockRules, setBlockRules] = useState(row?.blockRules || undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!subjectId) { setError('Pick a subject'); return; }
    const ppw = Number(periodsPerWeek);
    if (!Number.isInteger(ppw) || ppw < 1) { setError('Periods/week must be a positive integer'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) await timetableService.updateClassSubject(row.uuid, { periodsPerWeek: ppw, blockRules });
      else await timetableService.createClassSubject({ academicYearId, classId, subjectId, periodsPerWeek: ppw, blockRules });
      onSaved(); onClose();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Class Subject' : 'Add Class Subject'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
        <Autocomplete sx={{ mt: 1, mb: 2 }} options={subjects} disabled={isEdit}
          getOptionLabel={(o) => o.name || ''} value={subjects.find((s) => s.uuid === subjectId) || null}
          onChange={(e, v) => setSubjectId(v?.uuid || '')}
          renderInput={(params) => <TextField {...params} label="Subject" />} />
        <TextField fullWidth type="number" label="Periods per week" value={periodsPerWeek}
          onChange={(e) => setPeriodsPerWeek(e.target.value)} sx={{ mb: 2 }} />
        <BlockRulesEditor value={blockRules} periodsPerWeek={periodsPerWeek} onChange={setBlockRules} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------- Teachers tab
function TeachersTab({ classId, academicYearId, subjects }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState({ open: false, row: null });
  const [del, setDel] = useState({ open: false, row: null });

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await timetableService.getTeachingAssignments({ classId, academicYearId }); setRows(data.assignments || []); }
    catch { setError('Failed to load assignments'); } finally { setLoading(false); }
  }, [classId, academicYearId]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { field: 'subjectName', headerName: 'Subject', flex: 1, minWidth: 160 },
    { field: 'teacher', headerName: 'Teacher', flex: 1, minWidth: 160, sortable: false, renderCell: (p) => <TeacherName id={p.row.teacherId} /> },
    { field: 'periodShare', headerName: 'Period Share', width: 130, valueGetter: (value, row) => row.periodShare ?? 'all' },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (p) => (
        <Box>
          <IconButton size="small" onClick={() => setDialog({ open: true, row: p.row })}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => setDel({ open: true, row: p.row })}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  const handleDelete = async () => {
    try { await timetableService.deleteTeachingAssignment(del.row.uuid); setDel({ open: false, row: null }); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to delete'); setDel({ open: false, row: null }); }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, row: null })}>Add Assignment</Button>
      </Box>
      <DataGrid rows={rows} columns={columns} getRowId={(r) => r.uuid} loading={loading} autoHeight
        pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick
        sx={{ border: 'none' }} />
      {dialog.open && (
        <AssignmentDialog classId={classId} academicYearId={academicYearId} subjects={subjects} row={dialog.row}
          onClose={() => setDialog({ open: false, row: null })} onSaved={load} />
      )}
      <ConfirmDialog open={del.open} title="Remove Assignment" message="Remove this teaching assignment?"
        onConfirm={handleDelete} onCancel={() => setDel({ open: false, row: null })} />
    </Box>
  );
}

function AssignmentDialog({ classId, academicYearId, subjects, row, onClose, onSaved }) {
  const isEdit = Boolean(row?.uuid);
  const [subjectId, setSubjectId] = useState(row?.subjectId || '');
  const [teacher, setTeacher] = useState(row ? { uuid: row.teacherId } : null);
  const [periodShare, setPeriodShare] = useState(row?.periodShare ?? '');
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!subjectId) { setError('Pick a subject'); return; }
    if (!teacher?.uuid) { setError('Pick a teacher'); return; }
    const share = periodShare === '' ? undefined : Number(periodShare);
    setSaving(true); setError('');
    try {
      if (isEdit) await timetableService.updateTeachingAssignment(row.uuid, { periodShare: share ?? null });
      else await timetableService.createTeachingAssignment({ academicYearId, classId, subjectId, teacherId: teacher.uuid, periodShare: share });
      onSaved(); onClose();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Assignment' : 'Add Assignment'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
        <Autocomplete sx={{ mt: 1, mb: 2 }} options={subjects} disabled={isEdit}
          getOptionLabel={(o) => o.name || ''} value={subjects.find((s) => s.uuid === subjectId) || null}
          onChange={(e, v) => setSubjectId(v?.uuid || '')}
          renderInput={(params) => <TextField {...params} label="Subject" />} />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2">Teacher:</Typography>
          <Chip label={teacher?.name || (teacher?.uuid ? <TeacherName id={teacher.uuid} /> : 'none')} />
          <Button size="small" variant="outlined" disabled={isEdit} onClick={() => setPicker(true)}>
            {teacher ? 'Change' : 'Pick'}
          </Button>
        </Stack>
        <TextField fullWidth type="number" label="Period share (blank = all periods)" value={periodShare}
          onChange={(e) => setPeriodShare(e.target.value)} helperText="Set only when two teachers split this subject" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </DialogActions>
      <EmployeeSearchDialog open={picker} onClose={() => setPicker(false)} onSelect={(emp) => setTeacher(emp)} />
    </Dialog>
  );
}

// ---------------------------------------------------------------- Electives tab
function ElectivesTab({ classId, academicYearId, subjects }) {
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bandDialog, setBandDialog] = useState(false);
  const [delBand, setDelBand] = useState({ open: false, band: null });
  const [offeringFor, setOfferingFor] = useState(null); // band to add offering to

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await timetableService.getElectiveBands({ classId, academicYearId }); setBands(data.bands || []); }
    catch { setError('Failed to load bands'); } finally { setLoading(false); }
  }, [classId, academicYearId]);
  useEffect(() => { load(); }, [load]);

  const subjectName = (id) => subjects.find((s) => s.uuid === id)?.name || id;

  const removeOffering = async (offeringId) => {
    try { await timetableService.deleteElectiveOffering(offeringId); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to remove offering'); }
  };
  const deleteBand = async () => {
    try { await timetableService.deleteElectiveBand(delBand.band.uuid); setDelBand({ open: false, band: null }); load(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to delete band'); setDelBand({ open: false, band: null }); }
  };

  if (loading) return <CircularProgress />;
  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 2 }}>
        XI/XII option groups: all subjects in a band run in the same periods; each student picks one.
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setBandDialog(true)}>Add Band</Button>
      </Box>
      <Stack spacing={2}>
        {bands.length === 0 && <Typography sx={{ color: '#8f9bb3' }}>No elective bands.</Typography>}
        {bands.map((band) => (
          <Card key={band.uuid}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6">{band.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>{band.periodsPerWeek} periods/week · blocks: {blockSummary(band.blockRules)}</Typography>
                </Box>
                <Box>
                  <Tooltip title="Add offering"><IconButton color="primary" onClick={() => setOfferingFor(band)}><AddIcon /></IconButton></Tooltip>
                  <Tooltip title="Delete band"><IconButton color="error" onClick={() => setDelBand({ open: true, band })}><DeleteIcon /></IconButton></Tooltip>
                </Box>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(band.offerings || []).length === 0 && <Typography variant="body2" sx={{ color: '#8f9bb3' }}>No offerings yet.</Typography>}
                {(band.offerings || []).map((o) => (
                  <Chip key={o.uuid} label={<span>{o.subjectName || subjectName(o.subjectId)} — <TeacherName id={o.teacherId} /></span>}
                    onDelete={() => removeOffering(o.uuid)} variant="outlined" />
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {bandDialog && (
        <BandDialog classId={classId} academicYearId={academicYearId}
          onClose={() => setBandDialog(false)} onSaved={load} />
      )}
      {offeringFor && (
        <OfferingDialog band={offeringFor} subjects={subjects}
          onClose={() => setOfferingFor(null)} onSaved={() => { setOfferingFor(null); load(); }} />
      )}
      <ConfirmDialog open={delBand.open} title="Delete Band" message={`Delete band "${delBand.band?.name}" and its offerings?`}
        onConfirm={deleteBand} onCancel={() => setDelBand({ open: false, band: null })} />
    </Box>
  );
}

function BandDialog({ classId, academicYearId, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [periodsPerWeek, setPeriodsPerWeek] = useState(1);
  const [blockRules, setBlockRules] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    const ppw = Number(periodsPerWeek);
    if (!Number.isInteger(ppw) || ppw < 1) { setError('Periods/week must be a positive integer'); return; }
    setSaving(true); setError('');
    try {
      await timetableService.createElectiveBand({ academicYearId, classId, name: name.trim(), periodsPerWeek: ppw, blockRules });
      onSaved(); onClose();
    } catch (err) { setError(err.response?.data?.error?.description || 'Failed to create band'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Elective Band</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
        <TextField autoFocus fullWidth label="Band name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
        <TextField fullWidth type="number" label="Periods per week" value={periodsPerWeek}
          onChange={(e) => setPeriodsPerWeek(e.target.value)} sx={{ mb: 2 }} />
        <BlockRulesEditor value={blockRules} periodsPerWeek={periodsPerWeek} onChange={setBlockRules} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function OfferingDialog({ band, subjects, onClose, onSaved }) {
  const [subjectId, setSubjectId] = useState('');
  const [teacher, setTeacher] = useState(null);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!subjectId) { setError('Pick a subject'); return; }
    if (!teacher?.uuid) { setError('Pick a teacher'); return; }
    setSaving(true); setError('');
    try { await timetableService.addElectiveOffering(band.uuid, { subjectId, teacherId: teacher.uuid }); onSaved(); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to add offering'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Offering to {band.name}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
        <Autocomplete sx={{ mt: 1, mb: 2 }} options={subjects} getOptionLabel={(o) => o.name || ''}
          value={subjects.find((s) => s.uuid === subjectId) || null} onChange={(e, v) => setSubjectId(v?.uuid || '')}
          renderInput={(params) => <TextField {...params} label="Subject" />} />
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2">Teacher:</Typography>
          <Chip label={teacher?.name || 'none'} />
          <Button size="small" variant="outlined" onClick={() => setPicker(true)}>{teacher ? 'Change' : 'Pick'}</Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Add'}</Button>
      </DialogActions>
      <EmployeeSearchDialog open={picker} onClose={() => setPicker(false)} onSelect={(emp) => setTeacher(emp)} />
    </Dialog>
  );
}

// --------------------------------------------------------------------- ClassSetup
export default function ClassSetup() {
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [tab, setTab] = useState(0);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    timetableService.getSubjects().then((d) => setSubjects(d.subjects || [])).catch(() => {});
  }, []);

  const ready = academicYearId && classId;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Class Setup</Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <AcademicYearSelect value={academicYearId} onChange={setAcademicYearId} />
        <ClassSelect value={classId} onChange={setClassId} />
      </Stack>

      {!ready ? (
        <Alert severity="info">Select an academic year and class to configure.</Alert>
      ) : (
        <Card>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: '1px solid #e4e9f2' }}>
            <Tab label="Class Teacher" />
            <Tab label="Subjects" />
            <Tab label="Teachers" />
            <Tab label="Electives" />
          </Tabs>
          <CardContent>
            {tab === 0 && <ClassTeacherTab key={`ct-${classId}-${academicYearId}`} classId={classId} academicYearId={academicYearId} />}
            {tab === 1 && <SubjectsTab key={`cs-${classId}-${academicYearId}`} classId={classId} academicYearId={academicYearId} subjects={subjects} />}
            {tab === 2 && <TeachersTab key={`ta-${classId}-${academicYearId}`} classId={classId} academicYearId={academicYearId} subjects={subjects} />}
            {tab === 3 && <ElectivesTab key={`eb-${classId}-${academicYearId}`} classId={classId} academicYearId={academicYearId} subjects={subjects} />}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
