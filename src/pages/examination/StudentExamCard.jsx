import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, Stack, Chip, Box, Button, Alert, CircularProgress, Divider, Tooltip,
} from '@mui/material';
import { GppGood as OverrideIcon, Undo as RevokeIcon } from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { useAuth } from '../../context/AuthContext';
import { useCan } from '../../permissions/can';
import { fmtDate } from '../../utils/date';

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Student 360 "Examinations" block: admit-card / dues status per published exam, with the
// god dues-override. Only rendered for exam.view roles (gated by the parent).
export default function StudentExamCard({ studentId }) {
  const { user } = useAuth();
  const isGod = (user?.roles || []).includes('god');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setRows(await examinationService.studentExamStatus(studentId)); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load exam status'); }
    finally { setLoading(false); }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);

  const override = async (examId) => {
    const reason = window.prompt('Reason to allow printing this dues-blocked student?');
    if (reason === null) return;
    try { await examinationService.createOverrides(examId, [studentId], reason); load(); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Override failed (god only)'); }
  };
  const revoke = async (examId) => {
    try { await examinationService.revokeOverride(examId, studentId); load(); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Revoke failed'); }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>Examinations</Typography>
        {err && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setErr('')}>{err}</Alert>}
        {loading ? (
          <Box sx={{ py: 2, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No published examinations for this student.</Typography>
        ) : rows.map((r, i) => (
          <React.Fragment key={r.examId}>
            {i > 0 && <Divider sx={{ my: 1 }} />}
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.examName}</Typography>
                <Typography variant="caption" color="text.secondary">{r.className} · {r.academicYearName}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">Dues</Typography>
                <Typography variant="body2" style={{ color: (r.currentDue || r.priorDue) ? '#b71c1c' : undefined }}>
                  {rupee(r.currentDue)} <span style={{ opacity: 0.6 }}>+ {rupee(r.priorDue)} prior</span>
                </Typography>
              </Box>
              {r.overridden ? <Chip size="small" color="warning" label="override" />
                : r.blocked ? <Chip size="small" color="error" label="blocked" />
                  : <Chip size="small" color="success" label="clear" />}
              {r.printedOn && (
                <Tooltip title={`Printed ${fmtDate(r.printedOn)}`}>
                  <Chip size="small" variant="outlined" color="info" label="printed" />
                </Tooltip>
              )}
              {isGod && (r.overridden ? (
                <Tooltip title="Revoke override"><Button size="small" startIcon={<RevokeIcon />} onClick={() => revoke(r.examId)}>Revoke</Button></Tooltip>
              ) : r.blocked ? (
                <Tooltip title="Allow print despite dues"><Button size="small" color="warning" startIcon={<OverrideIcon />} onClick={() => override(r.examId)}>Override</Button></Tooltip>
              ) : null)}
            </Stack>
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
