import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Autocomplete,
  TextField,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Divider,
  Chip,
  Alert,
  Stack,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '@mui/material';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Summarize as ReportIcon,
} from '@mui/icons-material';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import { examinationService } from '../../services/examinationService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useAuth } from '../../context/AuthContext';
import { useCan } from '../../permissions/can';
import { buildReportHtml, buildReportCsv, downloadText, printHtml, formatValue } from './reportHtml';

// Group labels for the field picker, in display order.
const GROUP_LABELS = {
  identity: 'Student',
  student: 'Student contact',
  father: 'Father',
  mother: 'Mother',
  guardian: 'Guardian',
  attributes: 'Other',
};
const GROUP_ORDER = ['identity', 'student', 'father', 'mother', 'guardian', 'attributes'];

// Named reports = the same builder with different defaults.
const PRESETS = [
  {
    key: 'contact',
    label: 'Contact list',
    fields: ['className', 'rollNumber', 'studentName', 'fatherName', 'fatherMobile', 'fatherWhatsapp', 'motherMobile'],
    filter: 'all',
  },
  {
    key: 'rte',
    label: 'RTE students',
    fields: ['className', 'rollNumber', 'studentName', 'admissionNumber', 'house', 'fatherMobile'],
    filter: 'rte',
  },
  {
    key: 'examOnly',
    label: 'Exam-only students',
    fields: ['className', 'rollNumber', 'studentName', 'admissionNumber', 'fatherMobile'],
    filter: 'examOnly',
  },
];

const DEFAULT_FIELDS = ['className', 'rollNumber', 'studentName', 'fatherMobile'];

