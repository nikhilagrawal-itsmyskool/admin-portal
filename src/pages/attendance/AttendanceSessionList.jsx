import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Autocomplete,
  Button, Alert, Chip,
} from '@mui/material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import { Search as SearchIcon } from '@mui/icons-material';
import { attendanceService } from '../../services/attendanceService';
import { classService } from '../../services/classService';
import { useAcademicYear } from '../../context/AcademicYearContext';

export default function AttendanceSessionList() {
  const navigate = useNavigate();
  const { academicYearId } = useAcademicYear();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const classNameById = React.useMemo(() => {
    const m = {};
    classes.forEach((c) => { m[c.uuid] = c.name; });
    return m;
  }, [classes]);

  useEffect(() => {
    (async () => {
      try {
        const cls = await classService.getClasses();
        setClasses(Array.isArray(cls) ? cls : cls?.classes || []);
      } catch { /* non-fatal */ }
    })();
  }, []);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const filters = {};
      if (selectedClass) filters.classId = selectedClass.uuid;
      if (academicYearId) filters.academicYearId = academicYearId;
      if (from) filters.from = from;
      if (to) filters.to = to;
      const data = await attendanceService.listSessions(filters);
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* reload on year change */ }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { field: 'attendanceDate', headerName: 'Date', width: 130 },
    { field: 'classId', headerName: 'Class', flex: 1, minWidth: 140, valueGetter: (value) => classNameById[value] || value },
    {
      field: 'status', headerName: 'Status', width: 120,
      renderCell: (params) => <Chip size="small" label={params.value} color={params.value === 'finalized' ? 'success' : 'default'} variant="outlined" />,
    },
    { field: 'presentCount', headerName: 'Present', width: 100 },
    { field: 'absentCount', headerName: 'Absent', width: 100 },
    { field: 'markedCount', headerName: 'Marked', width: 100 },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Attendance History</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={classes}
                getOptionLabel={(o) => o.name || ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={selectedClass}
                onChange={(_, v) => setSelectedClass(v)}
                renderInput={(params) => <TextField {...params} label="Class" size="small" placeholder="All" />}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth type="date" size="small" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth type="date" size="small" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={load}>Search</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
          rows={sessions}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          onRowClick={(params) => navigate(`/attendance/sessions/${params.row.uuid}`)}
          sx={{ border: 'none', cursor: 'pointer', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
        />
    </Box>
  );
}
