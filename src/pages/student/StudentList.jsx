import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Alert,
  Chip,
  TextField,
  Grid,
  MenuItem,
  Autocomplete,
  Paper,
  Stack,
  Avatar,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import usePersistedPaginationModel from '../../hooks/usePersistedPaginationModel';
import usePersistedState from '../../hooks/usePersistedState';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  TrendingUp as PromoteIcon,
  Home as HouseIcon,
  School as GraduateIcon,
} from '@mui/icons-material';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PromoteDialog from './PromoteDialog';
import AssignHouseDialog from './AssignHouseDialog';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

const STATUS_COLORS = { active: 'success', inactive: 'default', deleted: 'error' };

export default function StudentList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.STUDENT_MANAGE);
  const { academicYearId, years } = useAcademicYear(); // portal-wide year — student search scopes to this
  const [students, setStudents] = useState([]);
  const [houses, setHouses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState([]);

  // Filters — persisted per-session so returning from a student's detail restores
  // the same search + results (paired with usePersistedPaginationModel + scroll).
  const [name, setName] = usePersistedState('studentList.name', '');
  const [selectedClass, setSelectedClass] = usePersistedState('studentList.class', null);
  const [admissionNumber, setAdmissionNumber] = usePersistedState('studentList.adm', '');
  const [phone, setPhone] = usePersistedState('studentList.phone', '');
  // Comms data-quality: show only students no notification can reach.
  const [unreachable, setUnreachable] = usePersistedState('studentList.unreachable', false);
  // Effective-contact breakdown for the current cohort ({ total, unreachable, breakdown }).
  const [commsSummary, setCommsSummary] = useState(null);

  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [assignHouseOpen, setAssignHouseOpen] = useState(false);
  const [graduateDialog, setGraduateDialog] = useState(false);
  const [graduating, setGraduating] = useState(false);
  const [paginationModel, setPaginationModel] = usePersistedPaginationModel('studentList', {
    page: 0,
    pageSize: 25,
  });

  const houseNameById = useMemo(() => {
    const m = {};
    houses.forEach((h) => (m[h.uuid] = h.name));
    return m;
  }, [houses]);

  useEffect(() => {
    loadLookups();
  }, []);

  // Student search scopes to the portal-wide academic year — re-run when it (or the persisted
  // filters on a return visit) is ready. Fires on mount once the global year resolves.
  useEffect(() => {
    loadStudents();
  }, [academicYearId]);

  const loadLookups = async () => {
    // Each lookup loads independently — one failing API must not blank the others.
    const [h, c] = await Promise.allSettled([
      studentService.getHouses(),
      classService.getClasses(),
    ]);
    if (h.status === 'fulfilled') setHouses(h.value.houses || []);
    if (c.status === 'fulfilled') setClasses(c.value || []);
  };

  const buildFilters = () => {
    const f = {};
    if (name) f.name = name;
    if (selectedClass) f.classId = selectedClass.uuid;
    if (academicYearId) f.academicYearId = academicYearId;
    if (admissionNumber) f.admissionNumber = admissionNumber;
    if (phone) f.phone = phone;
    if (unreachable) f.unreachable = true;
    return f;
  };

  const loadStudents = async (overrideFilters) => {
    setLoading(true);
    setError('');
    try {
      const filters = overrideFilters !== undefined ? overrideFilters : buildFilters();
      const data = await studentService.searchStudents({ ...filters, withPhotos: true });
      setStudents(Array.isArray(data) ? data : data.students || []);
      setSelection([]);
      // Breakdown covers the whole cohort — drop the unreachable toggle so the
      // summary doesn't collapse to just the unreachable rows. Never blocks the list.
      const { unreachable: _drop, ...cohort } = filters;
      studentService
        .getCommsSummary(cohort)
        .then(setCommsSummary)
        .catch(() => setCommsSummary(null));
    } catch {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Toggle the "unreachable only" quick filter and re-run immediately (state is
  // async, so search with an explicit override).
  const toggleUnreachable = (next) => {
    setUnreachable(next);
    setPaginationModel((p) => ({ ...p, page: 0 }));
    const f = buildFilters();
    if (next) f.unreachable = true;
    else delete f.unreachable;
    loadStudents(f);
  };

  // Never leave the user stranded past the last page (new search, deletes).
  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(students.length / paginationModel.pageSize) - 1);
    if (paginationModel.page > lastPage) {
      setPaginationModel({ ...paginationModel, page: lastPage });
    }
  }, [students.length, paginationModel.pageSize]);

  // A fresh search yields a new result set — jump back to the first page.
  const runSearch = () => {
    setPaginationModel((p) => ({ ...p, page: 0 }));
    loadStudents();
  };

  const handleClear = () => {
    setName('');
    setSelectedClass(null);
    setAdmissionNumber('');
    setPhone('');
    setUnreachable(false);
    setPaginationModel((p) => ({ ...p, page: 0 }));
    loadStudents({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await studentService.deleteStudent(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadStudents();
    } catch {
      setError('Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  const handleGraduate = async () => {
    setGraduating(true);
    try {
      await studentService.graduate({
        academicYearFromId: academicYearId,
        studentIds: selection,
      });
      setGraduateDialog(false);
      loadStudents();
    } catch {
      setError('Failed to graduate students');
    } finally {
      setGraduating(false);
    }
  };

  const columns = [
    {
      field: 'photo',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Avatar src={params.row.photoUrl || undefined} sx={{ width: 32, height: 32 }}>
          {params.row.name?.[0]?.toUpperCase()}
        </Avatar>
      ),
    },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    {
      field: 'className',
      headerName: 'Class',
      width: 110,
      valueGetter: (value, row) => row.className || row.class_name || '-',
    },
    {
      field: 'admissionNumber',
      headerName: 'Adm #',
      width: 110,
      valueGetter: (value, row) => row.admissionNumber || row.admission_number || '-',
    },
    {
      field: 'gender',
      headerName: 'Gender',
      width: 90,
      valueGetter: (value, row) => row.gender || '-',
    },
    {
      field: 'houseId',
      headerName: 'House',
      width: 120,
      valueGetter: (value, row) => houseNameById[row.houseId || row.house_id] || '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value || 'active'} size="small" color={STATUS_COLORS[params.value] || 'default'} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" title="View" onClick={() => navigate(`/students/${params.row.uuid}`)}>
            <ViewIcon fontSize="small" />
          </IconButton>
          {canManage && (
            <IconButton size="small" title="Edit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} onClick={() => navigate(`/students/${params.row.uuid}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {canManage && (
            <IconButton
              size="small"
              color="error"
              title="Delete"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              onClick={() => setDeleteDialog({ open: true, item: params.row })}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Students</Typography>
        {canManage && (
          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <Button variant="outlined" startIcon={<PromoteIcon />} onClick={() => setPromoteOpen(true)}>
              Promote Class
            </Button>
            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => navigate('/students/new')}>
              Admit Student
            </Button>
          </Stack>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2.5}>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                size="small"
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Autocomplete
                options={classes}
                getOptionLabel={(o) => o.name || ''}
                value={selectedClass}
                onChange={(e, v) => setSelectedClass(v)}
                renderInput={(p) => <TextField {...p} label="Class" size="small" />}
              />
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField
                fullWidth
                label="Adm #"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                size="small"
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </Grid>
            <Grid item xs={6} md={1.5}>
              <TextField
                fullWidth
                label="Parent phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                size="small"
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<SearchIcon />} onClick={runSearch} size="small">
                  Search
                </Button>
                <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClear} size="small">
                  Clear
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={unreachable}
                    onChange={(e) => toggleUnreachable(e.target.checked)}
                  />
                }
                label="Only unreachable (no mobile or WhatsApp on father, mother & guardian)"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Population action bar — appears when rows are selected */}
      {selection.length > 0 && canManage && (
        <Paper
          sx={{
            mb: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            backgroundColor: '#eef3ff',
            border: '1px solid #c7d6ff',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {selection.length} selected
          </Typography>
          <Button size="small" variant="contained" startIcon={<PromoteIcon />} onClick={() => setPromoteOpen(true)}>
            Promote
          </Button>
          <Button size="small" variant="outlined" startIcon={<HouseIcon />} onClick={() => setAssignHouseOpen(true)}>
            Assign House
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<GraduateIcon />}
            onClick={() => setGraduateDialog(true)}
          >
            Graduate
          </Button>
        </Paper>
      )}

      {/* Effective-contact breakdown for the cohort — who the sender's WhatsApp-first
          ladder would actually reach first. The "Unreachable" chip doubles as a filter. */}
      {commsSummary && commsSummary.total > 0 && (
        <Paper variant="outlined" sx={{ mb: 2, p: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 600, mr: 0.5 }}>
              Reached first via:
            </Typography>
            {commsSummary.breakdown.map((b) => (
              <Chip
                key={`${b.role}:${b.channel}`}
                size="small"
                variant="outlined"
                label={`${roleLabel(b.role)} · ${channelLabel(b.channel)} — ${b.count}`}
              />
            ))}
            <Tooltip title="No mobile or WhatsApp on father, mother or guardian — a notification can never reach them. Click to filter the list.">
              <Chip
                size="small"
                color={commsSummary.unreachable > 0 ? 'error' : 'default'}
                variant={unreachable ? 'filled' : 'outlined'}
                onClick={() => toggleUnreachable(!unreachable)}
                label={`Unreachable — ${commsSummary.unreachable}`}
              />
            </Tooltip>
          </Stack>
        </Paper>
      )}

      <ResponsiveDataGrid
          primaryChipField="status"
          mobilePageSize={25}
          emptyMessage="No students found."
          rows={students}
          columns={columns}
          getRowId={(row) => row.uuid}
          onCardClick={(row) => navigate(`/students/${row.uuid}`)}
          loading={loading}
          autoHeight
          checkboxSelection={canManage}
          rowSelectionModel={selection}
          onRowSelectionModelChange={(ids) => setSelection(ids)}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' },
          }}
        />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Student"
        message={`Delete ${deleteDialog.item?.name || 'this student'}? This soft-deletes the record.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />

      <ConfirmDialog
        open={graduateDialog}
        title="Graduate / Pass Out"
        message={`Mark ${selection.length} student(s) as passed out (status inactive)? They stay in history but leave active rosters.`}
        onConfirm={handleGraduate}
        onCancel={() => setGraduateDialog(false)}
        loading={graduating}
      />

      <PromoteDialog
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        classes={classes}
        years={years}
        selectedStudentIds={selection}
        defaultFromYear={(years || []).find((y) => y.uuid === academicYearId) || null}
        defaultFromClass={selectedClass}
        onDone={() => {
          setPromoteOpen(false);
          loadStudents();
        }}
      />

      <AssignHouseDialog
        open={assignHouseOpen}
        onClose={() => setAssignHouseOpen(false)}
        houses={houses}
        studentIds={selection}
        onDone={() => {
          setAssignHouseOpen(false);
          loadStudents();
        }}
      />
    </Box>
  );
}

// Labels for the effective-contact breakdown chips.
const roleLabel = (r) => ({ father: 'Father', mother: 'Mother', guardian: 'Guardian' }[r] || r);
const channelLabel = (c) => (c === 'sms' ? 'SMS' : c === 'whatsapp' ? 'WhatsApp' : c);
