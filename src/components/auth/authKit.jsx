import React from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Person as EmployeeIcon, School as StudentIcon } from '@mui/icons-material';

// Shared visual kit for the pre-auth screens (Login + ForgotPassword) so they read as
// one "institutional" front door, tuned to the app's own palette: navy #222b45 (the
// sidebar colour) marks the selected choice, blue #3366ff (theme primary) is the
// primary action, with a single gold hairline as the one warm accent. Serif title.

export const AUTH = {
  navy: '#222b45',
  navyInk: '#161d31',
  gold: '#b8841c',
  ink: '#222b45',
  muted: '#8f9bb3',
  muted2: '#aab2c4',
  line: '#e5e9f1',
  idle: '#f6f8fb',
  serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
};

// Full-height, centred page background matching the app's default background.
export const authPageSx = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(120% 90% at 50% -10%, #e9edf4, #dde3ee)',
  p: 2,
};

export const authCardSx = {
  maxWidth: 400,
  width: '100%',
  borderRadius: '12px',
};

// Uppercase caption that sits above each field/toggle.
export function FieldCaption({ children, sx }) {
  return (
    <Typography
      component="span"
      sx={{
        display: 'block', color: AUTH.muted, fontSize: 11, fontWeight: 700,
        letterSpacing: '.07em', textTransform: 'uppercase', mb: 1, ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

// Serif wordmark + gold hairline + subtitle + neutral school badge.
export function BrandHeader({ title, sub, badge, titleSize = 26 }) {
  return (
    <Box sx={{ textAlign: 'center', mb: 2.5 }}>
      <Typography sx={{ fontFamily: AUTH.serif, fontWeight: 700, fontSize: titleSize, color: AUTH.ink, lineHeight: 1.15 }}>
        {title}
      </Typography>
      <Box sx={{ width: 44, height: '2px', bgcolor: AUTH.gold, borderRadius: 1, mx: 'auto', mt: 1.5 }} />
      {sub && <Typography sx={{ color: AUTH.muted, fontSize: 13, mt: 1.25 }}>{sub}</Typography>}
      {badge && (
        <Box
          component="span"
          sx={{
            display: 'inline-block', mt: 1.5, px: 1.5, py: '3px', borderRadius: '6px',
            bgcolor: AUTH.idle, border: `1px solid ${AUTH.line}`, color: AUTH.ink,
            fontSize: 11, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase',
          }}
        >
          {badge}
        </Box>
      )}
    </Box>
  );
}

// Outlined text field styling (rounded, 1.5px border, blue focus ring). Spread onto a
// MUI <TextField hiddenLabel /> so the field shows a caption above instead of a
// floating label.
export const authFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '9px',
    backgroundColor: '#fff',
    '& fieldset': { borderColor: AUTH.line, borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: AUTH.muted2 },
    '&.Mui-focused fieldset': { borderColor: '#3366ff', borderWidth: '1.5px' },
  },
  '& .MuiOutlinedInput-input': { padding: '13px 14px', fontSize: '15px' },
  '& .MuiInputBase-inputAdornedEnd': { paddingRight: 0 },
};

export const authCtaSx = {
  mt: 2.5, py: 1.5, borderRadius: '8px', fontSize: 15, fontWeight: 700, textTransform: 'none',
  boxShadow: '0 10px 22px -12px #3366ff',
};

const toggleGroupSx = {
  gap: '8px',
  '& .MuiToggleButtonGroup-grouped': {
    flex: 1, margin: 0, border: `1.5px solid ${AUTH.line}`, borderRadius: '9px',
    '&:not(:first-of-type)': { marginLeft: 0, borderLeft: `1.5px solid ${AUTH.line}` },
  },
};

const toggleButtonSx = {
  flex: 1, py: 1.25, gap: 1, textTransform: 'none', fontSize: '14.5px', fontWeight: 600,
  color: AUTH.ink, backgroundColor: AUTH.idle, borderColor: AUTH.line,
  '&:hover': { borderColor: AUTH.muted2, backgroundColor: AUTH.idle },
  '&.Mui-selected': {
    backgroundColor: AUTH.navy, color: '#fff', borderColor: AUTH.navy,
    '&:hover': { backgroundColor: AUTH.navyInk, borderColor: AUTH.navyInk },
  },
  '& svg': { fontSize: 18 },
};

// Employee / Student segmented control. `showStudent={false}` (mobile) renders a single
// locked Employee pill. Value/onChange use 'employee' | 'student' (as the app does);
// callers map that to the recovery userType if needed.
export function UserTypeToggle({ value, onChange, disabled = false, showStudent = true }) {
  if (!showStudent) {
    return (
      <ToggleButtonGroup value="employee" exclusive fullWidth sx={toggleGroupSx}>
        <ToggleButton value="employee" selected sx={toggleButtonSx}>
          <EmployeeIcon /> Employee
        </ToggleButton>
      </ToggleButtonGroup>
    );
  }
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      fullWidth
      disabled={disabled}
      onChange={(_, v) => v && onChange(v)}
      sx={toggleGroupSx}
    >
      <ToggleButton value="employee" sx={toggleButtonSx}>
        <EmployeeIcon /> Employee
      </ToggleButton>
      <ToggleButton value="student" sx={toggleButtonSx}>
        <StudentIcon /> Student
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
