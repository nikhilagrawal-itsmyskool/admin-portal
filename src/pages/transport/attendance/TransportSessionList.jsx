import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, Chip, Grid, MenuItem, TextField, Button,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import { transportService } from '../../../services/transportService';

export default function TransportSessionList() {
  const [sessions, setSessions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeId, setRouteId] = useState('');

  const load = async (rid) => {
    setLoading(true); setError('');
    try {
      const id = rid !== undefined ? rid : routeId;
      const data = await transportService.listAttendanceSessions(id ? { routeId: id } : {});
      setSessions(data.sessions || []);
    } catch {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const rts = await transportService.getRoutes();
        setRoutes(rts || []);
      } catch { /* ignore */ }
    })();
    load();
  }, []);

  const columns = [
    { field: 'attendanceDate', headerName: 'Date', width: 120 },
    { field: 'routeName', headerName: 'Route', flex: 1, minWidth: 150, valueFormatter: (v) => v || '-' },
    {
      field: 'direction', headerName: 'Direction', width: 120,
      renderCell: (params) => <Chip size="small" variant="outlined" label={params.value === 'morning' ? 'Morning' : 'Evening'}
        color={params.value === 'morning' ? 'warning' : 'info'} />,
    },
    {
      field: 'status', headerName: 'Status', width: 120,
      renderCell: (params) => <Chip size="small" label={params.value === 'finalized' ? 'Finalized' : 'Open'}
        color={params.value === 'finalized' ? 'success' : 'default'} />,
    },
    { field: 'boardedCount', headerName: 'Boarded', width: 100, valueFormatter: (v) => v ?? 0 },
    { field: 'absentCount', headerName: 'Absent', width: 100, valueFormatter: (v) => v ?? 0 },
    { field: 'markedCount', headerName: 'Marked', width: 100, valueFormatter: (v) => v ?? 0 },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Bus Attendance History</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField fullWidth select size="small" label="Route" value={routeId}
                onChange={(e) => { setRouteId(e.target.value); load(e.target.value); }}>
                <MenuItem value="">All Routes</MenuItem>
                {routes.map((r) => <MenuItem key={r.uuid} value={r.uuid}>{r.name} ({r.direction})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="outlined" size="small" onClick={() => { setRouteId(''); load(''); }}>Clear</Button>
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
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
      />
    </Box>
  );
}
