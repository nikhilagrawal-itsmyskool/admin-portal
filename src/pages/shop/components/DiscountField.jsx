import React from 'react';
import { Box, TextField, MenuItem, InputAdornment } from '@mui/material';

// A small controlled discount entry: mode (₹ off / % off / final ₹) + a number.
// value shape: { mode: 'amount' | 'percent' | 'final', amount: '' | number }

const round2 = (n) => Math.round(n * 100) / 100;

export const emptyDiscount = () => ({ mode: 'amount', amount: '' });

// Resolved discount amount (₹ off base), clamped to [0, base].
export function discountAmount(base, value) {
  const v = parseFloat(value?.amount);
  if (!value || value.amount === '' || isNaN(v)) return 0;
  let d = 0;
  if (value.mode === 'percent') d = base * v / 100;
  else if (value.mode === 'final') d = base - v;
  else d = v;
  return round2(Math.max(0, Math.min(d, base)));
}

export const payableFrom = (base, value) => round2(base - discountAmount(base, value));

// Payload for the assign / assign-bulk endpoints (exactly one field, or none).
export function discountPayload(value) {
  const v = parseFloat(value?.amount);
  if (!value || value.amount === '' || isNaN(v)) return {};
  if (value.mode === 'percent') return { discountPct: v };
  if (value.mode === 'final') return { finalAmount: v };
  return { discount: v };
}

export default function DiscountField({ base, value, onChange, size = 'small' }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <TextField select size={size} label="Discount" value={value.mode}
        onChange={e => set({ mode: e.target.value })} sx={{ width: 120 }}>
        <MenuItem value="amount">₹ off</MenuItem>
        <MenuItem value="percent">% off</MenuItem>
        <MenuItem value="final">Final ₹</MenuItem>
      </TextField>
      <TextField size={size} type="number" value={value.amount}
        onChange={e => set({ amount: e.target.value })} inputProps={{ min: 0 }} sx={{ width: 120 }}
        placeholder={value.mode === 'percent' ? '0' : '0.00'}
        InputProps={value.mode === 'percent' ? { endAdornment: <InputAdornment position="end">%</InputAdornment> } : undefined} />
    </Box>
  );
}
