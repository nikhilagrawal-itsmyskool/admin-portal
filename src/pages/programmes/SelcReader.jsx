import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress, Chip, Stack,
  Accordion, AccordionSummary, AccordionDetails, FormControl, InputLabel, Select, MenuItem, Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { programmesService, SELC } from '../../services/programmesService';
import { useAcademicYear } from '../../context/AcademicYearContext';

// Calendar month (0-11) -> academic month value, to default to "this month".
const CAL_TO_MONTH = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const currentAcademicMonth = () => CAL_TO_MONTH[new Date().getMonth()];

// Observation scale per assessment band (from the programme's stage master).
const LEVELS = {
  early: ['Emerging', 'Developing', 'Secure'],
  i_viii: ['Emerging', 'Developing', 'Secure', 'Consistently Demonstrates'],
  ix_xii: ['Emerging', 'Developing', 'Secure', 'Independent'],
};

export default function SelcReader() {
  const navigate = useNavigate();
  const { grade: urlGrade, month: urlMonth } = useParams();
  const { academicYearId } = useAcademicYear();

  const [programme, setProgramme] = useState(null); // catalog obj: motto, philosophy, teacherGuidance, stages
  const [grades, setGrades] = useState([]); // [{ grade }]
  const [months, setMonths] = useState([]); // [{ value, label }]
  const [grade, setGrade] = useState(urlGrade || '');
  const [month, setMonth] = useState(urlMonth || currentAcademicMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load the pickers once (programme stages give the grade list; lookups give months).
  useEffect(() => {
    (async () => {
      try {
        const [prog, lookups] = await Promise.all([
          programmesService.getProgramme(SELC),
          programmesService.getLookups(),
        ]);
        setProgramme(prog);
        setGrades((prog.stages || []).map((s) => ({ grade: s.grade })));
        setMonths(lookups.months || []);
        if (!urlGrade && prog.stages?.length) setGrade(prog.stages[0].grade);
      } catch {
        setError('Failed to load the programme.');
      }
    })();
  }, [urlGrade]);

  // Keep the URL in sync so the page is shareable / deep-linkable from the phone hub.
  useEffect(() => {
    if (grade && month) navigate(`/programmes/selc/${encodeURIComponent(grade)}/${month}`, { replace: true });
  }, [grade, month, navigate]);

  // Fetch the unit whenever grade/month/year change.
  useEffect(() => {
    if (!grade || !month) return;
    let active = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await programmesService.getTeach({
          programme: SELC, grade, month, academicYearId: academicYearId || undefined,
        });
        if (active) setData(res);
      } catch {
        if (active) setError('Failed to load this month.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [grade, month, academicYearId]);

  const unit = data?.unit;
  const guidance = programme?.teacherGuidance || [];
  const stage = (programme?.stages || []).find(
    (s) => (s.grade || '').toLowerCase() === (grade || '').toLowerCase(),
  );
  const levels = LEVELS[stage?.assessmentBand] || [];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>Spoken English &amp; Life Communication</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pick a class and month to open that unit — a resource bank, not a script.
      </Typography>

      {(programme?.motto || guidance.length > 0) && (
        <Accordion disableGutters sx={{ mb: 2, maxWidth: 820, bgcolor: 'action.hover' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TipsAndUpdatesIcon fontSize="small" color="primary" />
              <Typography sx={{ fontWeight: 600 }}>How to teach this programme</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {programme?.motto && (
              <Typography sx={{ fontStyle: 'italic', mb: 0.5 }}>{programme.motto}</Typography>
            )}
            {programme?.philosophy && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {programme.philosophy}
              </Typography>
            )}
            <Box component="ul" sx={{ pl: 3, m: 0, '& li': { mb: 0.5 } }}>
              {guidance.map((g, i) => (
                <li key={i}><Typography variant="body2">{g}</Typography></li>
              ))}
            </Box>
            {levels.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                <b>Observing {grade}:</b> {levels.join(' → ')}
                {' '}(plus "Not Observed" when there isn't enough evidence).
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3, maxWidth: 560 }}>
        <Grid item xs={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Class</InputLabel>
            <Select label="Class" value={grade} onChange={(e) => setGrade(e.target.value)}>
              {grades.map((g) => (
                <MenuItem key={g.grade} value={g.grade}>{g.grade}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Month</InputLabel>
            <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : !unit ? (
        <Alert severity="info">No content for this class &amp; month yet.</Alert>
      ) : (
        <Box sx={{ maxWidth: 820 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 0.5 }}>{unit.title}</Typography>
              {unit.programmeFocus && (
                <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5 }}>
                  Focus · {unit.programmeFocus}
                </Typography>
              )}
              {unit.focusSkills?.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {unit.focusSkills.map((s) => (
                    <Chip key={s.name} label={s.name} size="small" color="primary" variant="outlined" />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {(unit.fields || []).map((f) => {
            const isModel = /model conversation/i.test(f.name);
            return (
              <Accordion key={f.code} defaultExpanded={f.code === 'F01'} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>{f.name}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {isModel && (
                    <Chip
                      icon={<RecordVoiceOverIcon />}
                      label="Model — not for memorisation"
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ mb: 1.5 }}
                    />
                  )}
                  <Typography component="div" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {f.content}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
