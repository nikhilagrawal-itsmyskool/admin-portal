import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Button, Chip, Alert, CircularProgress, Tabs, Tab,
  TextField, MenuItem, Autocomplete,
} from '@mui/material';
import { ArrowBack as BackIcon, Publish as PublishIcon, Unpublished as UnpublishIcon, Image as BrandingIcon } from '@mui/icons-material';
import { useCan } from '../../permissions/can';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { examinationService } from '../../services/examinationService';
import { employeeService } from '../../services/employeeService';
import { fmtDate } from '../../utils/date';
import DatesheetGrid from './DatesheetGrid';
import InvigilatorGrid from './InvigilatorGrid';
import AdmitCardsTab from './AdmitCardsTab';
import BrandingDialog from './BrandingDialog';
import ExamHome from './mobile/ExamHome';

const STATUS_COLOR = { draft: 'default', published: 'success', archived: 'warning' };

export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canManage = useCan()('exam.manage');
  const { user } = useAuth();
  const isGod = (user?.roles || []).includes('god');
  const isMobile = useIsMobile();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('datesheet');
  const [employees, setEmployees] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [brandingOpen, setBrandingOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      setExam(await examinationService.get(id));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load the exam');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    employeeService.searchEmployees({}).then(setEmployees).catch(() => setEmployees([]));
    examinationService.feeCycles(id).then(setCycles).catch(() => setCycles([]));
  }, [id]);

  const patch = async (body) => {
    setErr('');
    try {
      setExam(await examinationService.update(id, body));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Update failed');
    }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!exam) return <Alert severity="error">{err || 'Exam not found'}</Alert>;

  // Phone: card hierarchy (exam home → its own sub-screens) instead of desktop tabs.
  if (isMobile) {
    return <ExamHome exam={exam} canManage={canManage} onPatch={patch} onBack={() => navigate('/examinations')} />;
  }

  const inchargeValue = employees.find((e) => e.uuid === exam.inchargeEmployeeId) || null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/examinations')}>Exams</Button>
        <Typography variant="h5">{exam.name}</Typography>
        <Chip size="small" label={exam.status} color={STATUS_COLOR[exam.status] || 'default'} />
        <Box sx={{ flex: 1 }} />
        {canManage && (
          <Button
            variant={exam.status === 'published' ? 'outlined' : 'contained'}
            startIcon={exam.status === 'published' ? <UnpublishIcon /> : <PublishIcon />}
            onClick={() => patch({ status: exam.status === 'published' ? 'draft' : 'published' })}
          >
            {exam.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        )}
      </Stack>

      {canManage && (
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2} sx={{ mb: 2 }}>
          <Autocomplete
            sx={{ minWidth: 230 }} size="small"
            options={employees} getOptionLabel={(o) => o.name || ''}
            value={inchargeValue}
            onChange={(_, v) => patch({ inchargeEmployeeId: v ? v.uuid : null })}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            renderInput={(p) => <TextField {...p} label="Examination incharge" />}
          />
          <TextField
            select size="small" sx={{ minWidth: 150 }} label="Cards per A4 page"
            value={exam.cardsPerPage || 4} onChange={(e) => patch({ cardsPerPage: Number(e.target.value) })}
          >
            <MenuItem value={4}>4 per page</MenuItem>
            <MenuItem value={3}>3 per page</MenuItem>
          </TextField>
          <TextField
            select size="small" sx={{ minWidth: 190 }} label="Dues cleared till"
            value={exam.duesCutoffDate || ''} onChange={(e) => patch({ duesCutoffDate: e.target.value || null })}
          >
            <MenuItem value=""><em>Due now (this month)</em></MenuItem>
            {cycles.filter((c) => c.dueDate).map((c) => (
              <MenuItem key={c.uuid} value={c.dueDate}>{c.name} · due {fmtDate(c.dueDate)}</MenuItem>
            ))}
          </TextField>
          <TextField
            key={`thrc-${exam.duesThresholdCurrent ?? 0}`}
            size="small" type="number" sx={{ width: 165 }} label="Current-yr threshold ₹"
            defaultValue={exam.duesThresholdCurrent ?? 0} disabled={!isGod}
            helperText={isGod ? 'god only' : 'view-only'}
            onBlur={isGod ? (e) => { const v = Number(e.target.value) || 0; if (v !== Number(exam.duesThresholdCurrent || 0)) patch({ duesThresholdCurrent: v }); } : undefined}
          />
          <TextField
            key={`thrp-${exam.duesThresholdPrior ?? 0}`}
            size="small" type="number" sx={{ width: 150 }} label="Prior-yr threshold ₹"
            defaultValue={exam.duesThresholdPrior ?? 0} disabled={!isGod}
            helperText={isGod ? 'god only' : 'view-only'}
            onBlur={isGod ? (e) => { const v = Number(e.target.value) || 0; if (v !== Number(exam.duesThresholdPrior || 0)) patch({ duesThresholdPrior: v }); } : undefined}
          />
          <Button variant="outlined" startIcon={<BrandingIcon />} onClick={() => setBrandingOpen(true)} sx={{ alignSelf: 'flex-start', height: 40 }}>
            Branding
          </Button>
        </Stack>
      )}

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="datesheet" label="Datesheet" />
        <Tab value="invigilators" label="Invigilators" />
        <Tab value="admit" label="Admit Cards" />
      </Tabs>

      {tab === 'datesheet' && <DatesheetGrid examId={id} canManage={canManage} onChanged={load} />}
      {tab === 'invigilators' && <InvigilatorGrid examId={id} canManage={canManage} employees={employees} />}
      {tab === 'admit' && <AdmitCardsTab examId={id} exam={exam} canManage={canManage} />}

      <BrandingDialog open={brandingOpen} onClose={() => setBrandingOpen(false)} />
    </Box>
  );
}
