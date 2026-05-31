import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Alert, IconButton, Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import uniformService from '../../../services/uniformService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

const GENDER_LABELS = { male: 'Boys', female: 'Girls', unisex: 'Unisex' };
const GENDER_COLORS = { male: 'primary', female: 'secondary', unisex: 'default' };

export default function UniformSetList() {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await uniformService.getSets();
      setSets(data);
    } catch {
      setError('Failed to load sets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await uniformService.deleteSet(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      load();
    } catch {
      setError('Failed to delete set');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'name', headerName: 'Set Name', flex: 1, minWidth: 160 },
    {
      field: 'gender', headerName: 'For', width: 110,
      renderCell: (params) => params.value
        ? <Chip label={GENDER_LABELS[params.value] || params.value} size="small" color={GENDER_COLORS[params.value] || 'default'} />
        : '—',
    },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 180, valueFormatter: (v) => v || '—' },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => navigate(`/uniform/sets/${params.row.uuid}/edit`)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item: params.row })}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Uniform Sets</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/uniform/sets/new')}>Create Set</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <DataGrid
          rows={sets}
          columns={columns}
          getRowId={r => r.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 }, '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' } }}
        />
      </Card>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Set"
        message={`Delete set "${deleteDialog.item?.name}"? This won't affect existing sales.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
