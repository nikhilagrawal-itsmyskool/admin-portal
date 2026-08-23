import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Autocomplete,
  TextField,
  Menu,
  FormControlLabel,
  Checkbox,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Avatar,
  Stack,
  Tooltip,
  Link,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ViewColumn as ColumnsIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useAuth } from '../../context/AuthContext';
import { fmtDate } from '../../utils/date';

// Contact relations (all on by default alongside roll / house / exam-only).
const RELATIONS = [
  { key: 'father', label: 'Father' },
  { key: 'mother', label: 'Mother' },
  { key: 'guardian', label: 'Guardian' },
];

// The full column set the picker offers, in grid order.
const COLUMN_OPTIONS = [
  { key: 'roll', label: 'Roll number' },
  { key: 'house', label: 'House' },
  { key: 'examOnly', label: 'Exam only' },
  { key: 'rte', label: 'RTE' },
  { key: 'father', label: 'Father contact' },
  { key: 'mother', label: 'Mother contact' },
  { key: 'guardian', label: 'Guardian contact' },
];

const AVATAR_COLORS = ['#3366ff', '#ff3d71', '#00b383', '#8a4bff', '#d98a00', '#0095ff', '#e0357b', '#1aa6b8'];
const avatarColor = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

const digits = (v) => (v || '').replace(/\D/g, '');
const phoneBad = (v) => {
  const d = digits(v);
  return d.length > 0 && d.length !== 10;
};

// Map a roster row from the API into the editable shape the grid holds.
function toRow(r) {
  const contact = (id, mobile, whatsapp) => ({
    guardianId: id || null,
    mobile: mobile || '',
    whatsapp: whatsapp || '',
  });
  return {
    uuid: r.uuid,
    name: r.name,
    admissionNumber: r.admissionNumber || '',
    admissionDate: r.admissionDate || null,
    roll: r.rollNumber != null ? String(r.rollNumber) : '',
    houseId: r.houseId || '',
    examOnly: !!r.examOnly,
    rte: !!r.rte,
    father: contact(r.fatherGuardianId, r.fatherMobile, r.fatherWhatsapp),
    mother: contact(r.motherGuardianId, r.motherMobile, r.motherWhatsapp),
    guardian: contact(r.guardianGuardianId, r.guardianMobile, r.guardianWhatsapp),
  };
}

// A comparable snapshot (no guardianId — that never changes here) used for dirty-diff.
function snapshot(row) {
  const c = (x) => ({ mobile: x.mobile, whatsapp: x.whatsapp });
  return JSON.stringify({
    roll: row.roll,
    houseId: row.houseId,
    examOnly: row.examOnly,
    rte: row.rte,
    father: c(row.father),
    mother: c(row.mother),
    guardian: c(row.guardian),
  });
}

