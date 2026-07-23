import React, { useState } from 'react';
import { Box, Typography, Stack, ToggleButton, ToggleButtonGroup, Autocomplete, TextField } from '@mui/material';
import { studentService } from '../../services/studentService';

// The doc's Diction & Pronunciation Check — a single choice.
export const DICTION_OPTIONS = ['Flawless', 'Average', 'Needs Heavy Correction'];

// Star Presenter of the Day — pick a student (shows name + class) or, if none fits,
// type free text. Stored as a plain string either way (name + class when picked).
export function StarPresenterPicker({ value, onChange, academicYearId }) {
  const [options, setOptions] = useState([]);
  const search = async (q) => {
    if (!q || q.trim().length < 2) { setOptions([]); return; }
    try {
      const r = await studentService.searchStudents({ name: q, academicYearId });
      const list = Array.isArray(r) ? r : (r.students || r.results || []);
      setOptions(list.map((s) => {
        const cls = s.className || s.class_name;
        return cls ? `${s.name} (${cls})` : s.name;
      }));
    } catch { /* ignore */ }
  };
  return (
    <Autocomplete
      freeSolo size="small"
      options={options}
      value={value || ''}
      onInputChange={(_e, v) => { onChange(v); search(v); }}
      onChange={(_e, v) => onChange(v || '')}
      renderInput={(params) => <TextField {...params} label="Star presenter (pick a student or type — name, class & segment)" />}
    />
  );
}

// A 1..maxMarks segmented score picker per rubric metric ("circle the score").
// values: { [metricId]: number }. onScore(metricId, number|undefined) sets one.
export function MetricScorePicker({ metrics, values, onScore, disabled = false }) {
  return (
    <Stack spacing={1.5}>
      {metrics.map((m) => (
        <Box key={m.uuid}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>{m.name}</Typography>
          <ToggleButtonGroup
            exclusive size="small" disabled={disabled}
            value={values[m.uuid] ?? null}
            onChange={(_e, v) => onScore(m.uuid, v == null ? undefined : v)}
          >
            {Array.from({ length: m.maxMarks }, (_, i) => i + 1).map((n) => (
              <ToggleButton key={n} value={n} sx={{ px: 1.5, minWidth: 40 }}>{n}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      ))}
    </Stack>
  );
}

// Flawless / Average / Needs Heavy Correction — stored as the chosen label.
export function DictionPicker({ value, onChange, disabled = false }) {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.5 }}>Diction &amp; pronunciation check</Typography>
      <ToggleButtonGroup
        exclusive size="small" disabled={disabled}
        value={value || null}
        onChange={(_e, v) => onChange(v || '')}
      >
        {DICTION_OPTIONS.map((o) => (
          <ToggleButton key={o} value={o} sx={{ textTransform: 'none' }}>{o}</ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
