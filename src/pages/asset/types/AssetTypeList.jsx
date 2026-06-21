import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { assetService } from '../../../services/assetService';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

function TypeFormDialog({ open, onClose, onSaved, type }) {
  const isEdit = !!type;
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState('item');
  const [tagAbbr, setTagAbbr] = useState('');
  const [includeInTag, setIncludeInTag] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCode(type?.code || '');
      setLabel(type?.label || '');
      setKind(type?.kind || 'item');
      setTagAbbr(type?.tagAbbr || '');
      setIncludeInTag(type?.includeInTag !== false);
      setError('');
    }
  }, [open, type]);

  const handleSave = async () => {
    if (!isEdit && !code.trim()) { setError('Code is required'); return; }
    if (!label.trim()) { setError('Label is required'); return; }
    setSaving(true);
    setError('');
    try {
      const abbr = tagAbbr.trim().toLowerCase();
      if (isEdit) {
        await assetService.updateType(type.uuid, { label: label.trim(), kind, tagAbbr: abbr, includeInTag });
      } else {
        await assetService.createType({ code: code.trim().toLowerCase(), label: label.trim(), kind, tagAbbr: abbr, includeInTag });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save type');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Asset Type' : 'Add Asset Type'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              size="small"
              disabled={isEdit}
              helperText={isEdit ? 'Code cannot be changed' : 'Lowercase, e.g. projector'}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              size="small"
              helperText="Containers usually have children; items are usually leaves"
            >
              <MenuItem value="container">Container</MenuItem>
              <MenuItem value="item">Item</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Tag abbreviation"
              value={tagAbbr}
              onChange={(e) => setTagAbbr(e.target.value)}
              size="small"
              inputProps={{ maxLength: 8 }}
              helperText="Short code used in asset tags, e.g. fn → fn-01 (defaults to the code)"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={includeInTag} onChange={(e) => setIncludeInTag(e.target.checked)} />}
              label="Include this level in asset tags"
            />
            <Typography variant="caption" display="block" sx={{ color: '#8f9bb3', mt: -0.5 }}>
              Turn off to keep this level out of tags (e.g. institution/campus), so tags start lower in the tree.
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AssetTypeList() {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formDialog, setFormDialog] = useState({ open: false, type: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const data = await assetService.listTypes();
      setTypes(data);
    } catch (err) {
      setError('Failed to load asset types');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await assetService.deleteType(deleteDialog.type.uuid);
      setDeleteDialog({ open: false, type: null });
      loadTypes();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to delete type');
      setDeleteDialog({ open: false, type: null });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { field: 'label', headerName: 'Label', flex: 1, minWidth: 160 },
    { field: 'code', headerName: 'Code', width: 150, renderCell: (p) => <code>{p.value}</code> },
    {
      field: 'tagAbbr',
      headerName: 'Abbr',
      width: 90,
      renderCell: (p) => (p.value ? <code>{p.value}</code> : <span style={{ color: '#8f9bb3' }}>—</span>),
    },
    {
      field: 'includeInTag',
      headerName: 'In tag',
      width: 100,
      renderCell: (p) => (
        <Chip
          label={p.value === false ? 'No' : 'Yes'}
          size="small"
          color={p.value === false ? 'default' : 'success'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'kind',
      headerName: 'Kind',
      width: 130,
      renderCell: (p) => (
        <Chip label={p.value} size="small" color={p.value === 'container' ? 'primary' : 'default'} variant="outlined" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => setFormDialog({ open: true, type: params.row })}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, type: params.row })}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/asset/tree')}><BackIcon /></IconButton>
          <Typography variant="h4">Asset Types</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormDialog({ open: true, type: null })}>
          Add Type
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Card>
        <DataGrid
          rows={types}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
        />
      </Card>

      <TypeFormDialog
        open={formDialog.open}
        type={formDialog.type}
        onClose={() => setFormDialog({ open: false, type: null })}
        onSaved={loadTypes}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Asset Type"
        message={`Delete type "${deleteDialog.type?.label}"? Types still used by assets cannot be deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, type: null })}
        loading={deleting}
      />
    </Box>
  );
}
