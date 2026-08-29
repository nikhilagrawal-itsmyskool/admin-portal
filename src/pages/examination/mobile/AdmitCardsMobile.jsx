import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Stack, Chip, Alert, CircularProgress, Paper, TextField, MenuItem, IconButton,
} from '@mui/material';
import { GppGood as OverrideIcon, Undo as RevokeIcon } from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';
import { classService } from '../../../services/classService';
import { examinationService } from '../../../services/examinationService';
import { fmtDate } from '../../../utils/date';

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Phone admit-cards: pick a class → review dues + status, override (god). No printing —
// that's a desktop batch job; find a single student across classes with Ctrl+K.
export default function AdmitCardsMobile() {
  const { id } = useParams();
  const { user } = useAuth();
  const isGod = (user?.roles || []).includes('god');

  const [exam, setExam] = useState(null);
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    examinationService.get(id).then((e) => {
      setExam(e);
      classService.getClasses({ academicYearId: e.academicYearId }).then(setSections).catch(() => setSections([]));
    }).catch((e) => setErr(e.response?.data?.error?.description || 'Failed to load'));
  }, [id]);

  const loadRoster = useCallback(async (sid) => {
    if (!sid) { setRoster(null); return; }
    setLoading(true); setErr('');
    try { setRoster(await examinationService.roster(id, sid)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load the class'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { loadRoster(sectionId); }, [sectionId, loadRoster]);

  const override = async (studentId) => {
    const reason = window.prompt('Reason to allow print despite dues?');
    if (reason === null) return;
    try { await examinationService.createOverrides(id, [studentId], reason); loadRoster(sectionId); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Override failed (god only)'); }
  };
  const revoke = async (studentId) => {
    try { await examinationService.revokeOverride(id, studentId); loadRoster(sectionId); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Revoke failed'); }
  };

  const clear = roster?.students.filter((s) => s.printable && !s.blocked).length || 0;
  const blocked = roster?.students.filter((s) => !s.printable).length || 0;
  const printed = roster?.students.filter((s) => s.printedOn).length || 0;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Admit Cards</Typography>
        <Chip size="small" variant="outlined" label="Print on desktop" />
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      <TextField select size="small" fullWidth label="Class" value={sectionId} onChange={(e) => setSectionId(e.target.value)} sx={{ mb: 1.5 }}>
        <MenuItem value=""><em>Select a class</em></MenuItem>
        {sections.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
      </TextField>

      {roster && (
        <Stack direction="row" spacing={0.75} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          <Chip size="small" color="success" label={`${clear} clear`} />
          {blocked > 0 && <Chip size="small" color="error" label={`${blocked} blocked`} />}
          {printed > 0 && <Chip size="small" color="info" variant="outlined" label={`${printed} printed`} />}
        </Stack>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : !roster ? (
        <Typography color="text.secondary" sx={{ py: 3 }}>Pick a class to review admit cards. Find one student by name with ⌘K.</Typography>
      ) : (
        <Stack spacing={1}>
          {roster.students.map((s) => (
            <Paper key={s.studentId} variant="outlined" sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>{s.name}</Typography>
                <Typography variant="caption" sx={{ color: (s.currentDue || s.priorDue) ? 'error.main' : 'text.secondary' }}>
                  {rupee(s.currentDue)} <span style={{ opacity: 0.6 }}>+ {rupee(s.priorDue)} prior</span>
                </Typography>
              </Box>
              <Stack alignItems="flex-end" spacing={0.5} sx={{ width: 104, flexShrink: 0 }}>
                {s.overridden ? <Chip size="small" color="warning" label="override" />
                  : s.blocked ? <Chip size="small" color="error" label="blocked" />
                    : <Chip size="small" color="success" label="clear" />}
                {s.printedOn && <Chip size="small" color="info" variant="outlined" label={`printed ${fmtDate(s.printedOn)}`} />}
              </Stack>
              {isGod && (
                <Box sx={{ width: 36, flexShrink: 0, textAlign: 'right' }}>
                  {s.overridden ? (
                    <IconButton size="small" onClick={() => revoke(s.studentId)} aria-label="Revoke override"><RevokeIcon fontSize="small" /></IconButton>
                  ) : s.blocked ? (
                    <IconButton size="small" color="warning" onClick={() => override(s.studentId)} aria-label="Override dues block"><OverrideIcon fontSize="small" /></IconButton>
                  ) : null}
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
