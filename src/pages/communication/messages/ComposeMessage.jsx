import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Button, Alert, Chip,
  Autocomplete, FormControlLabel, Checkbox, Divider, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import {
  Send as SendIcon, Visibility as PreviewIcon, Add as AddIcon, Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { communicationService } from '../../../services/communicationService';
import { classService } from '../../../services/classService';
import { employeeService } from '../../../services/employeeService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';
import { maskPhone } from '../../../utils/mask';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';

export default function ComposeMessage() {
  const navigate = useNavigate();
  const can = useCan();
  const canSend = can(ACTIONS.COMMUNICATION_SEND);

  const [templateKeys, setTemplateKeys] = useState([]);
  const [classes, setClasses] = useState([]);
  const [roles, setRoles] = useState([]);

  const [templateKey, setTemplateKey] = useState('');
  const [language, setLanguage] = useState('en');
  const [forceChannel, setForceChannel] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const [studentAll, setStudentAll] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [employeeAll, setEmployeeAll] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [context, setContext] = useState([]); // [{ key, value }]
  const [studentDialog, setStudentDialog] = useState(false);
  const [employeeDialog, setEmployeeDialog] = useState(false);

  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [tpl, cls, rl] = await Promise.all([
          communicationService.listTemplates(),
          classService.getClasses(),
          employeeService.listRoles(),
        ]);
        const keys = [...new Set((tpl.templates || []).map((t) => t.key))];
        setTemplateKeys(keys);
        setClasses(Array.isArray(cls) ? cls : cls?.classes || []);
        setRoles(Array.isArray(rl) ? rl : rl?.roles || []);
      } catch { /* non-fatal; user can still type a key */ }
    })();
  }, []);

  const addContextRow = () => setContext((c) => [...c, { key: '', value: '' }]);
  const setContextField = (i, field, val) => setContext((c) => c.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  const removeContextRow = (i) => setContext((c) => c.filter((_, idx) => idx !== i));

  const addStudent = (s) => setSelectedStudents((prev) => (prev.some((x) => x.uuid === s.uuid) ? prev : [...prev, s]));
  const addEmployee = (e) => setSelectedEmployees((prev) => (prev.some((x) => x.uuid === e.uuid) ? prev : [...prev, e]));

  const buildAudience = () => {
    const audience = {};
    const students = {};
    if (studentAll) students.all = true;
    else {
      if (selectedClasses.length) students.classIds = selectedClasses.map((c) => c.uuid);
      if (selectedStudents.length) students.studentIds = selectedStudents.map((s) => s.uuid);
    }
    if (Object.keys(students).length) audience.students = students;

    const employees = {};
    if (employeeAll) employees.all = true;
    else {
      if (selectedRoles.length) employees.roleIds = selectedRoles.map((r) => r.uuid);
      if (selectedEmployees.length) employees.employeeIds = selectedEmployees.map((e) => e.uuid);
    }
    if (Object.keys(employees).length) audience.employees = employees;
    return audience;
  };

  const buildContext = () => {
    const obj = {};
    context.forEach((row) => { if (row.key.trim()) obj[row.key.trim()] = row.value; });
    return obj;
  };

  const validate = (audience) => {
    if (!templateKey.trim()) { setError('Template key is required'); return false; }
    if (!audience.students && !audience.employees) { setError('Select an audience'); return false; }
    return true;
  };

  const basePayload = () => {
    const ctx = buildContext();
    return {
      templateKey: templateKey.trim(),
      language: language || undefined,
      forceChannel: forceChannel || undefined,
      audience: buildAudience(),
      context: Object.keys(ctx).length ? ctx : undefined,
    };
  };

  const handlePreview = async () => {
    const payload = basePayload();
    if (!validate(payload.audience)) return;
    setBusy(true); setError(''); setPreview(null);
    try {
      const res = await communicationService.previewMessage(payload);
      setPreview(res);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to preview');
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    const payload = basePayload();
    if (!validate(payload.audience)) return;
    if (scheduledAt) payload.scheduledAt = new Date(scheduledAt).toISOString();
    setBusy(true); setError('');
    try {
      const res = await communicationService.sendMessage(payload);
      navigate(`/communication/messages/${res.jobId}`);
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to send');
    } finally {
      setBusy(false);
    }
  };

  if (!canSend) return <Alert severity="warning">You do not have permission to send messages.</Alert>;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Compose Message</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Message</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Autocomplete
                freeSolo
                options={templateKeys}
                value={templateKey}
                onChange={(_, v) => setTemplateKey(v || '')}
                onInputChange={(_, v) => setTemplateKey(v || '')}
                renderInput={(params) => <TextField {...params} label="Template key" size="small" />}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField fullWidth select size="small" label="Force channel (optional)" value={forceChannel} onChange={(e) => setForceChannel(e.target.value)}>
                <MenuItem value="">Preference-driven</MenuItem>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Audience</Typography>

          <Typography variant="subtitle2" sx={{ mt: 1 }}>Students</Typography>
          <FormControlLabel control={<Checkbox checked={studentAll} onChange={(e) => setStudentAll(e.target.checked)} />} label="All students" />
          {!studentAll && (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Autocomplete
                  multiple
                  options={classes}
                  getOptionLabel={(o) => o.name || ''}
                  isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                  value={selectedClasses}
                  onChange={(_, v) => setSelectedClasses(v)}
                  renderInput={(params) => <TextField {...params} label="By class" size="small" placeholder="Select classes" />}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button startIcon={<PersonAddIcon />} onClick={() => setStudentDialog(true)} variant="outlined" size="small">Add student</Button>
              </Grid>
              {selectedStudents.length > 0 && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedStudents.map((s) => (
                      <Chip key={s.uuid} label={s.name} onDelete={() => setSelectedStudents((prev) => prev.filter((x) => x.uuid !== s.uuid))} />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2">Employees</Typography>
          <FormControlLabel control={<Checkbox checked={employeeAll} onChange={(e) => setEmployeeAll(e.target.checked)} />} label="All employees" />
          {!employeeAll && (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Autocomplete
                  multiple
                  options={roles}
                  getOptionLabel={(o) => o.name || ''}
                  isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                  value={selectedRoles}
                  onChange={(_, v) => setSelectedRoles(v)}
                  renderInput={(params) => <TextField {...params} label="By role" size="small" placeholder="Select roles" />}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button startIcon={<PersonAddIcon />} onClick={() => setEmployeeDialog(true)} variant="outlined" size="small">Add employee</Button>
              </Grid>
              {selectedEmployees.length > 0 && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedEmployees.map((e) => (
                      <Chip key={e.uuid} label={e.name} onDelete={() => setSelectedEmployees((prev) => prev.filter((x) => x.uuid !== e.uuid))} />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Variables &amp; scheduling</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addContextRow}>Add variable</Button>
          </Box>
          {context.map((row, i) => (
            <Grid container spacing={1} key={i} sx={{ mb: 1 }} alignItems="center">
              <Grid item xs={5} md={4}><TextField fullWidth size="small" label="Name" value={row.key} onChange={(e) => setContextField(i, 'key', e.target.value)} /></Grid>
              <Grid item xs={6} md={7}><TextField fullWidth size="small" label="Value" value={row.value} onChange={(e) => setContextField(i, 'value', e.target.value)} /></Grid>
              <Grid item xs={1}><IconButton size="small" color="error" onClick={() => removeContextRow(i)}><DeleteIcon fontSize="small" /></IconButton></Grid>
            </Grid>
          ))}
          <TextField
            type="datetime-local"
            size="small"
            label="Schedule (optional)"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
            helperText="Leave empty to send immediately"
          />
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button variant="outlined" startIcon={<PreviewIcon />} onClick={handlePreview} disabled={busy}>Preview</Button>
        <Button variant="contained" startIcon={<SendIcon />} onClick={handleSend} disabled={busy}>{scheduledAt ? 'Schedule' : 'Send'}</Button>
      </Box>

      {preview && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Preview — {preview.targetCount} target(s)</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {Object.entries(preview.counts || {}).map(([k, v]) => <Chip key={k} size="small" label={`${k}: ${v}`} />)}
              <Chip size="small" variant="outlined" label={`channels: ${(preview.availableChannels || []).join(', ') || 'none'}`} />
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell><TableCell>Role</TableCell><TableCell>Channel</TableCell>
                    <TableCell>Number</TableCell><TableCell>Status</TableCell><TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(preview.recipients || []).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.recipientType}</TableCell>
                      <TableCell>{r.role || '-'}</TableCell>
                      <TableCell>{r.channel || '-'}</TableCell>
                      <TableCell>{r.toNumber ? maskPhone(r.toNumber) : '-'}</TableCell>
                      <TableCell><Chip size="small" label={r.status} color={r.status === 'pending' ? 'success' : 'default'} variant="outlined" /></TableCell>
                      <TableCell>{r.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <StudentSearchDialog open={studentDialog} onClose={() => setStudentDialog(false)} onSelect={addStudent} />
      <EmployeeSearchDialog open={employeeDialog} onClose={() => setEmployeeDialog(false)} onSelect={addEmployee} />
    </Box>
  );
}
