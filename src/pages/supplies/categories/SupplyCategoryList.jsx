import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from '@mui/material';
import ResponsiveDataGrid from '../../../components/common/ResponsiveDataGrid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { suppliesService } from '../../../services/suppliesService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

function CategoryDialog({ open, category, onClose, onSaved }) {
  const isEdit = Boolean(category?.uuid);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(category?.name || '');
    setError('');
  }, [category, open]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await suppliesService.updateCategory(category.uuid, { name: name.trim() });
      } else {
        await suppliesService.createCategory({ name: name.trim() });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Category' : 'Add Category'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
        <TextField
          autoFocus
          fullWidth
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1 }}
          onKeyPress={(e) => e.key === 'Enter' && handleSave()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SupplyCategoryList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.SUPPLIES_MANAGE);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState({ open: false, category: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await suppliesService.getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await suppliesService.deleteCategory(deleteDialog.category.uuid);
      setDeleteDialog({ open: false, category: null });
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete category');
      setDeleteDialog({ open: false, category: null });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'name', headerName: 'Category', flex: 1, minWidth: 200 },
    { field: 'code', headerName: 'Code', width: 200 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View items">
            <IconButton size="small" color="primary" onClick={() => navigate(`/supplies/items?categoryId=${params.row.uuid}`)}>
              <InventoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {canManage && (
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => setDialog({ open: true, category: params.row })}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canManage && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, category: params.row })}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Supply Categories</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, category: null })}>
            Add Category
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <ResponsiveDataGrid
          rows={categories}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' },
          }}
        />

      <CategoryDialog
        open={dialog.open}
        category={dialog.category}
        onClose={() => setDialog({ open: false, category: null })}
        onSaved={loadCategories}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Category"
        message={`Delete "${deleteDialog.category?.name}"? Categories with items cannot be deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, category: null })}
        loading={deleting}
      />
    </Box>
  );
}
