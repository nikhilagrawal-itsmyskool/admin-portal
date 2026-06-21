import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Grid,
  Box,
  Alert,
  Chip,
  Typography,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { labService } from '../../../services/labService';

// Fields that make up an item "definition" (everything except stock / audit / ids).
const DEFINITION_FIELDS = [
  'name',
  'category',
  'itemType',
  'unit',
  'reorderLevel',
  'location',
  'itemCondition',
  'costPerUnit',
  'comments',
];

const toDefinition = (item) => {
  const def = {};
  DEFINITION_FIELDS.forEach((f) => {
    if (item[f] !== undefined && item[f] !== null) def[f] = item[f];
  });
  return def;
};

export default function CopyItemsDialog({ open, onClose, labs, defaultTargetLab, onCopied }) {
  const [sourceLab, setSourceLab] = useState(null);
  const [targetLab, setTargetLab] = useState(null);
  const [sourceItems, setSourceItems] = useState([]);
  const [selectionModel, setSelectionModel] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Reset when opened; pre-fill target with the lab currently being viewed.
  useEffect(() => {
    if (open) {
      setSourceLab(null);
      setTargetLab(defaultTargetLab || null);
      setSourceItems([]);
      setSelectionModel([]);
      setError('');
      setResult(null);
    }
  }, [open, defaultTargetLab]);

  const loadSourceItems = async (lab) => {
    if (!lab) {
      setSourceItems([]);
      setSelectionModel([]);
      return;
    }
    setLoadingItems(true);
    setError('');
    try {
      const data = await labService.getItems({ labId: lab.uuid });
      setSourceItems(data);
      setSelectionModel([]);
    } catch (err) {
      setError('Failed to load items from the selected lab');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSourceChange = (event, newValue) => {
    setSourceLab(newValue);
    setResult(null);
    loadSourceItems(newValue);
  };

  const handleCopy = async () => {
    setError('');
    if (!targetLab) {
      setError('Please choose a target lab to copy into');
      return;
    }
    if (!sourceLab) {
      setError('Please choose a source lab to copy from');
      return;
    }
    if (sourceLab.uuid === targetLab.uuid) {
      setError('Source and target lab cannot be the same');
      return;
    }
    if (selectionModel.length === 0) {
      setError('Select at least one item to copy');
      return;
    }

    const selectedSet = new Set(selectionModel);
    const items = sourceItems
      .filter((it) => selectedSet.has(it.uuid))
      .map(toDefinition);

    setCopying(true);
    try {
      const res = await labService.bulkCreateItems({ labId: targetLab.uuid, items });
      setResult(res);
      if (onCopied) onCopied();
    } catch (err) {
      setError(err?.response?.data?.error?.description || 'Failed to copy items');
    } finally {
      setCopying(false);
    }
  };

  // After a successful copy, let the user pick another source lab and copy again.
  const handleCopyMore = () => {
    setResult(null);
    setSourceLab(null);
    setSourceItems([]);
    setSelectionModel([]);
    setError('');
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'category', headerName: 'Category', width: 130 },
    {
      field: 'itemType',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
          size="small"
          color={params.value === 'equipment' ? 'primary' : 'default'}
          variant="outlined"
        />
      ),
    },
    { field: 'unit', headerName: 'Unit', width: 90 },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Copy Items from Another Lab</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
          Pick a source lab, select the items to bring over, and copy them into the target
          lab. Copied items start at stock 0; items whose name already exists in the target
          lab are skipped.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={labs}
              getOptionLabel={(o) => o.name}
              value={sourceLab}
              onChange={handleSourceChange}
              isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
              renderInput={(params) => (
                <TextField {...params} label="Copy from (source lab)" size="small" />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={labs}
              getOptionLabel={(o) => o.name}
              value={targetLab}
              onChange={(e, v) => setTargetLab(v)}
              isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
              renderInput={(params) => (
                <TextField {...params} label="Copy into (target lab)" size="small" />
              )}
            />
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {result && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {result.created.length} item(s) copied
            {result.skipped.length > 0 && `, ${result.skipped.length} skipped`}.
            {result.skipped.length > 0 && (
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    <strong>{s.name}</strong> — {s.reason}
                  </li>
                ))}
              </Box>
            )}
          </Alert>
        )}

        {!result && (
          <>
            {loadingItems ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : sourceLab ? (
              <Box sx={{ height: 360 }}>
                <DataGrid
                  rows={sourceItems}
                  columns={columns}
                  getRowId={(row) => row.uuid}
                  checkboxSelection
                  disableRowSelectionOnClick
                  rowSelectionModel={selectionModel}
                  onRowSelectionModelChange={(model) => setSelectionModel(model)}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  localeText={{ noRowsLabel: 'This lab has no items to copy' }}
                  sx={{ border: 'none' }}
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Select a source lab to see its items.
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <>
            <Button onClick={handleCopyMore}>Copy from another lab</Button>
            <Button variant="contained" onClick={onClose}>Done</Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              startIcon={<CopyIcon />}
              onClick={handleCopy}
              disabled={copying || selectionModel.length === 0}
            >
              {copying ? 'Copying...' : `Copy ${selectionModel.length || ''} item(s)`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
