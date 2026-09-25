import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, Checkbox,
  Alert, CircularProgress, Autocomplete, Chip,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import shopService from '../../../services/shopService';
import { studentService } from '../../../services/studentService';
import { todayIso } from '../../../utils/date';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import DiscountField, { emptyDiscount, discountPayload, payableFrom } from '../components/DiscountField';

const formatCurrency = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0';
// "I-A" -> "I"; name without a hyphen is its own grade.
const parseGrade = (name) => {
  const n = (name || '').trim();
  const i = n.lastIndexOf('-');
  return i <= 0 ? n : n.slice(0, i).trim();
};

export default function ShopAssignForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { academicYearId, years } = useAcademicYear();
  const sessionName = useMemo(() => years.find(y => y.uuid === academicYearId)?.name || '', [years, academicYearId]);

  const [students, setStudents] = useState([]);
  const [sets, setSets] = useState([]);
  const [student, setStudent] = useState(null);
  const [setId, setSetId] = useState(searchParams.get('setId') || '');
  const [setDetail, setSetDetail] = useState(null);
  const [declined, setDeclined] = useState({}); // setItemUuid -> true
  const [form, setForm] = useState({ saleDate: todayIso(), amountPaid: '', notes: '' });
  const [discount, setDiscount] = useState(emptyDiscount());
  const [loadingSet, setLoadingSet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = academicYearId ? { academicYearId } : {};
    studentService.searchStudents(params).then(r => setStudents(r || [])).catch(() => {});
    shopService.getSets(sessionName ? { academicSession: sessionName } : {}).then(setSets).catch(() => {});
  }, [academicYearId, sessionName]);

  // Load recipe whenever the chosen set changes.
  useEffect(() => {
    if (!setId) { setSetDetail(null); return; }
    setLoadingSet(true);
    shopService.getSetById(setId)
      .then(s => { setSetDetail(s); setDeclined({}); })
      .catch(() => setError('Failed to load set'))
      .finally(() => setLoadingSet(false));
  }, [setId]);

  // When a student is picked, jump to their grade's set (if one exists).
  const onStudent = (val) => {
    setStudent(val);
    if (val?.className) {
      const grade = parseGrade(val.className).toLowerCase();
      const match = sets.find(s => (s.grade || '').toLowerCase() === grade);
      if (match) setSetId(match.uuid);
    }
  };

  const lines = setDetail?.items || [];
  const included = lines.filter(l => !declined[l.uuid]);
  const includedTotal = included.reduce((s, l) => s + (l.lineTotal || 0), 0);
  const total = payableFrom(includedTotal, discount); // after set-level discount
  const setPrice = setDetail?.setPrice || 0;
  const declineSavings = setPrice - includedTotal;

  const handleSubmit = async () => {
    if (!student?.uuid) { setError('Select a student'); return; }
    if (!setId) { setError('Select a set'); return; }
    if (form.amountPaid === '' || parseFloat(form.amountPaid) < 0) { setError('Amount paid is required'); return; }

    setSaving(true);
    try {
      await shopService.assignSet({
        studentId: student.uuid,
        setId,
        saleDate: form.saleDate,
        amountPaid: parseFloat(form.amountPaid),
        notes: form.notes || undefined,
        declinedSetItemIds: Object.keys(declined).filter(k => declined[k]),
        ...discountPayload(discount),
      });
      navigate('/shop/sales');
    } catch (err) {
      setError(err.response?.data?.error?.description || err.response?.data?.error?.message || 'Failed to assign set');
    } finally { setSaving(false); }
  };

  const books = lines.filter(l => l.itemType === 'book');
  const stationery = lines.filter(l => l.itemType !== 'book');

  const renderRows = (group, title) => group.length ? (
    <>
      <TableRow sx={{ bgcolor: '#f7f9fc' }}><TableCell colSpan={5} sx={{ fontWeight: 700, color: '#5b6a85' }}>{title}</TableCell></TableRow>
      {group.map(l => {
        const off = !!declined[l.uuid];
        return (
          <TableRow key={l.uuid} sx={{ opacity: off ? 0.45 : 1 }}>
            <TableCell padding="checkbox">
              <Checkbox checked={!off} onChange={e => setDeclined(p => ({ ...p, [l.uuid]: !e.target.checked }))} />
            </TableCell>
            <TableCell sx={{ textDecoration: off ? 'line-through' : 'none' }}>{l.itemName}</TableCell>
            <TableCell align="center">{l.quantity}</TableCell>
            <TableCell align="right">{l.discountPct ? `${l.discountPct}%` : '—'}</TableCell>
            <TableCell align="right"><Typography fontWeight={600}>{formatCurrency(l.lineTotal)}</Typography></TableCell>
          </TableRow>
        );
      })}
    </>
  ) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconBack onClick={() => navigate('/shop/sales')} />
        <Typography variant="h4">Assign Set to Student</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={students}
                value={student}
                getOptionLabel={opt => opt?.name ? `${opt.name}${opt.className ? ` · ${opt.className}` : ''}${opt.admissionNumber ? ` (#${opt.admissionNumber})` : ''}` : ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                onChange={(_, val) => onStudent(val)}
                renderInput={(params) => <TextField {...params} label="Student" placeholder="Search by name..." />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Set" value={setId} onChange={e => setSetId(e.target.value)} size="small">
                <MenuItem value="">— Select a set —</MenuItem>
                {sets.map(s => <MenuItem key={s.uuid} value={s.uuid}>Grade {s.grade} · {s.academicSession} · {formatCurrency(s.setPrice)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Date" type="date" value={form.saleDate}
                onChange={e => setForm(p => ({ ...p, saleDate: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="Notes (optional)" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} size="small" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loadingSet ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : setDetail ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Items in the set</Typography>
              <Typography variant="body2" color="text.secondary">Untick anything the student doesn't want — it goes back to the loose box.</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 60 }} align="center">Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 70 }} align="right">Disc.</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 110 }} align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {renderRows(books, 'Books')}
                {renderRows(stationery, 'Stationery')}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {setDetail && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Set price {formatCurrency(setPrice)}
                  {declineSavings > 0 && <Chip size="small" color="warning" variant="outlined" sx={{ ml: 1 }} label={`− ${formatCurrency(declineSavings)} declined`} />}
                </Typography>
                <Box sx={{ mt: 1 }}><DiscountField base={includedTotal} value={discount} onChange={setDiscount} /></Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>Payable {formatCurrency(total)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Amount Paid (₹)" type="number" value={form.amountPaid}
                  onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))} size="small" inputProps={{ min: 0 }} />
                <Button size="small" onClick={() => setForm(p => ({ ...p, amountPaid: String(total) }))} sx={{ mt: 0.5 }}>Pay full</Button>
                {form.amountPaid !== '' && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Balance: <strong style={{ color: total - parseFloat(form.amountPaid || 0) > 0 ? '#ff3d71' : '#00d68f' }}>
                      {formatCurrency(total - parseFloat(form.amountPaid || 0))}</strong>
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                <Button variant="contained" size="large" onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Assigning...' : 'Assign Set'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// Small back button (avoids an extra import line above).
function IconBack({ onClick }) {
  return <Button onClick={onClick} sx={{ minWidth: 0, p: 1 }}><BackIcon /></Button>;
}
