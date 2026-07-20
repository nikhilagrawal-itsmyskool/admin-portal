import React, { useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, IconButton, Autocomplete, Button, Stack, Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { employeeService } from '../../services/employeeService';
import { studentService } from '../../services/studentService';

const arrayFrom = (r, ...keys) => (Array.isArray(r) ? r : keys.map((k) => r?.[k]).find(Array.isArray) || []);

// Picks the target for one participant row, by type (employee/student/class/text).
export function TargetPicker({ type, targetId, targetName, targetText, onChange, classOptions, academicYearId, disabled }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    if (type !== 'employee' && type !== 'student') return;
    if (!q || q.length < 2) { setOptions([]); return; }
    setLoading(true);
    try {
      if (type === 'employee') {
        const r = await employeeService.searchEmployees({ name: q });
        setOptions(arrayFrom(r, 'employees', 'results').map((e) => ({ uuid: e.uuid, name: e.name })));
      } else {
        const r = await studentService.searchStudents({ name: q, academicYearId });
        setOptions(arrayFrom(r, 'students', 'results').map((s) => ({ uuid: s.uuid, name: s.name })));
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  if (type === 'text') {
    return (
      <TextField size="small" fullWidth placeholder="e.g. House Captains" value={targetText || ''} disabled={disabled}
        onChange={(e) => onChange({ targetText: e.target.value, targetId: null, targetName: null })} />
    );
  }
  const staticOpts = type === 'class' ? (classOptions || []) : options;
  const value = targetId ? { uuid: targetId, name: targetName || '' } : null;
  return (
    <Autocomplete
      size="small" fullWidth disabled={disabled}
      options={staticOpts} loading={loading}
      getOptionLabel={(o) => o.name || ''} isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
      value={value}
      onInputChange={(_e, v, reason) => { if (reason === 'input') search(v); }}
      onChange={(_e, v) => onChange({ targetId: v?.uuid || null, targetName: v?.name || null, targetText: null })}
      renderInput={(params) => <TextField {...params} placeholder={`Select ${type}`} />}
    />
  );
}

// An editable list of polymorphic participants. When roleFixed is set the role
// column is hidden (e.g. anchors, owners); otherwise a free-text role is shown.
export function ParticipantList({
  value, onChange, targetTypes, classOptions, academicYearId, roleFixed = null,
  defaultType = 'student', addLabel = 'Add', disabled = false, emptyText = 'None',
}) {
  const rows = value || [];
  const setAt = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () => onChange([...rows, { role: roleFixed || '', targetType: defaultType, targetId: null, targetName: null, targetText: null }]);
  const remove = (i) => onChange(rows.filter((_, j) => j !== i));

  return (
    <Box>
      <Stack spacing={1}>
        {rows.length === 0 && <Typography variant="caption" color="text.disabled">{emptyText}</Typography>}
        {rows.map((r, i) => (
          <Grid container spacing={1} alignItems="center" key={i}>
            {!roleFixed && (
              <Grid item xs={12} sm={3}>
                <TextField size="small" fullWidth placeholder="Role" value={r.role || ''} disabled={disabled}
                  onChange={(e) => setAt(i, { role: e.target.value })} />
              </Grid>
            )}
            <Grid item xs={5} sm={roleFixed ? 4 : 3}>
              <TextField size="small" select fullWidth value={r.targetType} disabled={disabled}
                onChange={(e) => setAt(i, { targetType: e.target.value, targetId: null, targetName: null, targetText: null })}>
                {targetTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={roleFixed ? 7 : 5}>
              <TargetPicker type={r.targetType} targetId={r.targetId} targetName={r.targetName} targetText={r.targetText}
                onChange={(patch) => setAt(i, patch)} classOptions={classOptions} academicYearId={academicYearId} disabled={disabled} />
            </Grid>
            <Grid item xs={1} sm={1} textAlign="right">
              {!disabled && <IconButton size="small" color="error" onClick={() => remove(i)}><DeleteIcon fontSize="small" /></IconButton>}
            </Grid>
          </Grid>
        ))}
      </Stack>
      {!disabled && <Button size="small" startIcon={<AddIcon />} onClick={add} sx={{ mt: 1 }}>{addLabel}</Button>}
    </Box>
  );
}

// Read-model participant views → editable rows.
export const toRows = (views) => (views || []).map((v) => ({
  role: v.role || '', targetType: v.targetType, targetId: v.targetId || null,
  targetName: v.targetName || null, targetText: v.targetText || null,
}));

// Editable rows → save payload (drops blank rows; role optional).
export const toPayload = (rows, roleDefault) => (rows || [])
  .filter((r) => (r.targetType === 'text' ? (r.targetText || '').trim() : r.targetId))
  .map((r) => ({
    role: (r.role || roleDefault) || undefined,
    targetType: r.targetType,
    ...(r.targetType === 'text' ? { targetText: r.targetText.trim() } : { targetId: r.targetId }),
  }));
