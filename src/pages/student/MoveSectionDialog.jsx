import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Chip,
  Stack,
  Typography,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
} from '@mui/material';
import { SwapHoriz as MoveIcon, WarningAmberRounded as WarnIcon } from '@mui/icons-material';
import { studentService } from '../../services/studentService';

// Move a single student to another section of the same grade (same academic year).
// Opens against a student; loads current enrolment + sibling sections, then applies
// an in-place move. onMoved() lets the caller refresh the 360.
export default function MoveSectionDialog({ open, studentId, studentName, onClose, onMoved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [opts, setOpts] = useState(null); // { student, current, targets: [] }
  const [toClassId, setToClassId] = useState('');
  const [rollMode, setRollMode] = useState('auto'); // 'auto' | 'manual'
  const [manualRoll, setManualRoll] = useState('');

  useEffect(() => {
    if (!open || !studentId) return;
    let cancelled = false;
    const ctrl = new AbortController();
    setLoading(true);
    setError('');
    setOpts(null);
    setToClassId('');
    setRollMode('auto');
    setManualRoll('');
    studentService
      .getMoveSectionOptions(studentId, ctrl.signal)
      .then((data) => {
        if (cancelled) return;
        setOpts(data);
        if (!data.targets || data.targets.length === 0) {
          setError('No other section in this grade to move to.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.error?.description || 'Could not load section options');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [open, studentId]);

  const target = (opts?.targets || []).find((t) => t.classId === toClassId) || null;
  const chosenRoll =
    rollMode === 'manual'
      ? manualRoll === '' ? null : parseInt(manualRoll, 10)
      : target ? target.nextRoll : null;

  const canMove = !!toClassId && !saving && (rollMode === 'auto' || manualRoll === '' || Number(manualRoll) > 0);

  const handleMove = async () => {
    if (!canMove) return;
    setSaving(true);
    setError('');
    try {
      const res = await studentService.moveSection({
        studentId,
        toClassId,
        autoRoll: rollMode === 'auto',
        rollNumber: rollMode === 'manual' ? (manualRoll === '' ? null : parseInt(manualRoll, 10)) : undefined,
      });
      onMoved?.(res);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.error?.description || 'Failed to move the student');
    } finally {
      setSaving(false);
    }
  };

  const cur = opts?.current;
  const name = studentName || opts?.student?.name || 'this student';

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MoveIcon fontSize="small" color="primary" /> Move to another section
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={26} />
          </Box>
        ) : (
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {cur && (
              <Typography variant="body2" color="text.secondary">
                {name}
                {cur.academicYearName ? ` · ${cur.academicYearName}` : ''}
              </Typography>
            )}

            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

            {cur && (
              <Box>
                <FieldLabel>Currently in</FieldLabel>
                <Chip
                  label={`${cur.className || '—'}${cur.rollNumber != null ? ` · Roll ${cur.rollNumber}` : ''}`}
                  variant="outlined"
                  size="small"
                />
              </Box>
            )}

            {opts?.targets?.length > 0 && (
              <>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Move to section"
                  value={toClassId}
                  onChange={(e) => setToClassId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select a section…</em>
                  </MenuItem>
                  {opts.targets.map((t) => (
                    <MenuItem key={t.classId} value={t.classId}>
                      {t.className} · {t.headcount} student{t.headcount === 1 ? '' : 's'}
                    </MenuItem>
                  ))}
                </TextField>

                {target && (
                  <Box>
                    <FieldLabel>Roll number in {target.className}</FieldLabel>
                    <RadioGroup value={rollMode} onChange={(e) => setRollMode(e.target.value)}>
                      <FormControlLabel
                        value="auto"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2">
                            Assign next available <b>(Roll {target.nextRoll})</b>
                          </Typography>
                        }
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <FormControlLabel
                          value="manual"
                          control={<Radio size="small" />}
                          label={<Typography variant="body2">Set manually</Typography>}
                          sx={{ mr: 0 }}
                        />
                        {rollMode === 'manual' && (
                          <TextField
                            type="number"
                            size="small"
                            value={manualRoll}
                            onChange={(e) => setManualRoll(e.target.value)}
                            placeholder="Roll"
                            inputProps={{ min: 1, style: { width: 64 } }}
                          />
                        )}
                      </Box>
                    </RadioGroup>
                  </Box>
                )}

                {target && (
                  <Alert
                    severity="info"
                    icon={false}
                    sx={{ '& .MuiAlert-message': { fontSize: 13 } }}
                  >
                    <b>{name}</b> moves from <b>{cur.className}</b> (roll {cur.rollNumber ?? '—'}) to{' '}
                    <b>{target.className}</b>
                    {chosenRoll != null ? <>, roll <b>{chosenRoll}</b></> : ' (no roll)'}. Fees, dues and
                    history stay with the student.
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1, color: 'text.secondary', alignItems: 'flex-start' }}>
                  <WarnIcon sx={{ fontSize: 18, color: 'warning.main', mt: '1px' }} />
                  <Typography variant="caption">
                    Updates this year's class roster and attendance list. Attendance already marked for
                    today stays on the old section.
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleMove} disabled={!canMove}>
          {saving ? 'Moving…' : 'Move student'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function FieldLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}
    >
      {children}
    </Typography>
  );
}
