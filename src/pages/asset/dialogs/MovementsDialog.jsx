import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { assetService } from '../../../services/assetService';
import { fmtDate } from '../../../utils/date';


// Read-only history of an asset's location (parent) changes.
export default function MovementsDialog({ open, onClose, asset, nameById }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && asset) {
      load();
    }
  }, [open, asset]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await assetService.getMovements(asset.uuid);
      setMovements(data);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const label = (id) => (id ? (nameById?.[id] || id) : '(root)');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Movement History — {asset?.name}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : movements.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#8f9bb3', py: 2 }}>
            No movements recorded for this asset.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.uuid}>
                  <TableCell>{fmtDate(m.movementDate)}</TableCell>
                  <TableCell>{label(m.fromParentId)}</TableCell>
                  <TableCell>{label(m.toParentId)}</TableCell>
                  <TableCell align="right">{m.quantityMoved}</TableCell>
                  <TableCell>{m.reason || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
