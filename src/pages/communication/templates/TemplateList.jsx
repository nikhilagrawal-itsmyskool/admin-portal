import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, IconButton, Alert, Chip, Tooltip,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { communicationService } from '../../../services/communicationService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';

export default function TemplateList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.COMMUNICATION_TEMPLATE_MANAGE);
  const canDelete = can(ACTIONS.COMMUNICATION_TEMPLATE_DELETE);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, template: null });
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await communicationService.listTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await communicationService.deleteTemplate(deleteDialog.template.uuid);
      setDeleteDialog({ open: false, template: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'key', headerName: 'Key', flex: 1, minWidth: 160 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 140 },
    {
      field: 'channel', headerName: 'Channel', width: 120,
      renderCell: (p) => <Chip size="small" label={p.value} color={p.value === 'whatsapp' ? 'success' : 'primary'} variant="outlined" />,
    },
    { field: 'language', headerName: 'Lang', width: 80 },
    { field: 'providerTemplateId', headerName: 'Provider Template', flex: 1, minWidth: 160 },
    {
      field: 'status', headerName: 'Status', width: 100,
      renderCell: (p) => <Chip size="small" label={p.value} color={p.value === 'active' ? 'success' : 'default'} variant="outlined" />,
    },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (params) => (
        <Box>
          {canManage && (
            <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/communication/templates/${params.row.uuid}/edit`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, template: params.row })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Message Templates</Typography>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/communication/templates/add')}>Add Template</Button>}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <ResponsiveDataGrid
          rows={templates}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
        />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Template"
        message={`Delete template "${deleteDialog.template?.key}" (${deleteDialog.template?.channel})?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, template: null })}
        loading={deleting}
      />
    </Box>
  );
}
