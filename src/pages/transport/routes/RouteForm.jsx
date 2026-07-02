import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Alert, Autocomplete,
  CircularProgress, Divider, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Chip, Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Save as SaveIcon, ArrowUpward as UpIcon, ArrowDownward as DownIcon,
  Delete as DeleteIcon, Add as AddIcon, ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { transportService } from '../../../services/transportService';
import { employeeService } from '../../../services/employeeService';
import { useCan } from '../../../permissions/can';

export default function RouteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const can = useCan();
  const canManage = can('transport.manage');

  const [form, setForm] = useState({
    name: '', direction: 'morning', vehicleId: '',
    accompanyingTeacherId: '', helperId: '', routeInchargeId: '',
    driverName: '', driverPhone: '', conductorName: '', conductorPhone: '',
  });
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stops, setStops] = useState([]); // ordered route stops (edit mode)
  const [allStops, setAllStops] = useState([]); // stop master for the add picker
  const [addStopValue, setAddStopValue] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [veh, emps, stopMaster] = await Promise.all([
          transportService.getVehicles(),
          employeeService.searchEmployees(),
          transportService.getStops(),
        ]);
        setVehicles(veh || []);
        setEmployees(emps || []);
        setAllStops(stopMaster || []);
        if (isEdit) {
          const r = await transportService.getRoute(id);
          setForm({
            name: r.name || '', direction: r.direction || 'morning', vehicleId: r.vehicleId || '',
            accompanyingTeacherId: r.accompanyingTeacherId || '', helperId: r.helperId || '',
            routeInchargeId: r.routeInchargeId || '',
            driverName: r.driverName || '', driverPhone: r.driverPhone || '',
            conductorName: r.conductorName || '', conductorPhone: r.conductorPhone || '',
          });
          setStops(r.stops || []);
        }
      } catch {
        setError('Failed to load route data');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const selectedVehicle = vehicles.find((v) => v.uuid === form.vehicleId) || null;
  const empValue = (fid) => employees.find((e) => e.uuid === form[fid]) || null;
  const setEmp = (fid) => (_, v) => setForm({ ...form, [fid]: v?.uuid || '' });

  const copyContactsFromVehicle = () => {
    if (!selectedVehicle) return;
    setForm((f) => ({
      ...f,
      driverName: selectedVehicle.driverName || '', driverPhone: selectedVehicle.driverPhone || '',
      conductorName: selectedVehicle.conductorName || '', conductorPhone: selectedVehicle.conductorPhone || '',
    }));
  };

  const saveRoute = async () => {
    if (!form.name.trim()) { setError('Route name is required'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      if (isEdit) {
        await transportService.updateRoute(id, {
          name: form.name.trim(), vehicleId: form.vehicleId || null,
          accompanyingTeacherId: form.accompanyingTeacherId || null,
          helperId: form.helperId || null, routeInchargeId: form.routeInchargeId || null,
          driverName: form.driverName || null, driverPhone: form.driverPhone || null,
          conductorName: form.conductorName || null, conductorPhone: form.conductorPhone || null,
        });
        setSuccess('Route saved');
      } else {
        const created = await transportService.createRoute({
          name: form.name.trim(), direction: form.direction, vehicleId: form.vehicleId || undefined,
          accompanyingTeacherId: form.accompanyingTeacherId || undefined,
          helperId: form.helperId || undefined, routeInchargeId: form.routeInchargeId || undefined,
        });
        navigate(`/transport/routes/${created.uuid}`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  // ── stop management (edit mode) ──
  const refreshStops = (result) => setStops(result.stops || []);

  const addStop = async () => {
    if (!addStopValue) return;
    setError('');
    try {
      const res = await transportService.addRouteStops(id, [{ stopId: addStopValue.uuid }]);
      refreshStops(res);
      setAddStopValue(null);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to add stop');
    }
  };

  const removeStop = async (routeStopId) => {
    setError('');
    try {
      const res = await transportService.removeRouteStop(id, routeStopId);
      refreshStops(res);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to remove stop');
    }
  };

  const move = async (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= stops.length) return;
    const order = stops.map((s) => s.uuid);
    [order[index], order[target]] = [order[target], order[index]];
    setError('');
    try {
      const res = await transportService.reorderRouteStops(id, order);
      refreshStops(res);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to reorder');
    }
  };

  const onRouteStopIds = new Set(stops.map((s) => s.stopId));
  const availableStops = allStops.filter((s) => !onRouteStopIds.has(s.uuid));

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/transport/routes')}>Back</Button>
        <Typography variant="h4">{isEdit ? 'Manage Route' : 'Add Route'}</Typography>
        {isEdit && <Chip size="small" label={form.direction === 'morning' ? 'Morning' : 'Evening'}
          color={form.direction === 'morning' ? 'warning' : 'info'} variant="outlined" />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Route Name" value={form.name} onChange={set('name')} size="small" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth select label="Direction" value={form.direction} onChange={set('direction')} size="small" disabled={isEdit}>
                <MenuItem value="morning">Morning (Pickup)</MenuItem>
                <MenuItem value="evening">Evening (Drop)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Autocomplete
                options={vehicles}
                getOptionLabel={(o) => `${o.registrationNumber}${o.makeModel ? ` — ${o.makeModel}` : ''}`}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={selectedVehicle}
                onChange={(_, v) => setForm({ ...form, vehicleId: v?.uuid || '' })}
                renderInput={(params) => <TextField {...params} label="Vehicle" size="small" />}
              />
            </Grid>

            {selectedVehicle && (
              <Grid item xs={12}>
                <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                  Vehicle driver: <b>{selectedVehicle.driverName || '-'}</b> ({selectedVehicle.driverPhone || '-'}) ·
                  {' '}conductor: <b>{selectedVehicle.conductorName || '-'}</b> ({selectedVehicle.conductorPhone || '-'})
                  {isEdit && (
                    <Button size="small" startIcon={<CopyIcon />} onClick={copyContactsFromVehicle} sx={{ ml: 1 }}>
                      Copy to route
                    </Button>
                  )}
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} sm={4}>
              <Autocomplete options={employees} getOptionLabel={(o) => o.name || ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid} value={empValue('accompanyingTeacherId')}
                onChange={setEmp('accompanyingTeacherId')}
                renderInput={(params) => <TextField {...params} label="Accompanying Teacher" size="small" />} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Autocomplete options={employees} getOptionLabel={(o) => o.name || ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid} value={empValue('helperId')}
                onChange={setEmp('helperId')}
                renderInput={(params) => <TextField {...params} label="Helper" size="small" />} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Autocomplete options={employees} getOptionLabel={(o) => o.name || ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid} value={empValue('routeInchargeId')}
                onChange={setEmp('routeInchargeId')}
                renderInput={(params) => <TextField {...params} label="Route In-charge" size="small" />} />
            </Grid>

            {isEdit && (
              <>
                <Grid item xs={12}><Divider textAlign="left"><Typography variant="caption">Driver / Conductor on this route (prefilled from vehicle, editable)</Typography></Divider></Grid>
                <Grid item xs={12} sm={3}><TextField fullWidth label="Driver Name" value={form.driverName} onChange={set('driverName')} size="small" /></Grid>
                <Grid item xs={12} sm={3}><TextField fullWidth label="Driver Phone" value={form.driverPhone} onChange={set('driverPhone')} size="small" /></Grid>
                <Grid item xs={12} sm={3}><TextField fullWidth label="Conductor Name" value={form.conductorName} onChange={set('conductorName')} size="small" /></Grid>
                <Grid item xs={12} sm={3}><TextField fullWidth label="Conductor Phone" value={form.conductorPhone} onChange={set('conductorPhone')} size="small" /></Grid>
              </>
            )}

            <Grid item xs={12}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={saveRoute} disabled={saving || !canManage}>
                {saving ? 'Saving...' : (isEdit ? 'Save Route' : 'Create Route & Add Stops')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isEdit && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Stops (in order)</Typography>

            {canManage && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                <Autocomplete
                  sx={{ minWidth: 280 }}
                  options={availableStops}
                  getOptionLabel={(o) => `${o.name}${o.km != null ? ` (${o.km} km)` : ''}`}
                  isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                  value={addStopValue}
                  onChange={(_, v) => setAddStopValue(v)}
                  renderInput={(params) => <TextField {...params} label="Add a stop" size="small" />}
                />
                <Button variant="outlined" startIcon={<AddIcon />} onClick={addStop} disabled={!addStopValue}>Add</Button>
              </Box>
            )}

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 60 }}>Seq</TableCell>
                  <TableCell>Stop</TableCell>
                  <TableCell sx={{ width: 90 }}>Km</TableCell>
                  <TableCell sx={{ width: 140 }} align="right">Order</TableCell>
                  {canManage && <TableCell sx={{ width: 60 }} />}
                </TableRow>
              </TableHead>
              <TableBody>
                {stops.length === 0 ? (
                  <TableRow><TableCell colSpan={canManage ? 5 : 4} align="center">No stops on this route yet</TableCell></TableRow>
                ) : stops.map((s, i) => (
                  <TableRow key={s.uuid}>
                    <TableCell>{s.sequence}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.km ?? '-'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Move up"><span>
                        <IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0 || !canManage}><UpIcon fontSize="small" /></IconButton>
                      </span></Tooltip>
                      <Tooltip title="Move down"><span>
                        <IconButton size="small" onClick={() => move(i, 1)} disabled={i === stops.length - 1 || !canManage}><DownIcon fontSize="small" /></IconButton>
                      </span></Tooltip>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <IconButton size="small" color="error" title="Remove" onClick={() => removeStop(s.uuid)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
