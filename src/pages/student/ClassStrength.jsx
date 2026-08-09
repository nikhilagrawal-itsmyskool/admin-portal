import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { Groups as StrengthIcon } from '@mui/icons-material';
import ResponsiveDataGrid from '../../components/common/ResponsiveDataGrid';
import { studentService } from '../../services/studentService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { fmtDate } from '../../utils/date';

// Per-class active head-count + the last admission that landed in each class for
// the portal-wide session. "Last admission" = the enrolled student with the most
// recent admission date.
export default function ClassStrength() {
  const { academicYearId, years } = useAcademicYear();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedYear = useMemo(
    () => years.find((y) => y.uuid === academicYearId) || null,
    [years, academicYearId]
  );

  useEffect(() => {
    if (!academicYearId) {
      setLoading(false);
      return;
    }
    (async () => {
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
    })();
  }, [academicYearId]);

  const totalStrength = useMemo(
    () => classes.reduce((sum, c) => sum + Number(c.activeStrength || 0), 0),
    [classes]
  );

  // School-wide last admission = the most recent per-class last-admission (each
  // student sits in exactly one class, so the global max is the max of the maxes).
  const schoolLastAdmission = useMemo(() => {
    let best = null;
    for (const c of classes) {
      if (!c.lastAdmissionDate) continue;
      if (!best || new Date(c.lastAdmissionDate) > new Date(best.lastAdmissionDate)) best = c;
    }
    return best;
  }, [classes]);

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
      valueGetter: (value, row) => fmtDate(row.lastAdmissionDate) || '—',
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
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip color="primary" label={`Total active: ${totalStrength}`} />
            <Chip variant="outlined" label={`${classes.length} classes`} />
          </Stack>
        </CardContent>
      </Card>

      {schoolLastAdmission && (
        <Card sx={{ mb: 3, borderLeft: '4px solid', borderColor: 'primary.main', bgcolor: '#f5f8ff' }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Typography variant="overline" color="text.secondary">
              Last admission to the school ({selectedYear?.name})
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {schoolLastAdmission.lastAdmissionName}
              </Typography>
              {schoolLastAdmission.lastAdmissionNumber && (
                <Chip size="small" variant="outlined" label={schoolLastAdmission.lastAdmissionNumber} />
              )}
              <Chip size="small" color="primary" variant="outlined" label={schoolLastAdmission.className} />
              <Typography variant="body2" color="text.secondary">
                admitted {fmtDate(schoolLastAdmission.lastAdmissionDate)}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

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