export default function StudentReports() {
  const { academicYearId, years } = useAcademicYear();
  const { user } = useAuth();
  const can = useCan();
  const canManage = can('student.manage');
  const isAdminGod = (user?.roles || []).some((r) => r === 'admin' || r === 'god');

  const [catalog, setCatalog] = useState([]); // [{ key, label, group, contact }]
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selected, setSelected] = useState(new Set(DEFAULT_FIELDS));
  const [filter, setFilter] = useState('all');
  const [orientation, setOrientation] = useState('portrait');
  const [pageBreak, setPageBreak] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null); // { meta, rows }

  const yearName = useMemo(
    () => (years || []).find((y) => y.uuid === academicYearId)?.name || '',
    [years, academicYearId]
  );

  const labelOf = useMemo(() => {
    const m = {};
    catalog.forEach((f) => (m[f.key] = f.label));
    return m;
  }, [catalog]);

  // Selected fields in catalog (display) order → [{ key, label }].
  const orderedFields = useMemo(
    () => catalog.filter((f) => selected.has(f.key)).map((f) => ({ key: f.key, label: f.label })),
    [catalog, selected]
  );

  useEffect(() => {
    (async () => {
      try {
        const [{ fields }, cls] = await Promise.all([
          studentService.getReportFields(),
          classService.getClasses({ academicYearId }),
        ]);
        setCatalog(fields || []);
        setClasses(cls?.classes || cls || []);
      } catch (e) {
        setError(e?.response?.data?.error?.message || 'Failed to load report options');
      }
    })();
  }, [academicYearId]);

  const grouped = useMemo(() => {
    const by = {};
    catalog.forEach((f) => {
      (by[f.group] = by[f.group] || []).push(f);
    });
    return GROUP_ORDER.filter((g) => by[g]).map((g) => ({ group: g, label: GROUP_LABELS[g] || g, fields: by[g] }));
  }, [catalog]);

  const toggleField = (key) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const applyPreset = (p) => {
    setSelected(new Set(p.fields));
    setFilter(p.filter);
    setReport(null);
  };

  const generate = useCallback(async () => {
    setError('');
    if (!selectedClasses.length) { setError('Select at least one class'); return; }
    if (!selected.size) { setError('Select at least one field'); return; }
    setLoading(true);
    setReport(null);
    try {
      const data = await studentService.getReportRoster({
        academicYearId,
        classIds: selectedClasses.map((c) => c.uuid),
        fields: orderedFields.map((f) => f.key),
        filter,
      });
      setReport(data);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [academicYearId, selectedClasses, selected, orderedFields, filter]);

  const reportTitle = useMemo(() => {
    if (filter === 'rte') return 'RTE Students';
    if (filter === 'examOnly') return 'Exam-Only Students';
    return 'Student Report';
  }, [filter]);

  const subtitle = useMemo(() => {
    if (!report) return '';
    const clsNames = report.meta.classes.map((c) => c.className).join(', ');
    return `${yearName}${clsNames ? ' · ' + clsNames : ''} · ${report.meta.total} student${
      report.meta.total === 1 ? '' : 's'
    }`;
  }, [report, yearName]);

  const doPrint = async () => {
    if (!report) return;
    let branding = null;
    try {
      branding = await examinationService.getBranding();
    } catch { /* branding is best-effort; fall back to defaults in the builder */ }
    const html = buildReportHtml(
      { branding, rows: report.rows, fields: orderedFields, title: reportTitle, subtitle },
      { orientation, pageBreakPerClass: pageBreak }
    );
    printHtml(html);
  };

  const doCsv = () => {
    if (!report) return;
    const csv = buildReportCsv(report.rows, orderedFields);
    const stamp = (yearName || '').replace(/[^\w-]+/g, '_');
    downloadText(`${reportTitle.replace(/\s+/g, '_')}_${stamp || 'report'}.csv`, csv);
  };

  if (!canManage) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You don't have permission to view student reports.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <ReportIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Student Reports</Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {!isAdminGod && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Contact numbers will be masked in the report — only admins can export full numbers.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        {/* Presets */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Quick reports</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {PRESETS.map((p) => (
            <Chip key={p.key} label={p.label} variant="outlined" clickable onClick={() => applyPreset(p)} />
          ))}
        </Stack>
        <Divider sx={{ mb: 2 }} />

        {/* Scope: year (context) + classes */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ mb: 2 }}>
          <Chip label={`Academic year: ${yearName || '—'}`} />
          <Autocomplete
            multiple
            sx={{ flex: 1, minWidth: 260 }}
            options={classes}
            getOptionLabel={(o) => o.name || ''}
            isOptionEqualToValue={(a, b) => a.uuid === b.uuid}
            value={selectedClasses}
            onChange={(_e, v) => { setSelectedClasses(v); setReport(null); }}
            renderInput={(params) => <TextField {...params} label="Classes" placeholder="Select one or more classes" size="small" />}
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => { setSelectedClasses(classes); setReport(null); }}>All</Button>
            <Button size="small" onClick={() => { setSelectedClasses([]); setReport(null); }}>Clear</Button>
          </Stack>
        </Stack>

        {/* Filter */}
        <FormControl sx={{ mb: 1 }}>
          <FormLabel sx={{ fontSize: 13 }}>Include</FormLabel>
          <RadioGroup row value={filter} onChange={(e) => { setFilter(e.target.value); setReport(null); }}>
            <FormControlLabel value="all" control={<Radio size="small" />} label="All students" />
            <FormControlLabel value="rte" control={<Radio size="small" />} label="RTE only" />
            <FormControlLabel value="examOnly" control={<Radio size="small" />} label="Exam-only" />
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 1.5 }} />

        {/* Field picker */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Columns</Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          {grouped.map((g) => (
            <Box key={g.group} sx={{ minWidth: 150 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>{g.label}</Typography>
              {g.fields.map((f) => (
                <FormControlLabel
                  key={f.key}
                  sx={{ display: 'flex', mr: 0, my: -0.5 }}
                  control={<Checkbox size="small" checked={selected.has(f.key)} onChange={() => toggleField(f.key)} />}
                  label={<span style={{ fontSize: 13 }}>{f.label}</span>}
                />
              ))}
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Layout options */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Box>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}>Orientation</Typography>
            <ToggleButtonGroup size="small" exclusive value={orientation} onChange={(_e, v) => v && setOrientation(v)}>
              <ToggleButton value="portrait">Portrait</ToggleButton>
              <ToggleButton value="landscape">Landscape</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <FormControlLabel
            control={<Checkbox size="small" checked={pageBreak} onChange={(e) => setPageBreak(e.target.checked)} />}
            label="Page break per class"
          />
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" onClick={generate} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Generate'}
          </Button>
        </Stack>
      </Paper>

      {/* Result */}
      {report && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{reportTitle}</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            <Box sx={{ flex: 1 }} />
            <Button startIcon={<PrintIcon />} variant="outlined" onClick={doPrint} disabled={!report.rows.length}>Print / PDF</Button>
            <Button startIcon={<DownloadIcon />} variant="outlined" onClick={doCsv} disabled={!report.rows.length}>CSV</Button>
          </Stack>

          {report.rows.length === 0 ? (
            <Alert severity="info">No students match this selection.</Alert>
          ) : (
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    {orderedFields.map((f) => <TableCell key={f.key} sx={{ fontWeight: 700 }}>{f.label}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.rows.map((r, i) => (
                    <TableRow key={r.studentId || i} hover>
                      <TableCell>{i + 1}</TableCell>
                      {orderedFields.map((f) => <TableCell key={f.key}>{formatValue(f.key, r[f.key])}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
}
