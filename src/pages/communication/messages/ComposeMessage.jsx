import React, { useState, useEffect, useMemo } from 'react';
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
import { transportService } from '../../../services/transportService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';
import { maskPhone } from '../../../utils/mask';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';

export default function ComposeMessage() {
  const navigate = useNavigate();
  const can = useCan();
  const canSend = can(ACTIONS.COMMUNICATION_SEND);

  const [templates, setTemplates] = useState([]);
  const [templateKeys, setTemplateKeys] = useState([]);
  const [autoVarsAll, setAutoVarsAll] = useState([]);
  const [autoVarsByType, setAutoVarsByType] = useState({ common: [], student: [], employee: [] });
  const [classes, setClasses] = useState([]);
  const [roles, setRoles] = useState([]);
  const [routes, setRoutes] = useState([]);

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
  const [selectedRoutes, setSelectedRoutes] = useState([]);

  const [context, setContext] = useState([]); // [{ key, value }]
  const [studentDialog, setStudentDialog] = useState(false);
  const [employeeDialog, setEmployeeDialog] = useState(false);

  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [tpl, cls, rl, vars, rts] = await Promise.all([
          communicationService.listTemplates(),
          classService.getClasses(),
          employeeService.listRoles(),
          communicationService.getVariables(),
          transportService.getRoutes().catch(() => []),
        ]);
        const list = tpl.templates || [];
        setTemplates(list);
        setTemplateKeys([...new Set(list.map((t) => t.key))]);
        setAutoVarsAll(vars.autoVariablesAll || []);
        setAutoVarsByType(vars.autoVariables || { common: [], student: [], employee: [] });
        setClasses(Array.isArray(cls) ? cls : cls?.classes || []);
        setRoles(Array.isArray(rl) ? rl : rl?.roles || []);
        setRoutes(Array.isArray(rts) ? rts : rts?.routes || []);
      } catch { /* non-fatal; user can still type a key */ }
    })();
  }, []);

  // Active template matching the current key + language (prefer exact language,
  // then any). Drives which variables the sender is prompted for.
  const selectedTemplate = useMemo(() => {
    const key = templateKey.trim();
    if (!key) return null;
    const matches = templates.filter((t) => t.key === key && (t.status ? t.status === 'active' : true));
    if (!matches.length) return null;
    return matches.find((t) => (t.language || 'en') === (language || 'en')) || matches[0];
  }, [templateKey, language, templates]);

  const templateVars = Array.isArray(selectedTemplate?.variables) ? selectedTemplate.variables : [];
  const requiredVars = templateVars.filter((v) => !autoVarsAll.includes(v));
  const autoFilledVars = templateVars.filter((v) => autoVarsAll.includes(v));

  // Variables that are auto-filled for ONE recipient type only (recipientName is
  // shared, so it doesn't constrain the audience).
  const studentOnlyVars = useMemo(
    () => (autoVarsByType.student || []).filter((v) => !(autoVarsByType.common || []).includes(v) && !(autoVarsByType.employee || []).includes(v)),
    [autoVarsByType],
  );
  const employeeOnlyVars = useMemo(
    () => (autoVarsByType.employee || []).filter((v) => !(autoVarsByType.common || []).includes(v) && !(autoVarsByType.student || []).includes(v)),
    [autoVarsByType],
  );

  // Which recipient type(s) this template can actually fill. A template using
  // studentName/admissionNumber only resolves for students; employeeName only for
  // employees; otherwise it works for anyone.
  const templateAudience = useMemo(() => {
    if (!selectedTemplate) return null;
    const needsStudent = templateVars.some((v) => studentOnlyVars.includes(v));
    const needsEmployee = templateVars.some((v) => employeeOnlyVars.includes(v));
    if (needsStudent && needsEmployee) return 'conflict';
    if (needsStudent) return 'student';
    if (needsEmployee) return 'employee';
    return 'any';
  }, [selectedTemplate, templateVars, studentOnlyVars, employeeOnlyVars]);

  // What the chosen audience targets. Transport routes reach BOTH students
  // (families) and employees (route staff).
  const targetsStudents = studentAll || selectedClasses.length > 0 || selectedStudents.length > 0 || selectedRoutes.length > 0;
  const targetsEmployees = employeeAll || selectedRoles.length > 0 || selectedEmployees.length > 0 || selectedRoutes.length > 0;

  // Warn when the audience includes a recipient type the template can't fill —
  // those recipients would be silently skipped (missing variables) at send.
  const audienceWarning = useMemo(() => {
    if (!selectedTemplate) return '';
    if (templateAudience === 'student' && targetsEmployees) {
      return 'This template uses student-only fields (e.g. studentName) — employee / route-staff recipients will be skipped.';
    }
    if (templateAudience === 'employee' && targetsStudents) {
      return 'This template uses employee-only fields (e.g. employeeName) — student / family recipients will be skipped.';
    }
    return '';
  }, [selectedTemplate, templateAudience, targetsStudents, targetsEmployees]);

  // DLT caps each SMS variable at 40 chars; enforce only when an SMS template
  // exists for this key (WhatsApp-only free-text templates are exempt).
  const hasSmsChannel = useMemo(() => {
    const key = templateKey.trim();
    return templates.some((t) => t.key === key && t.channel === 'sms' && (t.status ? t.status === 'active' : true));
  }, [templateKey, templates]);
  const valueMaxLen = hasSmsChannel ? 40 : undefined;

  // Live body preview: substitute typed values into the template's bodyPreview,
  // leaving auto-injected vars as {name} placeholders (they vary per recipient).
  const manualValues = useMemo(() => {
    const m = {};
    context.forEach((r) => { if (r.key.trim()) m[r.key.trim()] = r.value; });
    return m;
  }, [context]);
  const livePreview = useMemo(() => {
    const tpl = selectedTemplate?.bodyPreview;
    if (!tpl) return '';
    return tpl.replace(/\{(\w+)\}/g, (match, name) => (autoVarsAll.includes(name) ? match : (manualValues[name] || match)));
  }, [selectedTemplate, manualValues, autoVarsAll]);

  const audienceChip = { student: 'Students only', employee: 'Employees only', any: 'Any recipient', conflict: 'Mixed fields — check variables' };

  // On selecting a known template, prefill the variable rows with its required
  // (sender-supplied) names — locked — preserving any values already typed.
  // Auto-injected variables (recipientName, studentName, …) are omitted.
  useEffect(() => {
    if (!selectedTemplate) return;
    const vars = Array.isArray(selectedTemplate.variables) ? selectedTemplate.variables : [];
    const required = vars.filter((v) => !autoVarsAll.includes(v));
    setContext((prev) => required.map((name) => {
      const existing = prev.find((r) => r.key === name);
      return { key: name, value: existing ? existing.value : '', locked: true };
    }));
  }, [selectedTemplate, autoVarsAll]);

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

    if (selectedRoutes.length) audience.transport = { routeIds: selectedRoutes.map((r) => r.uuid) };
    return audience;
  };

  const buildContext = () => {
    const obj = {};
    context.forEach((row) => { if (row.key.trim()) obj[row.key.trim()] = row.value; });
    return obj;
  };

  const validate = (audience) => {
    if (!templateKey.trim()) { setError('Template key is required'); return false; }
    if (!audience.students && !audience.employees && !audience.transport) { setError('Select an audience'); return false; }
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

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2">Transport routes</Typography>
          <Typography variant="caption" color="text.secondary">
            Reaches every student assigned to the route (via their family contacts) plus the route&apos;s staff — accompanying teacher, helper and incharge.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={routes}
                getOptionLabel={(o) => `${o.name || ''}${o.direction ? ` (${o.direction})` : ''}${o.vehicleRegistrationNumber ? ` · ${o.vehicleRegistrationNumber}` : ''}`}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                value={selectedRoutes}
                onChange={(_, v) => setSelectedRoutes(v)}
                renderInput={(params) => <TextField {...params} label="By route" size="small" placeholder="Select transport routes" />}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6">Variables &amp; scheduling</Typography>
              {selectedTemplate && templateAudience && (
                <Chip
                  size="small" variant="outlined"
                  color={templateAudience === 'any' ? 'default' : (templateAudience === 'conflict' ? 'warning' : 'info')}
                  label={audienceChip[templateAudience]}
                />
              )}
            </Box>
            {!selectedTemplate && <Button size="small" startIcon={<AddIcon />} onClick={addContextRow}>Add variable</Button>}
          </Box>

          {audienceWarning && (
            <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>{audienceWarning}</Alert>
          )}

          {livePreview && (
            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
              <Box sx={{ whiteSpace: 'pre-wrap' }}>{livePreview}</Box>
              {hasSmsChannel && (
                <Typography variant="caption" color={livePreview.length > 160 ? 'error' : 'text.secondary'} sx={{ display: 'block', mt: 0.5 }}>
                  {livePreview.length} chars{livePreview.length > 160 ? ' — over 160, sends as multiple SMS' : ''} · auto-filled values vary per recipient
                </Typography>
              )}
            </Alert>
          )}

          {selectedTemplate && autoFilledVars.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Filled automatically per recipient:</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {autoFilledVars.map((v) => <Chip key={v} size="small" variant="outlined" label={v} />)}
              </Box>
            </Box>
          )}

          {selectedTemplate && requiredVars.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              This template has no variables to fill.
            </Typography>
          )}

          {context.map((row, i) => {
            const meta = selectedTemplate?.variableMeta?.[row.key] || {};
            const suggestions = Array.isArray(meta.suggestions) ? meta.suggestions : [];
            const helper = [meta.hint || '', valueMaxLen ? `${(row.value || '').length}/${valueMaxLen}` : '']
              .filter(Boolean).join(' · ');
            return (
              <Grid container spacing={1} key={i} sx={{ mb: 1 }} alignItems="flex-start">
                <Grid item xs={row.locked ? 5 : 5} md={4}>
                  <TextField
                    fullWidth size="small" label="Name" value={row.key}
                    onChange={(e) => setContextField(i, 'key', e.target.value)}
                    InputProps={{ readOnly: !!row.locked }}
                  />
                </Grid>
                <Grid item xs={row.locked ? 7 : 6} md={row.locked ? 8 : 7}>
                  <Autocomplete
                    freeSolo
                    options={suggestions}
                    value={row.value || ''}
                    onChange={(_, v) => setContextField(i, 'value', v || '')}
                    onInputChange={(_, v) => setContextField(i, 'value', v)}
                    renderInput={(params) => (
                      <TextField
                        {...params} fullWidth size="small" label="Value"
                        helperText={helper || undefined}
                        inputProps={{ ...params.inputProps, maxLength: valueMaxLen }}
                      />
                    )}
                  />
                </Grid>
                {!row.locked && (
                  <Grid item xs={1}><IconButton size="small" color="error" onClick={() => removeContextRow(i)}><DeleteIcon fontSize="small" /></IconButton></Grid>
                )}
              </Grid>
            );
          })}
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
