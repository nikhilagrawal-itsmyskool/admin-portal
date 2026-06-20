import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Alert,
  Chip,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { sportsService } from '../../../services/sportsService';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

export default function SportInchargeList() {
  const [sportTypes, setSportTypes] = useState([]);
  const [inchargesByType, setInchargesByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editDialog, setEditDialog] = useState({ open: false, sportType: '', label: '', employees: [] });
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [typesData, incharges] = await Promise.all([
        sportsService.getSportTypes(),
        sportsService.getIncharges(),
      ]);
      setSportTypes(typesData.sportTypes || []);
      const map = {};
      (incharges || []).forEach((row) => {
        if (!map[row.sportType]) map[row.sportType] = [];
        map[row.sportType].push({ uuid: row.inChargeId, name: row.inChargeName || 'Unknown' });
      });
      setInchargesByType(map);
    } catch (err) {
      setError('Failed to load in-charges');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (type) => {
    setEditDialog({
      open: true,
      sportType: type.value,
      label: type.label,
      employees: [...(inchargesByType[type.value] || [])],
    });
  };

  const closeEdit = () => setEditDialog({ open: false, sportType: '', label: '', employees: [] });

  const addEmployee = (employee) => {
    setEditDialog((prev) => {
      if (prev.employees.some((e) => e.uuid === employee.uuid)) return prev;
      return { ...prev, employees: [...prev.employees, { uuid: employee.uuid, name: employee.name }] };
    });
  };

  const removeEmployee = (uuid) => {
    setEditDialog((prev) => ({ ...prev, employees: prev.employees.filter((e) => e.uuid !== uuid) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await sportsService.setIncharges(editDialog.sportType, editDialog.employees.map((e) => e.uuid));
      closeEdit();
      await load();
    } catch (err) {
      setError('Failed to save in-charges');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Sport In-charges
      </Typography>
      <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 3 }}>
        Assign one or more staff members responsible for each sport's equipment.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        {loading && <LinearProgress />}
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600 } }}>
              <TableCell sx={{ width: 200 }}>Sport</TableCell>
              <TableCell>In-charges</TableCell>
              <TableCell align="right" sx={{ width: 100 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...sportTypes].sort((a, b) => {
              const rank = (v) => (v === 'general' ? 1 : v === 'other' ? 2 : 0);
              return rank(a.value) - rank(b.value) || a.label.localeCompare(b.label);
            }).map((type) => {
              const incharges = inchargesByType[type.value] || [];
              return (
                <TableRow key={type.value} hover>
                  <TableCell>{type.label}</TableCell>
                  <TableCell>
                    {incharges.length === 0 ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        No in-charge assigned
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {incharges.map((e) => (
                          <Chip key={e.uuid} label={e.name} size="small" />
                        ))}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(type)} title="Manage in-charges">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={editDialog.open} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle>In-charges — {editDialog.label}</DialogTitle>
        <DialogContent dividers>
          {editDialog.employees.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              No in-charges assigned yet.
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {editDialog.employees.map((e) => (
                <Box
                  key={e.uuid}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    border: '1px solid #e4e9f2',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2">{e.name}</Typography>
                  <IconButton size="small" color="error" onClick={() => removeEmployee(e.uuid)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
          <Button startIcon={<PersonAddIcon />} variant="outlined" size="small" onClick={() => setEmployeeSearchOpen(true)}>
            Add In-charge
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <EmployeeSearchDialog
        open={employeeSearchOpen}
        onClose={() => setEmployeeSearchOpen(false)}
        onSelect={addEmployee}
      />
    </Box>
  );
}
