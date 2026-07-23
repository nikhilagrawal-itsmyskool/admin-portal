import React from 'react';
import { Box, Typography, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';

// The doc's Diction & Pronunciation Check — a single choice.
export const DICTION_OPTIONS = ['Flawless', 'Average', 'Needs Heavy Correction'];

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
