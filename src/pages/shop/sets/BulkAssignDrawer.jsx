import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer, Box, Typography, IconButton, TextField, MenuItem, Button, Checkbox,
  List, ListItem, ListItemButton, ListItemText, Divider, Alert, CircularProgress, Chip,
  InputAdornment,
} from '@mui/material';
import { Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import { studentService } from '../../../services/studentService';
import shopService from '../../../services/shopService';
import { todayIso } from '../../../utils/date';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import DiscountField, { emptyDiscount, discountPayload, payableFrom } from '../components/DiscountField';

const formatCurrency = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const parseGrade = (name) => { const n = (name || '').trim(); const i = n.lastIndexOf('-'); return i <= 0 ? n : n.slice(0, i).trim(); };
const gradeEq = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

export default function BulkAssignDrawer({ open, onClose, set, onDone }) {
  const { academicYearId, years } = useAcademicYear();
  // Fall back to the year that matches the set's session if the global selector
  // hasn't resolved yet — otherwise the search returns no className and no
  // students match the grade.
  const yearId = academicYearId || (years || []).find(y => y.name === set?.academicSession)?.uuid || '';
  const [students, setStudents] = useState([]);
  const [assignedIds, setAssignedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState({}); // studentId -> true
  const [discount, setDiscount] = useState(emptyDiscount());
  const [saleDate, setSaleDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !set) return;
    setLoading(true); setError(''); setPicked({}); setSearch(''); setSection('');
    const params = yearId ? { academicYearId: yearId } : {};
    Promise.all([
      studentService.searchStudents(params).then(r => r || []),
      shopService.getSales({ setId: set.uuid }).then(r => r || []),
    ]).then(([studs, sales]) => {
      // className only comes back on a year-scoped search; match grade case-insensitively
      // ("NURSERY-A" -> "NURSERY" vs stored grade "Nursery").
      const inGrade = studs.filter(s => gradeEq(parseGrade(s.className), set.grade));
      setStudents(inGrade);
      setAssignedIds(new Set(sales.map(s => s.studentId)));
    }).catch(() => setError('Failed to load students')).finally(() => setLoading(false));
  }, [open, set, yearId]);

  const sections = useMemo(
    () => [...new Set(students.map(s => s.className).filter(Boolean))].sort(),
    [students]);

  const visible = useMemo(() => students.filter(s => {
    if (section && s.className !== section) return false;
    if (search.trim() && !(`${s.name} ${s.admissionNumber || ''}`.toLowerCase().includes(search.trim().toLowerCase()))) return false;
    return true;
  }), [students, section, search]);

  const pickedIds = Object.keys(picked).filter(k => picked[k]);
  const base = set?.setPrice || 0;
  const payable = payableFrom(base, discount);

  const toggle = (id) => setPicked(p => ({ ...p, [id]: !p[id] }));
  const allVisibleAssignable = visible.filter(s => !assignedIds.has(s.uuid));
  const allPicked = allVisibleAssignable.length > 0 && allVisibleAssignable.every(s => picked[s.uuid]);
  const toggleAll = () => {
    if (allPicked) { const n = { ...picked }; allVisibleAssignable.forEach(s => delete n[s.uuid]); setPicked(n); }
    else { const n = { ...picked }; allVisibleAssignable.forEach(s => n[s.uuid] = true); setPicked(n); }
  };

  const submit = async () => {
    if (pickedIds.length === 0) { setError('Tick at least one student'); return; }
    setSaving(true); setError('');
    try {
      const res = await shopService.assignSetBulk({
        setId: set.uuid,
        studentIds: pickedIds,
        saleDate,
        ...discountPayload(discount),
      });
      onDone?.(res);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.description || err.response?.data?.error?.message || 'Failed to assign');
    } finally { setSaving(false); }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}>
      {set && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
            <Box>
              <Typography variant="h6">Assign Grade {set.grade} set</Typography>
              <Typography variant="body2" color="text.secondary">{formatCurrency(set.setPrice)} · {set.academicSession}</Typography>
            </Box>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Box>

          <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
            <TextField select size="small" label="Section" value={section} onChange={e => setSection(e.target.value)} sx={{ width: 130 }}>
              <MenuItem value="">All sections</MenuItem>
              {sections.map(sec => <MenuItem key={sec} value={sec}>{sec}</MenuItem>)}
            </TextField>
            <TextField size="small" fullWidth placeholder="Search name / adm no" value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          </Box>

          {!loading && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1, display: 'block' }}>
              {students.length} student{students.length === 1 ? '' : 's'} in Grade {set.grade} across {sections.length} section{sections.length === 1 ? '' : 's'}
              {(section || search) ? ` · showing ${visible.length}` : ''}
            </Typography>
          )}

          {error && <Alert severity="error" sx={{ mx: 2, mb: 1 }} onClose={() => setError('')}>{error}</Alert>}

          <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : visible.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2 }}>No students found for this grade{yearId ? '' : ' — pick an academic year first'}.</Typography>
            ) : (
              <List dense>
                <ListItemButton onClick={toggleAll} sx={{ py: 0 }}>
                  <Checkbox edge="start" checked={allPicked} indeterminate={!allPicked && allVisibleAssignable.some(s => picked[s.uuid])} tabIndex={-1} />
                  <ListItemText primary={`Select all shown (${allVisibleAssignable.length})`} />
                </ListItemButton>
                <Divider />
                {visible.map(s => {
                  const done = assignedIds.has(s.uuid);
                  return (
                    <ListItem key={s.uuid} disablePadding
                      secondaryAction={done ? <Chip size="small" label="assigned" color="success" variant="outlined" /> : null}>
                      <ListItemButton onClick={() => !done && toggle(s.uuid)} disabled={done}>
                        <Checkbox edge="start" checked={!!picked[s.uuid] && !done} disabled={done} tabIndex={-1} />
                        <ListItemText primary={s.name} secondary={`${s.className || ''}${s.admissionNumber ? ` · #${s.admissionNumber}` : ''}`} />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>

          <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <DiscountField base={base} value={discount} onChange={setDiscount} />
              <TextField size="small" type="date" label="Date" value={saleDate}
                onChange={e => setSaleDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {pickedIds.length} student(s) · {formatCurrency(payable)} each
              </Typography>
              <Button variant="contained" onClick={submit} disabled={saving || pickedIds.length === 0}>
                {saving ? 'Assigning...' : `Assign to ${pickedIds.length}`}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
