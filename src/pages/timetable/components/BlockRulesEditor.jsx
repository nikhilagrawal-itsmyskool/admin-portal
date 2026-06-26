import React from 'react';
import {
  Box, Typography, TextField, IconButton, Button, Stack, FormControlLabel, Checkbox, Alert,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 7, label: 'Sun' },
];

// Edits class_subject / elective_band block_rules:
//   { blocks: [{ size, count, prefer?: [{ day, slot }] }], maxPerDay?, notTwiceSameDay? }
// Emits `undefined` when there are no blocks (backend then defaults to singles).
// Live-validates sum(size*count) === periodsPerWeek (matches backend timetable-util).
// The preferred day/period is a SOFT hint: the solver tries it first but may move
// the block to find a valid timetable.
export default function BlockRulesEditor({ value, periodsPerWeek, onChange }) {
  const blocks = value?.blocks || [];
  const total = blocks.reduce((sum, b) => sum + (Number(b.size) || 0) * (Number(b.count) || 0), 0);
  const ppw = Number(periodsPerWeek) || 0;

  const emit = (next) => {
    if (!next.blocks || next.blocks.length === 0) { onChange(undefined); return; }
    onChange(next);
  };

  const updateBlock = (idx, patch) => {
    const nextBlocks = blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    emit({ ...value, blocks: nextBlocks });
  };
  const addBlock = () => emit({ ...value, blocks: [...blocks, { size: 1, count: 1 }] });
  const removeBlock = (idx) => emit({ ...value, blocks: blocks.filter((_, i) => i !== idx) });

  // The preferred start is stored as block.prefer = [{ day, slot }] (one hint per block).
  const prefDay = (b) => b.prefer?.[0]?.day ?? '';
  const prefSlot = (b) => b.prefer?.[0]?.slot ?? '';
  const updatePrefer = (idx, day, slot) => {
    const d = day === '' ? undefined : Number(day);
    // No day = no hint. Picking a day defaults the period to 1 so the choice
    // persists and the period field enables; the user can then adjust it.
    if (!d) { updateBlock(idx, { prefer: undefined }); return; }
    const s = slot === '' || slot == null ? 1 : Math.max(1, Number(slot) || 1);
    updateBlock(idx, { prefer: [{ day: d, slot: s }] });
  };

  return (
    <Box sx={{ border: '1px solid #e4e9f2', borderRadius: 1, p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Block Rules (optional)</Typography>
      <Typography variant="caption" sx={{ color: '#8f9bb3', display: 'block', mb: 1.5 }}>
        Leave empty for all single periods. A size-2 block is a double (two consecutive periods).
        Pref. day/period is an optional hint — the solver tries it first but may move the block.
      </Typography>

      <Stack spacing={1.5}>
        {blocks.map((b, idx) => (
          <Stack key={idx} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField size="small" type="number" label="Size" value={b.size}
              onChange={(e) => updateBlock(idx, { size: Number(e.target.value) })} sx={{ width: 90 }} />
            <Typography variant="body2">×</Typography>
            <TextField size="small" type="number" label="Count" value={b.count}
              onChange={(e) => updateBlock(idx, { count: Number(e.target.value) })} sx={{ width: 90 }} />
            <Typography variant="body2" sx={{ color: '#8f9bb3' }}>= {(Number(b.size) || 0) * (Number(b.count) || 0)} periods</Typography>
            <TextField size="small" select label="Pref. day" value={prefDay(b)}
              onChange={(e) => updatePrefer(idx, e.target.value, prefSlot(b))} sx={{ width: 110 }}>
              <MenuItem value="">None</MenuItem>
              {DAY_OPTIONS.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" label="Pref. period" value={prefSlot(b)}
              onChange={(e) => updatePrefer(idx, prefDay(b), e.target.value)} sx={{ width: 110 }} disabled={!prefDay(b)} />
            <IconButton size="small" color="error" onClick={() => removeBlock(idx)}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addBlock} sx={{ alignSelf: 'flex-start' }}>Add Block</Button>
      </Stack>

      {blocks.length > 0 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <TextField size="small" type="number" label="Max per day" value={value?.maxPerDay ?? ''}
              onChange={(e) => emit({ ...value, blocks, maxPerDay: e.target.value === '' ? undefined : Number(e.target.value) })} sx={{ width: 130 }} />
            <FormControlLabel control={
              <Checkbox checked={!!value?.notTwiceSameDay}
                onChange={(e) => emit({ ...value, blocks, notTwiceSameDay: e.target.checked })} />
            } label="Not twice same day" />
          </Stack>
          <Alert severity={total === ppw ? 'success' : 'warning'} sx={{ mt: 2 }}>
            Block total = {total}; periods/week = {ppw}.{total === ppw ? ' ✓ matches' : ' must match before saving'}
          </Alert>
        </>
      )}
    </Box>
  );
}