export default function BulkEditClass() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdminGod = (user?.roles || []).some((r) => r === 'admin' || r === 'god');
  const { academicYearId, years } = useAcademicYear();

  const [classes, setClasses] = useState([]);
  const [houses, setHouses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  const [rows, setRows] = useState([]);
  const [orig, setOrig] = useState({}); // uuid -> snapshot string
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saveResult, setSaveResult] = useState(null); // { updated, failed, failures: [{name, error}] }

  const [cols, setCols] = useState({ roll: true, house: true, examOnly: true, rte: true, father: true, mother: true, guardian: true });
  const [colAnchor, setColAnchor] = useState(null);

  const yearName = useMemo(
    () => (years || []).find((y) => y.uuid === academicYearId)?.name || '',
    [years, academicYearId],
  );

  // Lookups once.
  useEffect(() => {
    (async () => {
      const [c, h] = await Promise.allSettled([classService.getClasses(), studentService.getHouses()]);
      const classList = c.status === 'fulfilled' ? c.value || [] : [];
      setClasses(classList);
      if (h.status === 'fulfilled') setHouses(h.value.houses || []);
      // Preselect the class passed from the Students list (?classId=).
      const pre = searchParams.get('classId');
      if (pre) {
        const match = classList.find((x) => x.uuid === pre);
        if (match) setSelectedClass(match);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRoster = useCallback(async () => {
    if (!selectedClass || !academicYearId) return;
    setLoading(true);
    setError('');
    setSaveResult(null);
    try {
      const data = await studentService.getBulkClassRoster({
        classId: selectedClass.uuid,
        academicYearId,
      });
      const list = (data.students || []).map(toRow);
      setRows(list);
      const o = {};
      list.forEach((r) => (o[r.uuid] = snapshot(r)));
      setOrig(o);
    } catch {
      setError('Failed to load the class roster.');
      setRows([]);
      setOrig({});
    } finally {
      setLoading(false);
    }
  }, [selectedClass, academicYearId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // ---- editing ----
  const setCell = (uuid, mutate) =>
    setRows((prev) => prev.map((r) => (r.uuid === uuid ? mutate({ ...r }) : r)));

  const editRoll = (uuid, val) => setCell(uuid, (r) => ({ ...r, roll: val.replace(/[^\d]/g, '') }));
  const editHouse = (uuid, val) => setCell(uuid, (r) => ({ ...r, houseId: val }));
  const editExam = (uuid, checked) => setCell(uuid, (r) => ({ ...r, examOnly: checked }));
  const editRte = (uuid, checked) => setCell(uuid, (r) => ({ ...r, rte: checked }));
  const editContact = (uuid, rel, field, val) =>
    setCell(uuid, (r) => ({ ...r, [rel]: { ...r[rel], [field]: val.replace(/[^\d]/g, '') } }));

  // Copy SMS -> WhatsApp for one relation: fill ONLY blank WhatsApp cells.
  const copySmsToWa = (rel) => {
    let filled = 0;
    setRows((prev) =>
      prev.map((r) => {
        const c = r[rel];
        if (c.mobile && !c.whatsapp) {
          filled += 1;
          return { ...r, [rel]: { ...c, whatsapp: c.mobile } };
        }
        return r;
      }),
    );
    setToast(filled ? `Copied ${filled} SMS number${filled > 1 ? 's' : ''} into blank WhatsApp cells` : 'All WhatsApp numbers already filled');
  };

  // Mark / clear a boolean flag for every row at once (whole class).
  const setAllExam = (checked) => setRows((prev) => prev.map((r) => ({ ...r, examOnly: checked })));
  const setAllRte = (checked) => setRows((prev) => prev.map((r) => ({ ...r, rte: checked })));

  // ---- derived: dirty, validation, save payload ----
  const rollDupes = useMemo(() => {
    if (!cols.roll) return new Set();
    const seen = new Map();
    const dup = new Set();
    rows.forEach((r) => {
      const v = r.roll.trim();
      if (!v) return;
      if (seen.has(v)) dup.add(v);
      else seen.set(v, r.uuid);
    });
    return dup;
  }, [rows, cols.roll]);

  const { items, editedRows, invalidCount } = useMemo(() => {
    let invalid = 0;
    const changed = new Set();
    const built = [];
    rows.forEach((r) => {
      const o = orig[r.uuid] ? JSON.parse(orig[r.uuid]) : null;
      if (!o) return;
      const item = { studentId: r.uuid };
      let has = false;

      if (cols.roll && r.roll.trim() !== o.roll) {
        item.rollNumber = r.roll.trim() === '' ? null : parseInt(r.roll.trim(), 10);
        has = true;
      }
      if (cols.house && (r.houseId || '') !== (o.houseId || '')) {
        item.houseId = r.houseId || null;
        has = true;
      }
      if (cols.examOnly && !!r.examOnly !== !!o.examOnly) {
        item.examOnly = !!r.examOnly;
        has = true;
      }
      if (cols.rte && !!r.rte !== !!o.rte) {
        item.rte = !!r.rte;
        has = true;
      }
      const contacts = {};
      RELATIONS.forEach(({ key }) => {
        if (!cols[key]) return;
        const c = r[key];
        const oc = o[key];
        if (phoneBad(c.mobile)) invalid += 1;
        if (phoneBad(c.whatsapp)) invalid += 1;
        const sub = {};
        if (c.mobile !== oc.mobile) sub.mobile = c.mobile.trim() === '' ? null : c.mobile.trim();
        if (c.whatsapp !== oc.whatsapp) sub.whatsapp = c.whatsapp.trim() === '' ? null : c.whatsapp.trim();
        if (Object.keys(sub).length) {
          contacts[key] = sub;
          has = true;
        }
      });
      if (Object.keys(contacts).length) item.contacts = contacts;
      if (has) {
        built.push(item);
        changed.add(r.uuid);
      }
    });
    return { items: built, editedRows: changed, invalidCount: invalid + rollDupes.size };
  }, [rows, orig, cols, rollDupes]);

  const isDirty = (uuid, field) => {
    const o = orig[uuid] ? JSON.parse(orig[uuid]) : null;
    if (!o) return false;
    const r = rows.find((x) => x.uuid === uuid);
    if (!r) return false;
    if (field === 'roll') return r.roll.trim() !== o.roll;
    if (field === 'house') return (r.houseId || '') !== (o.houseId || '');
    if (field === 'exam') return !!r.examOnly !== !!o.examOnly;
    if (field === 'rte') return !!r.rte !== !!o.rte;
    const [rel, sub] = field.split('.');
    return r[rel][sub] !== o[rel][sub];
  };

  const canSave = items.length > 0 && invalidCount === 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const res = await studentService.bulkUpdateClass({
        classId: selectedClass.uuid,
        academicYearId,
        items,
      });
      const nameById = Object.fromEntries(rows.map((r) => [r.uuid, r.name]));
      const failures = (res.results || [])
        .filter((x) => !x.ok)
        .map((x) => ({ name: nameById[x.studentId] || x.studentId, error: x.error }));
      setSaveResult({ updated: res.updated, failed: res.failed, failures });
      setToast(
        res.failed
          ? `Saved ${res.updated} student${res.updated === 1 ? '' : 's'}, ${res.failed} need attention`
          : `Saved — ${res.updated} student${res.updated === 1 ? '' : 's'} updated`,
      );
      await loadRoster(); // re-pull server truth; clears dirty state
    } catch {
      setError('Failed to save changes. Nothing was lost — please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    loadRoster();
    setToast('Changes discarded');
  };

  const houseNameById = useMemo(() => {
    const m = {};
    houses.forEach((h) => (m[h.uuid] = h.name));
    return m;
  }, [houses]);

  const activeContacts = RELATIONS.filter((rel) => cols[rel.key]);

  if (!isAdminGod) {
    return (
      <Box>
        <Alert severity="warning">Bulk class edit is available to admin and god roles only.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/students')} sx={{ minWidth: 0 }}>
          Students
        </Button>
        <Typography variant="h4" sx={{ flexShrink: 0 }}>
          Bulk Edit Class
        </Typography>
        {yearName && <Chip size="small" color="primary" variant="outlined" label={yearName} />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Toolbar */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Autocomplete
            options={classes}
            getOptionLabel={(o) => o.name || ''}
            value={selectedClass}
            onChange={(e, v) => setSelectedClass(v)}
            isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
            sx={{ width: 220 }}
            renderInput={(p) => <TextField {...p} label="Class" size="small" />}
          />
          <Typography variant="body2" color="text.secondary">
            {rows.length > 0 && `${rows.length} student${rows.length === 1 ? '' : 's'}`}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<ColumnsIcon />}
            onClick={(e) => setColAnchor(e.currentTarget)}
          >
            Columns
          </Button>
          <Menu anchorEl={colAnchor} open={Boolean(colAnchor)} onClose={() => setColAnchor(null)}>
            <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>
              FIELDS TO EDIT
            </Typography>
            {COLUMN_OPTIONS.map((c) => (
              <MenuItem key={c.key} dense onClick={() => setCols((p) => ({ ...p, [c.key]: !p[c.key] }))}>
                <FormControlLabel
                  sx={{ pointerEvents: 'none', m: 0 }}
                  control={<Checkbox size="small" checked={cols[c.key]} />}
                  label={c.label}
                />
              </MenuItem>
            ))}
          </Menu>
          <Button variant="outlined" size="small" onClick={handleDiscard} disabled={items.length === 0 || saving}>
            Discard
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? 'Saving…' : items.length > 0 ? `Save ${items.length} change${items.length === 1 ? '' : 's'}` : 'Save changes'}
          </Button>
        </Stack>
      </Paper>

      {saveResult && saveResult.failed > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setSaveResult(null)}>
          {saveResult.updated} saved, {saveResult.failed} could not be saved:
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            {saveResult.failures.map((f, i) => (
              <li key={i}>
                <b>{f.name}</b> — {f.error}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {!selectedClass ? (
        <Alert severity="info">Pick a class to begin. Students load in admission-date order.</Alert>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">No students found in this class for {yearName || 'the selected year'}.</Alert>
      ) : (
        <Paper variant="outlined">
          {/* Legend */}
          <Box
            sx={{
              px: 2,
              py: 1,
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              borderBottom: '1px solid',
              borderColor: 'divider',
              fontSize: 12,
              color: 'text.secondary',
              alignItems: 'center',
            }}
          >
            <LegendSwatch bg="#fff8e1" border="#f2d98a" label="edited" />
            <LegendSwatch bg="#fdecef" border="#f4b6c2" label="needs a 10-digit number" />
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Chip size="small" color="success" variant="outlined" label="new" sx={{ height: 18 }} /> creates a guardian record
            </Box>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption">Rows in admission-date order</Typography>
          </Box>

          <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
            <Table stickyHeader size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
              <TableHead>
                {/* Group row */}
                <TableRow>
                  <TableCell sx={{ bgcolor: 'background.paper' }} />
                  <TableCell sx={{ bgcolor: 'background.paper' }} />
                  <TableCell sx={{ bgcolor: 'background.paper' }} />
                  {cols.roll && <TableCell sx={{ bgcolor: 'background.paper' }} />}
                  {cols.house && <TableCell sx={{ bgcolor: 'background.paper' }} />}
                  {cols.examOnly && <TableCell sx={{ bgcolor: 'background.paper' }} />}
                  {cols.rte && <TableCell sx={{ bgcolor: 'background.paper' }} />}
                  {activeContacts.map((rel) => (
                    <TableCell
                      key={rel.key}
                      colSpan={2}
                      align="center"
                      sx={{ bgcolor: 'background.paper', borderLeft: '2px solid', borderColor: 'divider' }}
                    >
                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                          {rel.label}
                        </Typography>
                        <Tooltip title="Fill blank WhatsApp cells from the SMS number">
                          <Link
                            component="button"
                            type="button"
                            underline="none"
                            onClick={() => copySmsToWa(rel.key)}
                            sx={{ fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.3 }}
                          >
                            <CopyIcon sx={{ fontSize: 13 }} /> SMS→WA
                          </Link>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  ))}
                </TableRow>
                {/* Column row */}
                <TableRow>
                  <TableCell sx={{ width: 36 }}>#</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Admitted</TableCell>
                  {cols.roll && <TableCell align="center">Roll</TableCell>}
                  {cols.house && <TableCell>House</TableCell>}
                  {cols.examOnly && (
                    <TableCell align="center">
                      <Tooltip title="Tick students registered here only to sit exams (click to tick all)">
                        <Link
                          component="button"
                          type="button"
                          underline="none"
                          onClick={() => setAllExam(true)}
                          sx={{ fontSize: 11, fontWeight: 700 }}
                        >
                          Exam only
                        </Link>
                      </Tooltip>
                    </TableCell>
                  )}
                  {cols.rte && (
                    <TableCell align="center">
                      <Tooltip title="Tick students admitted under the RTE quota (click to tick all)">
                        <Link
                          component="button"
                          type="button"
                          underline="none"
                          onClick={() => setAllRte(true)}
                          sx={{ fontSize: 11, fontWeight: 700 }}
                        >
                          RTE
                        </Link>
                      </Tooltip>
                    </TableCell>
                  )}
                  {activeContacts.map((rel) => [
                    <TableCell key={`${rel.key}-s`} sx={{ borderLeft: '2px solid', borderColor: 'divider' }}>
                      SMS no.
                    </TableCell>,
                    <TableCell key={`${rel.key}-w`}>WhatsApp no.</TableCell>,
                  ])}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.uuid} hover>
                    <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: avatarColor(i) }}>
                          {r.name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                            {r.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.admissionNumber}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{fmtDate(r.admissionDate)}</TableCell>

                    {cols.roll && (
                      <TableCell align="center" sx={cellSx(isDirty(r.uuid, 'roll'), rollDupes.has(r.roll.trim()) && r.roll.trim())}>
                        <TextField
                          variant="standard"
                          value={r.roll}
                          placeholder="—"
                          onChange={(e) => editRoll(r.uuid, e.target.value)}
                          inputProps={{ inputMode: 'numeric', style: { textAlign: 'center', width: 52, fontWeight: 600 } }}
                          error={Boolean(rollDupes.has(r.roll.trim()) && r.roll.trim())}
                          helperText={rollDupes.has(r.roll.trim()) && r.roll.trim() ? 'dup' : ''}
                          FormHelperTextProps={{ sx: { m: 0, fontSize: 10, textAlign: 'center' } }}
                        />
                      </TableCell>
                    )}

                    {cols.house && (
                      <TableCell sx={cellSx(isDirty(r.uuid, 'house'), false)}>
                        <Select
                          variant="standard"
                          value={r.houseId}
                          displayEmpty
                          onChange={(e) => editHouse(r.uuid, e.target.value)}
                          sx={{ fontSize: 13, minWidth: 110, '& .MuiSelect-select': { pl: 0.5 } }}
                          renderValue={(v) => (v ? houseNameById[v] || '—' : <span style={{ color: '#8f9bb3' }}>Select…</span>)}
                        >
                          <MenuItem value="">—</MenuItem>
                          {houses.map((h) => (
                            <MenuItem key={h.uuid} value={h.uuid}>
                              {h.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                    )}

                    {cols.examOnly && (
                      <TableCell align="center" sx={cellSx(isDirty(r.uuid, 'exam'), false)}>
                        <Checkbox
                          size="small"
                          checked={r.examOnly}
                          onChange={(e) => editExam(r.uuid, e.target.checked)}
                          sx={{ p: 0.25 }}
                        />
                      </TableCell>
                    )}

                    {cols.rte && (
                      <TableCell align="center" sx={cellSx(isDirty(r.uuid, 'rte'), false)}>
                        <Checkbox
                          size="small"
                          checked={r.rte}
                          onChange={(e) => editRte(r.uuid, e.target.checked)}
                          sx={{ p: 0.25 }}
                        />
                      </TableCell>
                    )}

                    {activeContacts.map((rel) => {
                      const c = r[rel.key];
                      const willCreate = !c.guardianId && (c.mobile || c.whatsapp);
                      return [
                        <TableCell
                          key={`${rel.key}-s`}
                          sx={{ ...cellSx(isDirty(r.uuid, `${rel.key}.mobile`), phoneBad(c.mobile)), borderLeft: '2px solid', borderColor: 'divider' }}
                        >
                          <ContactInput
                            value={c.mobile}
                            bad={phoneBad(c.mobile)}
                            adornment={willCreate ? 'new' : ''}
                            onChange={(v) => editContact(r.uuid, rel.key, 'mobile', v)}
                          />
                        </TableCell>,
                        <TableCell key={`${rel.key}-w`} sx={cellSx(isDirty(r.uuid, `${rel.key}.whatsapp`), phoneBad(c.whatsapp))}>
                          <ContactInput
                            value={c.whatsapp}
                            bad={phoneBad(c.whatsapp)}
                            onChange={(v) => editContact(r.uuid, rel.key, 'whatsapp', v)}
                          />
                        </TableCell>,
                      ];
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Save bar */}
          <Box
            sx={{
              position: 'sticky',
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1.25,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {items.length === 0 ? (
              <Chip size="small" color="success" variant="outlined" label="No changes yet" />
            ) : (
              <>
                <Typography variant="body2">
                  <b>{items.length}</b> change{items.length === 1 ? '' : 's'} · <b>{editedRows.size}</b> student
                  {editedRows.size === 1 ? '' : 's'}
                </Typography>
                {invalidCount > 0 && (
                  <Chip size="small" color="warning" label={`${invalidCount} to fix`} />
                )}
              </>
            )}
            <Box sx={{ flex: 1 }} />
            <Button size="small" onClick={handleDiscard} disabled={items.length === 0 || saving}>
              Discard
            </Button>
            <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!canSave}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </Box>
        </Paper>
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2800}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

// Dirty = amber wash + left rail; invalid = pink wash + left rail (invalid wins).
function cellSx(dirty, invalid) {
  if (invalid) return { bgcolor: '#fdecef', boxShadow: 'inset 3px 0 0 #db2b52', p: 0.5 };
  if (dirty) return { bgcolor: '#fff8e1', boxShadow: 'inset 3px 0 0 #f2d98a', p: 0.5 };
  return { p: 0.5 };
}

function ContactInput({ value, bad, adornment, onChange }) {
  return (
    <Box sx={{ position: 'relative' }}>
      {adornment === 'new' && (
        <Typography
          variant="caption"
          sx={{ position: 'absolute', top: -8, left: 2, fontSize: 8.5, fontWeight: 800, color: 'success.main', textTransform: 'uppercase' }}
        >
          new
        </Typography>
      )}
      <TextField
        variant="standard"
        value={value}
        placeholder="—"
        onChange={(e) => onChange(e.target.value)}
        error={bad}
        inputProps={{ inputMode: 'numeric', style: { fontSize: 13, width: 108 } }}
      />
    </Box>
  );
}

function LegendSwatch({ bg, border, label }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: 22, height: 12, borderRadius: '3px', bgcolor: bg, border: `1px solid ${border}` }} />
      {label}
    </Box>
  );
}
