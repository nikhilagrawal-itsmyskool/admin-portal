import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Alert, Chip, Link,
  CircularProgress, Table, TableHead, TableBody, TableRow, TableCell, Checkbox, Tooltip,
} from '@mui/material';
import { PlaylistRemove as RollbackIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';
import { feesService } from '../../services/feesService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { errMsg, inr, classRank, FEE_COLORS } from './feesUi';

// Fee-exempt working set: students flagged exam_only on their record (registered here,
// studying elsewhere). The flag is set in student edit; here we see the fee consequence
// and roll back (cancel) their demands. generate() already skips them, so once cancelled
// nothing re-accrues.
export default function ExamOnlyStudents() {
  const { academicYearId } = useAcademicYear();
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can(ACTIONS.FEE_MANAGE);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [data, setData] = useState({ students: [], totalStudents: 0, totalOpenDemand: 0, totalOpenCharges: 0 });
  const [sel, setSel] = useState(() => new Set()); // studentIds selected for rollback
  const [confirm, setConfirm] = useState({ open: false, preview: null, loading: false });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [academicYearId]);

  const load = async () => {
    if (!academicYearId) return;
    setLoading(true); setError('');
    try {
      const d = await feesService.getExamOnlyStudents(academicYearId);
      setData(d || { students: [] });
      // default-select every student that still has open charges
      setSel(new Set((d?.students || []).filter((s) => s.openCharges > 0).map((s) => s.studentId)));
    } catch (err) { setError(errMsg(err, 'Failed to load exam-only students')); }
    finally { setLoading(false); }
  };

  const rows = useMemo(
    () => (data.students || []).slice().sort(
      (a, b) => classRank(a.className) - classRank(b.className) || (a.name || '').localeCompare(b.name || '')
    ),
    [data.students]
  );
  const withCharges = rows.filter((r) => r.openCharges > 0);
  const allSelected = withCharges.length > 0 && withCharges.every((r) => sel.has(r.studentId));
  const someSelected = withCharges.some((r) => sel.has(r.studentId));

  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel(() => (allSelected ? new Set() : new Set(withCharges.map((r) => r.studentId))));

  const selectedIds = rows.filter((r) => sel.has(r.studentId) && r.openCharges > 0).map((r) => r.studentId);

  // Preview the rollback (dryRun) then open the confirm dialog with real numbers.
  const preview = async () => {
    setError(''); setOk('');
    try {
      const p = await feesService.cancelExamOnlyDemands({ academicYearId, studentIds: selectedIds, dryRun: true });
      setConfirm({ open: true, preview: p, loading: false });
    } catch (err) { setError(errMsg(err)); }
  };

  const doRollback = async () => {
    setConfirm((c) => ({ ...c, loading: true }));
    try {
      const r = await feesService.cancelExamOnlyDemands({ academicYearId, studentIds: selectedIds, dryRun: false });
      setConfirm({ open: false, preview: null, loading: false });
      setOk(`Rolled back demands for ${r.students} student${r.students === 1 ? '' : 's'} — ${r.chargesVoided} charge${r.chargesVoided === 1 ? '' : 's'} cancelled, ${inr(r.amountVoided)} removed${r.skippedPaidCharges ? ` · ${r.skippedPaidCharges} paid charge(s) left untouched` : ''}.`);
      load();
    } catch (err) { setError(errMsg(err)); setConfirm((c) => ({ ...c, loading: false })); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Fee Exempt (studying elsewhere)</Typography>
          <Typography sx={{ color: FEE_COLORS.muted, fontSize: 13 }}>
            Students flagged <b>exam only</b> on their record — registered here but studying at another school, so they pay no fees.
            Set the flag in the student's edit form; roll back their demands here.
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: 'none' }}>Refresh</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {ok && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setOk('')}>{ok}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`${data.totalStudents} flagged`} color="default" variant="outlined" />
        <Chip label={`${data.totalOpenCharges} open charges`} color={data.totalOpenCharges ? 'warning' : 'success'} variant="outlined" />
        <Chip label={`${inr(data.totalOpenDemand)} open demand`} color={data.totalOpenDemand ? 'warning' : 'success'} variant="outlined" />
      </Box>

      <Card>
        <CardContent sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Flagged students</Typography>
          <Tooltip title={!canManage ? 'Requires fee manage permission' : selectedIds.length ? '' : 'No students with open charges selected'}>
            <span>
              <Button
                variant="contained" color="warning" startIcon={<RollbackIcon />}
                disabled={!canManage || selectedIds.length === 0}
                onClick={preview}
              >
                Roll back demands{selectedIds.length ? ` (${selectedIds.length})` : ''}
              </Button>
            </span>
          </Tooltip>
        </CardContent>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={allSelected} indeterminate={someSelected && !allSelected} onChange={toggleAll} disabled={withCharges.length === 0} />
                </TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Adm#</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Reason / other school</TableCell>
                <TableCell align="right">Open charges</TableCell>
                <TableCell align="right">Open demand</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ color: FEE_COLORS.muted, py: 3 }}>
                  No students are flagged exam-only. Set the flag from a student's edit form.
                </TableCell></TableRow>
              )}
              {rows.map((r) => {
                const clean = r.openCharges === 0;
                return (
                  <TableRow key={r.studentId} hover selected={sel.has(r.studentId)}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={sel.has(r.studentId)} onChange={() => toggle(r.studentId)} disabled={clean} />
                    </TableCell>
                    <TableCell>{r.className || '—'}</TableCell>
                    <TableCell>{r.admissionNumber || '—'}</TableCell>
                    <TableCell>
                      <Link component="button" underline="hover" onClick={() => navigate(`/students/${r.studentId}`)} sx={{ textAlign: 'left' }}>
                        {r.name || r.studentId}
                      </Link>
                    </TableCell>
                    <TableCell sx={{ color: FEE_COLORS.muted, maxWidth: 240 }}>{r.reason || '—'}</TableCell>
                    <TableCell align="right">
                      {clean
                        ? <Chip size="small" color="success" variant="outlined" label="cleared" />
                        : <b>{r.openCharges}</b>}
                    </TableCell>
                    <TableCell align="right">{r.openDemand ? inr(r.openDemand) : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <ConfirmDialog
        open={confirm.open}
        title="Roll back demands"
        message={confirm.preview
          ? `Cancel ${confirm.preview.chargesVoided} charge${confirm.preview.chargesVoided === 1 ? '' : 's'} across ${confirm.preview.students} student${confirm.preview.students === 1 ? '' : 's'}, removing ${inr(confirm.preview.amountVoided)} of open demand.` +
            (confirm.preview.skippedPaidCharges ? ` ${confirm.preview.skippedPaidCharges} charge(s) with a payment will be left untouched.` : '') +
            ' This cancels the demand ledger entries (and their concessions/waivers) and cannot be auto-undone.'
          : ''}
        confirmLabel="Roll back"
        loadingLabel="Rolling back…"
        confirmColor="warning"
        onConfirm={doRollback}
        onCancel={() => setConfirm({ open: false, preview: null, loading: false })}
        loading={confirm.loading}
      />
    </Box>
  );
}
