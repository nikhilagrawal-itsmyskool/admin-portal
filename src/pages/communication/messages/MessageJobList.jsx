import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, Alert, Chip, Button } from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import { Send as ComposeIcon } from '@mui/icons-material';
import { communicationService } from '../../../services/communicationService';
import { fmtDateTime } from '../../../utils/date';

const statusColor = (s) => ({ completed: 'success', failed: 'error', running: 'info', queued: 'default', canceled: 'warning' }[s] || 'default');

export default function MessageJobList() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await communicationService.listMessages();
        setJobs(data.jobs || []);
      } catch (err) {
        setError(err.response?.data?.error?.description || 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = [
    { field: 'createdAt', headerName: 'Created', width: 170, valueGetter: (value) => fmtDateTime(value) },
    { field: 'templateKey', headerName: 'Template', flex: 1, minWidth: 150 },
    { field: 'audienceSummary', headerName: 'Audience', flex: 1, minWidth: 150 },
    { field: 'source', headerName: 'Source', width: 120 },
    {
      field: 'status', headerName: 'Status', width: 120,
      renderCell: (p) => <Chip size="small" label={p.value} color={statusColor(p.value)} variant="outlined" />,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Sent Messages</Typography>
        <Button variant="contained" startIcon={<ComposeIcon />} onClick={() => navigate('/communication/compose')}>Compose</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <ResponsiveDataGrid
          rows={jobs}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          onRowClick={(params) => navigate(`/communication/messages/${params.row.uuid}`)}
          sx={{ border: 'none', cursor: 'pointer', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
        />
    </Box>
  );
}
