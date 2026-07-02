import React from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Stack,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";

// Mon–Sat only (schools run Mon–Sat). Sunday is intentionally omitted here.
const DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

// Edits class_subject / elective_band block_rules:
//   { blocks: [{ size, count, prefer?: [{ day, slot }] }], maxPerDay?, notTwiceSameDay? }
// Emits `undefined` when there are no blocks (backend then defaults to singles).
// Live-validates sum(size*count) === periodsPerWeek (matches backend timetable-util).
// The preferred day/period is a SOFT hint: the solver tries it first but may move
// the block to find a valid timetable. A block may prefer MULTIPLE days that all
// share ONE preferred period — stored as prefer: [{ day, slot }, ...] (same slot).
export default function BlockRulesEditor({ value, periodsPerWeek, onChange }) {
  const blocks = value?.blocks || [];
  const total = blocks.reduce(
    (sum, b) => sum + (Number(b.size) || 0) * (Number(b.count) || 0),
    0,
  );
  const ppw = Number(periodsPerWeek) || 0;

  const emit = (next) => {
    const hasBlocks = next.blocks && next.blocks.length > 0;
    const hasDayRules =
      next.maxPeriodsPerDay !== undefined && next.maxPeriodsPerDay !== "";
    if (!hasBlocks && !hasDayRules) {
      onChange(undefined);
      return;
    }
    // Drop an empty blocks array so a day-rules-only config is valid backend-side.
    onChange(hasBlocks ? next : { ...next, blocks: undefined });
  };

  const updateBlock = (idx, patch) => {
    const nextBlocks = blocks.map((b, i) =>
      i === idx ? { ...b, ...patch } : b,
    );
    emit({ ...value, blocks: nextBlocks });
  };
  const addBlock = () =>
    emit({ ...value, blocks: [...blocks, { size: 1, count: 1 }] });
  const removeBlock = (idx) =>
    emit({ ...value, blocks: blocks.filter((_, i) => i !== idx) });

  // The preferred start is stored as block.prefer = [{ day, slot }, ...] — one or
  // more days that all share the SAME preferred period (slot).
  const prefDays = (b) => [...new Set((b.prefer || []).map((p) => p.day))];
  const prefSlot = (b) => b.prefer?.[0]?.slot ?? "";
  // Rebuild the prefer array from the selected days + one shared slot.
  const writePrefer = (idx, days, slot) => {
    if (!days || days.length === 0) {
      updateBlock(idx, { prefer: undefined });
      return;
    }
    const s = slot === "" || slot == null ? 1 : Math.max(1, Number(slot) || 1);
    updateBlock(idx, { prefer: days.map((day) => ({ day, slot: s })) });
  };
  // Toggling days keeps the current shared period (defaults to 1 for the first day).
  const updatePreferDays = (idx, days) => writePrefer(idx, days, prefSlot(blocks[idx]));
  const updatePreferSlot = (idx, slot) =>
    writePrefer(idx, prefDays(blocks[idx]), slot);

  return (
    <Box sx={{ border: "1px solid #e4e9f2", borderRadius: 1, p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Block Rules (optional)
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "#8f9bb3", display: "block", mb: 1.5 }}
      >
        Leave empty for all single periods. A size-2 block is a double (two
        consecutive periods). Pref. days/period is an optional hint — pick one or
        more days that share the same period; the solver tries it first but may
        move the block.
      </Typography>

      <Stack spacing={1.5}>
        {blocks.map((b, idx) => (
          <Stack
            key={idx}
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <TextField
              size="small"
              type="number"
              label="Size"
              value={b.size}
              onChange={(e) =>
                updateBlock(idx, { size: Number(e.target.value) })
              }
              sx={{ width: 90 }}
            />
            <Typography variant="body2">×</Typography>
            <TextField
              size="small"
              type="number"
              label="Count"
              value={b.count}
              onChange={(e) =>
                updateBlock(idx, { count: Number(e.target.value) })
              }
              sx={{ width: 90 }}
            />
            <Typography variant="body2" sx={{ color: "#8f9bb3" }}>
              = {(Number(b.size) || 0) * (Number(b.count) || 0)} periods
            </Typography>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: "#8f9bb3", display: "block", mb: 0.25 }}
              >
                Pref. days
              </Typography>
              <ToggleButtonGroup
                size="small"
                value={prefDays(b)}
                onChange={(e, days) => updatePreferDays(idx, days)}
              >
                {DAY_OPTIONS.map((d) => (
                  <ToggleButton key={d.value} value={d.value}>
                    {d.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <TextField
              size="small"
              type="number"
              label="Pref. period"
              value={prefSlot(b)}
              onChange={(e) => updatePreferSlot(idx, e.target.value)}
              sx={{ width: 110 }}
              disabled={prefDays(b).length === 0}
            />
            <IconButton
              size="small"
              color="error"
              onClick={() => removeBlock(idx)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={addBlock}
          sx={{ alignSelf: "flex-start" }}
        >
          Add Block
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mt: 2 }}>
        <TextField
          size="small"
          type="number"
          label="Max periods per day"
          value={value?.maxPeriodsPerDay ?? ""}
          onChange={(e) =>
            emit({
              ...value,
              blocks,
              maxPeriodsPerDay:
                e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
          sx={{ width: 190 }}
          placeholder="2"
          helperText="Hard limit — never more than this many periods of the subject in one day (a double = 2). Default 2."
        />
      </Stack>
      <Typography
        variant="caption"
        sx={{ color: "#8f9bb3", display: "block", mt: 1 }}
      >
        The timetable already tries to keep each subject to one slot per day; a
        second slot happens only when needed.
      </Typography>

      {blocks.length > 0 && (
        <Alert severity={total === ppw ? "success" : "warning"} sx={{ mt: 2 }}>
          Block total = {total}; periods/week = {ppw}.
          {total === ppw ? " ✓ matches" : " must match before saving"}
        </Alert>
      )}
    </Box>
  );
}
