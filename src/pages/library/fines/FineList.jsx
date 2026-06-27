import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Alert, Chip, IconButton, TextField, MenuItem, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Payments as CollectIcon, Block as WaiveIcon } from '@mui/icons-material';
import { libraryService } from '../../../services/libraryService';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';

const STATUS_COLORS = { pending: 'warning', paid: 'success', waived: 'default' };

export default function FineList() {
  const can = useCan();
  const canManage = can(ACTIONS.LIBRARY_MANAGE);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [collectDlg, setCollectDlg] = useState({ open: false, fine: null, amount: '', notes: '' });
  const [waiveDlg, setWaiveDlg] = useState({ open: false, fine: null, notes: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => { load(); }, [status]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await libraryService.listFines(status ? { status } : {});
      setFines(data.fines || []);
    } catch {
      setError('Failed to load fines');
    } finally {
      setLoading(false);
    }
  };

  const doCollect = async () => {
    setBusy(true);
    try {
      const r = await libraryService.collectFine(collectDlg.fine.uuid, {
        amountCollected: collectDlg.amount === '' ? undefined : Number(collectDlg.amount),
        notes: collectDlg.notes || undefined,
      });
      setNotice({ severity: 'success', msg: `Collected. Receipt ${r.receiptNumber}.` });
      setCollectDlg({ open: false, fine: null, amount: '', notes: '' });
      load();
    } catch (err) {
      setNotice({ severity: 'error', msg: err.response?.data?.error?.description || 'Collection failed' });
    } finally {
      setBusy(false);
    }
  };

  const doWaive = async () => {
    setBusy(true);
    try {
      await libraryService.waiveFine(waiveDlg.fine.uuid, { notes: waiveDlg.notes || undefined });
      setNotice({ severity: 'success', msg: 'Fine waived.' });
      setWaiveDlg({ open: false, fine: null, notes: '' });
      load();
    } catch (err) {
      setNotice({ severity: 'error', msg: err.response?.data?.error?.description || 'Waive failed' });
    } finally {
      setBusy(false);
    }
  };

  const baseColumns = [
    { field: 'borrowerId', headerName: 'Borrower', flex: 1, minWidth: 140 },
    { field: 'borrowerType', headerName: 'Type', width: 100, renderCell: (p) => <Chip label={p.value} size="small" variant="outlined" /> },
    { field: 'fineType', headerName: 'Reason', width: 110, renderCell: (p) => <Chip label={p.value} size="small" color={p.value === 'lost' ? 'error' : 'warning'} variant="outlined" /> },
    { field: 'daysOverdue', headerName: 'Days', width: 80, renderCell: (p) => (p.value ?? '—') },
    { field: 'amount', headerName: 'Amount', width: 110, valueFormatter: (v) => `₹${Number(v).toFixed(2)}` },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <Chip label={p.value} size="small" color={STATUS_COLORS[p.value] || 'default'} /> },
    { field: 'receiptNumber', headerName: 'Receipt', width: 160, renderCell: (p) => p.value || '—' },
  ];

  const columns = canManage
    ? [
        ...baseColumns,
        {
          field: 'actions', headerName: 'Actions', width: 110, sortable: false,
          renderCell: (params) => params.row.status === 'pending' ? (
            <Box>
              <IconButton size="small" color="success" title="Collect" onClick={() => setCollectDlg({ open: true, fine: params.row, amount: String(params.row.amount), notes: '' })}><CollectIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="warning" title="Waive" onClick={() => setWaiveDlg({ open: true, fine: params.row, notes: '' })}><WaiveIcon fontSize="small" /></IconButton>
            </Box>
          ) : null,
        },
      ]
    : baseColumns;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Library Fines</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice.msg}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField select fullWidth size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="waived">Waived</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <DataGrid
          rows={fines}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 }, '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' } }}
        />
      </Card>

      <Dialog open={collectDlg.open} onClose={() => setCollectDlg({ open: false, fine: null, amount: '', notes: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Collect fine</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" type="number" label="Amount collected" sx={{ mt: 1 }}
            value={collectDlg.amount} onChange={(e) => setCollectDlg({ ...collectDlg, amount: e.target.value })} />
          <TextField fullWidth size="small" label="Notes" sx={{ mt: 2 }}
            value={collectDlg.notes} onChange={(e) => setCollectDlg({ ...collectDlg, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollectDlg({ open: false, fine: null, amount: '', notes: '' })}>Cancel</Button>
          <Button variant="contained" onClick={doCollect} disabled={busy}>Collect & issue receipt</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={waiveDlg.open} onClose={() => setWaiveDlg({ open: false, fine: null, notes: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Waive fine</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Reason / notes" sx={{ mt: 1 }}
            value={waiveDlg.notes} onChange={(e) => setWaiveDlg({ ...waiveDlg, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWaiveDlg({ open: false, fine: null, notes: '' })}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={doWaive} disabled={busy}>Waive</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
