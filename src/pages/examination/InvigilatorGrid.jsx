import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Alert, CircularProgress, Stack, Autocomplete, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { fmtDate } from '../../utils/date';

const cellKey = (date, sectionId) => `${date}|${sectionId}`;
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOf = (d) => DOW[new Date(`${d}T00:00:00`).getDay()];

// Per-(date, section) invigilator assignment. A cell is only assignable when the
// section's grade has a paper that date. One employee on two sections the same date is
// allowed but highlighted as a conflict (they can't physically be in two rooms).
export default function InvigilatorGrid({ examId, canManage, employees }) {
  const [view, setView] = useState(null);
  const [map, setMap] = useState({}); // cellKey -> employeeId
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const v = await examinationService.getInvigilators(examId);
      setView(v);
      const m = {};
      for (const a of v.assignments || []) m[cellKey(a.examDate, a.sectionClassId)] = a.employeeId;
      setMap(m);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load invigilators');
    } finally { setLoading(false); }
  }, [examId]);

  useEffect(() => { load(); }, [load]);

  const empById = useMemo(() => {
    const m = {};
    for (const e of employees || []) m[e.uuid] = e;
    return m;
  }, [employees]);

  // Live conflicts: per date, which employees are used on >1 section.
  const conflictCells = useMemo(() => {
    const set = new Set();
    if (!view) return set;
    for (const date of view.dates) {
      const seen = {};
      for (const s of view.sections) {
        const emp = map[cellKey(date, s.classId)];
        if (emp) (seen[emp] ||= []).push(s.classId);
      }
      for (const emp of Object.keys(seen)) {
        if (seen[emp].length > 1) seen[emp].forEach((sid) => set.add(cellKey(date, sid)));
      }
    }
    return set;
  }, [view, map]);

  const assignable = (date, section) => (view?.gradesByDate?.[date] || []).includes(section.grade);

  const setCell = (date, sectionId, empId) =>
    setMap((m) => {
      const next = { ...m };
      if (empId) next[cellKey(date, sectionId)] = empId;
      else delete next[cellKey(date, sectionId)];
      return next;
    });

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const assignments = Object.entries(map).map(([k, employeeId]) => {
        const [examDate, sectionClassId] = k.split('|');
        return { examDate, sectionClassId, employeeId };
      });
      const v = await examinationService.saveInvigilators(examId, assignments);
      setView(v);
      const m = {};
      for (const a of v.assignments || []) m[cellKey(a.examDate, a.sectionClassId)] = a.employeeId;
      setMap(m);
      setMsg(`Saved ${assignments.length} assignment${assignments.length === 1 ? '' : 's'}.`);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save invigilators');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!view) return <Alert severity="error">{err || 'Failed to load'}</Alert>;

  if (!view.dates.length) {
    return <Alert severity="info">Add the datesheet first — invigilators are assigned per exam date.</Alert>;
  }
  if (!view.sections.length) {
    return <Alert severity="info">No graded sections found for this exam's academic year.</Alert>;
  }

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}
      {conflictCells.size > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some invigilators are assigned to more than one section on the same day (highlighted). Allowed, but double-check.
        </Alert>
      )}

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 180 + view.dates.length * 200 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 160, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                Section
              </TableCell>
              {view.dates.map((d) => (
                <TableCell key={d} sx={{ fontWeight: 700, minWidth: 190, lineHeight: 1.25 }}>
                  {fmtDate(d)}
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 400 }}>{dayOf(d)}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {view.sections.map((s) => (
              <TableRow key={s.classId} sx={{ '& td': { height: 60, py: 1 } }}>
                <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                  {s.name}
                </TableCell>
                {view.dates.map((d) => {
                  if (!assignable(d, s)) {
                    return <TableCell key={d} sx={{ bgcolor: 'action.hover' }}><span style={{ opacity: 0.3 }}>—</span></TableCell>;
                  }
                  const empId = map[cellKey(d, s.classId)] || null;
                  const conflict = conflictCells.has(cellKey(d, s.classId));
                  return (
                    <TableCell key={d} sx={{ bgcolor: conflict ? 'warning.light' : undefined }}>
                      {canManage ? (
                        <Autocomplete
                          size="small" options={employees || []} getOptionLabel={(o) => o.name || ''}
                          value={empId ? (empById[empId] || null) : null}
                          onChange={(_, v) => setCell(d, s.classId, v ? v.uuid : null)}
                          isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                          renderInput={(p) => <TextField {...p} placeholder="Assign…" />}
                        />
                      ) : (
                        empId ? (empById[empId]?.name || empId) : <span style={{ opacity: 0.4 }}>—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {canManage && (
        <Stack direction="row" sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            Grey cells have no paper for that grade on that day.
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
            Save invigilators
          </Button>
        </Stack>
      )}
    </Box>
  );
}
