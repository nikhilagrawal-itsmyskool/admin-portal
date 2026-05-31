import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Alert,
  Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { labService } from '../../../services/labService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

export default function LabList() {
  const navigate = useNavigate();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadLabs();
  }, []);

  const loadLabs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await labService.getLabs();
      setLabs(data);
    } catch (err) {
      setError('Failed to load labs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await labService.deleteLab(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadLabs();
    } catch (err) {
      setError('Failed to delete lab');
    } finally {
      setDeleting(false);
    }
  };

  const typeColors = {
    physics: 'primary',
    chemistry: 'secondary',
    biology: 'success',
    computer: 'info',
    language: 'warning',
    mathematics: 'default',
    other: 'default',
  };

  const filteredLabs = labs.filter((lab) =>
    lab.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
          size="small"
          color={typeColors[params.value] || 'default'}
          variant="outlined"
        />
      ),
    },
    { field: 'location', headerName: 'Location', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
          size="small"
          color={params.value === 'active' ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => {
        const isDeleted = params.row.status === 'deleted';
        return (
          <Box>
            <IconButton
              size="small"
              onClick={() => navigate(`/lab/labs/${params.row.uuid}/edit`)}
              title="Edit Lab"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/lab/items?lab=${params.row.uuid}`)}
              title="View Items"
            >
              <InventoryIcon fontSize="small" />
            </IconButton>
            {!isDeleted && (
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteDialog({ open: true, item: params.row })}
                title="Delete Lab"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Labs</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/lab/labs/add')}
        >
          Add Lab
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="Search labs by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <DataGrid
          rows={filteredLabs}
          columns={columns}
          getRowId={(row) => row.uuid}
          getRowClassName={(params) => params.row.status === 'deleted' ? 'deleted-row' : ''}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e4e9f2',
            },
            '& .deleted-row': {
              opacity: 0.6,
              backgroundColor: 'rgba(244, 67, 54, 0.04)',
              '& .MuiDataGrid-cell:not(:last-of-type)': {
                textDecoration: 'line-through',
              },
            },
          }}
        />
      </Card>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Lab"
        message={`Are you sure you want to delete "${deleteDialog.item?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />
    </Box>
  );
}
