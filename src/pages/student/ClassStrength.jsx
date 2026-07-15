import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Autocomplete,
  TextField,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { Groups as StrengthIcon } from '@mui/icons-material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import { studentService } from '../../services/studentService';
import { academicCalendarService } from '../../services/academicCalendarService';

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
};

// Per-class active head-count + the last admission that landed in each class for
// a chosen session (defaults to the current one). "Last admission" = the enrolled
// student with the most recent admission date.
export default function ClassStrength() {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const yrs = await academicCalendarService.getAcademicYears();
        setYears(yrs || []);
        const cur = (yrs || []).find((r) => r.isCurrent) || (yrs || [])[0] || null;
        setSelectedYear(cur);
        await load(cur?.uuid);
      } catch {
        setError('Failed to load academic years');
        setLoading(false);
      }
    })();
  }, []);

  const load = async (academicYearId) => {
    setLoading(true);
    setError('');
    try {
      const data = await studentService.getClassStrength(academicYearId);
      setClasses(data.classes || []);
    } catch {
      setError('Failed to load class strength');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const onYearChange = (_e, v) => {
    setSelectedYear(v);
    load(v?.uuid);
  };

  const totalStrength = useMemo(
    () => classes.reduce((sum, c) => sum + Number(c.activeStrength || 0), 0),
    [classes]
  );

  const columns = [
    { field: 'className', headerName: 'Class', flex: 1, minWidth: 120 },
    {
      field: 'activeStrength',
      headerName: 'Active Strength',
      width: 150,
      valueGetter: (value, row) => Number(row.activeStrength || 0),
    },
    {
      field: 'lastAdmissionName',
      headerName: 'Last Admission',
      flex: 1,
      minWidth: 160,
      valueGetter: (value, row) => row.lastAdmissionName || '—',
    },
    {
      field: 'lastAdmissionNumber',
      headerName: 'Adm #',
      width: 130,
      renderCell: (params) =>
        params.row.lastAdmissionNumber ? (
          <Chip size="small" variant="outlined" label={params.row.lastAdmissionNumber} />
        ) : (
          '—'
        ),
    },
    {
      field: 'lastAdmissionDate',
      headerName: 'Admitted On',
      width: 140,
      valueGetter: (value, row) => fmtDate(row.lastAdmissionDate),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <StrengthIcon color="primary" />
        <Typography variant="h4">Class Strength</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={years}
                getOptionLabel={(o) => o.name || ''}
                value={selectedYear}
                onChange={onYearChange}
                isOptionEqualToValue={(o, v) => o.uuid === v?.uuid}
                disableClearable
                renderInput={(p) => <TextField {...p} label="Academic Year" size="small" />}
              />
            </Grid>
            <Grid item xs={12} md={9}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip color="primary" label={`Total active: ${totalStrength}`} />
                <Chip variant="outlined" label={`${classes.length} classes`} />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ResponsiveDataGrid
        emptyMessage="No enrolments for this session."
        rows={classes}
        columns={columns}
        getRowId={(row) => row.classId}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
          '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' },
        }}
      />
    </Box>
  );
}
