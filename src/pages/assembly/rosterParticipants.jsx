import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Box, Grid, TextField, MenuItem, IconButton, Autocomplete, Button, Stack, Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { employeeService } from '../../services/employeeService';
import { studentService } from '../../services/studentService';

const arrayFrom = (r, ...keys) => (Array.isArray(r) ? r : keys.map((k) => r?.[k]).find(Array.isArray) || []);

// Picks the target for one participant row, by type (employee/student/class/text).
// Memoized: in a full week's roster there can be dozens of these (each an MUI
// Autocomplete, one of the heaviest components), so we only re-render the row a
// keystroke actually touches instead of the whole tree.
function TargetPickerBase({ type, targetId, targetName, targetText, onChange, classOptions, academicYearId, disabled }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  // Debounced remote search — one API call ~300ms after the user stops typing,
  // instead of one request per keystroke.
  const search = useCallback((q) => {
    if (type !== 'employee' && type !== 'student') return;
    if (timer.current) clearTimeout(timer.current);
    if (!q || q.length < 2) { setOptions([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (type === 'employee') {
          const r = await employeeService.searchEmployees({ name: q });
          setOptions(arrayFrom(r, 'employees', 'results').map((e) => ({ uuid: e.uuid, name: e.name })));
        } else {
          const r = await studentService.searchStudents({ name: q, academicYearId });
          setOptions(arrayFrom(r, 'students', 'results').map((s) => ({ uuid: s.uuid, name: s.name, className: s.className || s.class_name })));
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 300);
  }, [type, academicYearId]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

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
      renderOption={(props, o) => (
        <li {...props} key={o.uuid}>{o.name}{o.className ? <span style={{ color: '#8f9bb3', marginLeft: 4 }}>({o.className})</span> : ''}</li>
      )}
      value={value}
      onInputChange={(_e, v, reason) => { if (reason === 'input') search(v); }}
      onChange={(_e, v) => onChange({ targetId: v?.uuid || null, targetName: v?.name || null, targetText: null })}
      renderInput={(params) => <TextField {...params} placeholder={`Select ${type}`} />}
    />
  );
}
export const TargetPicker = memo(TargetPickerBase);

// One participant row (role + type + target + delete). Memoized so a change to a
// sibling row (or elsewhere on the day) doesn't re-render this row's Autocomplete.
const ParticipantRow = memo(function ParticipantRow({
  row, index, roleFixed, targetTypes, classOptions, academicYearId, disabled, onRowChange, onRemove,
}) {
  const onTarget = useCallback((patch) => onRowChange(index, patch), [onRowChange, index]);
  return (
    <Grid container spacing={1} alignItems="center">
      {!roleFixed && (
        <Grid item xs={12} sm={3}>
          <TextField size="small" fullWidth placeholder="Role" value={row.role || ''} disabled={disabled}
            onChange={(e) => onRowChange(index, { role: e.target.value })} />
        </Grid>
      )}
      <Grid item xs={12} sm={roleFixed ? 4 : 3}>
        <TextField size="small" select fullWidth value={row.targetType} disabled={disabled}
          onChange={(e) => onRowChange(index, { targetType: e.target.value, targetId: null, targetName: null, targetText: null })}>
          {targetTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={10} sm={roleFixed ? 7 : 5}>
        <TargetPicker type={row.targetType} targetId={row.targetId} targetName={row.targetName} targetText={row.targetText}
          onChange={onTarget} classOptions={classOptions} academicYearId={academicYearId} disabled={disabled} />
      </Grid>
      <Grid item xs={2} sm={1} textAlign="right">
        {!disabled && <IconButton size="small" color="error" onClick={() => onRemove(index)}><DeleteIcon fontSize="small" /></IconButton>}
      </Grid>
    </Grid>
  );
});

// An editable list of polymorphic participants. When roleFixed is set the role
// column is hidden (e.g. anchors, owners); otherwise a free-text role is shown.
// Memoized, with reference-stable row callbacks (via a rows ref) so only the
// edited row re-renders on a keystroke — the rest of the roster stays untouched.
export const ParticipantList = memo(function ParticipantList({
  value, onChange, targetTypes, classOptions, academicYearId, roleFixed = null,
  defaultType = 'student', addLabel = 'Add', disabled = false, emptyText = 'None',
}) {
  const rows = value || [];
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const onRowChange = useCallback(
    (i, patch) => onChange(rowsRef.current.map((r, j) => (j === i ? { ...r, ...patch } : r))),
    [onChange],
  );
  const onRemove = useCallback((i) => onChange(rowsRef.current.filter((_, j) => j !== i)), [onChange]);
  const add = useCallback(
    () => onChange([...rowsRef.current, { role: roleFixed || '', targetType: defaultType, targetId: null, targetName: null, targetText: null }]),
    [onChange, roleFixed, defaultType],
  );

  return (
    <Box>
      <Stack spacing={1}>
        {rows.length === 0 && <Typography variant="caption" color="text.disabled">{emptyText}</Typography>}
        {rows.map((r, i) => (
          <ParticipantRow
            key={i} row={r} index={i} roleFixed={roleFixed} targetTypes={targetTypes}
            classOptions={classOptions} academicYearId={academicYearId} disabled={disabled}
            onRowChange={onRowChange} onRemove={onRemove}
          />
        ))}
      </Stack>
      {!disabled && <Button size="small" startIcon={<AddIcon />} onClick={add} sx={{ mt: 1 }}>{addLabel}</Button>}
    </Box>
  );
});

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
