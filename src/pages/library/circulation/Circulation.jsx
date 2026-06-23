import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Tabs, Tab, TextField, Button, Alert, Grid,
  ToggleButtonGroup, ToggleButton, Chip, FormControlLabel, Checkbox, Autocomplete,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  SwapHoriz as IssueIcon, AssignmentReturn as ReturnIcon, Autorenew as RenewIcon, Person as PersonIcon,
} from '@mui/icons-material';
import { libraryService } from '../../../services/libraryService';
import StudentSearchDialog from '../../../components/common/StudentSearchDialog';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '—');
const STATUS_COLORS = { available: 'success', issued: 'warning', lost: 'error', withdrawn: 'default', damaged: 'error' };

// A search box that finds a copy by title/author/keyword/accession and returns it.
function CopySearch({ status, onPick, label }) {
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    if (!q || q.trim().length < 2) { setOpts([]); return; }
    setLoading(true);
    try {
      const data = await libraryService.searchCopies({ q: q.trim(), status, limit: 25 });
      setOpts(data.copies || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  return (
    <Autocomplete
      options={opts}
      loading={loading}
      filterOptions={(x) => x}
      getOptionLabel={(o) => (o && o.accessionNo ? `${o.titleAsPrinted || o.uniformTitle} — ${o.authorDisplay || '—'} · ${o.accessionNo} (${o.status})` : '')}
      isOptionEqualToValue={(a, b) => a.uuid === b.uuid}
      onInputChange={(e, v) => search(v)}
      onChange={(e, v) => { if (v) onPick(v); }}
      renderInput={(p) => <TextField {...p} size="small" label={label || 'Find book (title / author / keyword)'} />}
    />
  );
}

// Shows the resolved book under an accession field.
function BookChip({ book }) {
  if (!book) return null;
  return (
    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Chip size="small" color="primary" variant="outlined" label={book.titleAsPrinted || book.uniformTitle || '—'} />
      <Typography variant="caption" sx={{ color: '#8f9bb3' }}>
        {book.authorDisplay || '—'} · {book.localCallNo || ''} {book.status ? `· ${book.status}` : ''}
      </Typography>
    </Box>
  );
}

export default function Circulation() {
  const [tab, setTab] = useState(0);
  const [issued, setIssued] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const [borrowerType, setBorrowerType] = useState('student');
  const [borrower, setBorrower] = useState(null);
  const [studentDlg, setStudentDlg] = useState(false);
  const [employeeDlg, setEmployeeDlg] = useState(false);

  const [issueAccession, setIssueAccession] = useState('');
  const [issueBook, setIssueBook] = useState(null);
  const [returnAccession, setReturnAccession] = useState('');
  const [returnBook, setReturnBook] = useState(null);
  const [markLost, setMarkLost] = useState(false);
  const [renewAccession, setRenewAccession] = useState('');
  const [renewBook, setRenewBook] = useState(null);

  useEffect(() => { loadIssued(); }, []);

  const loadIssued = async () => {
    setLoading(true);
    try {
      const data = await libraryService.listCirculation({ status: 'issued' });
      setIssued(data.circulations || []);
    } catch { setError('Failed to load issued books'); } finally { setLoading(false); }
  };

  // Resolve a scanned/typed accession to its book for inline confirmation.
  const resolveBook = async (acc, setter) => {
    if (!acc || !acc.trim()) { setter(null); return; }
    try { setter(await libraryService.getCopyByAccession(acc.trim())); } catch { setter(null); }
  };

  const doIssue = async () => {
    setError(''); setResult(null);
    if (!issueAccession.trim()) return setError('Pick or scan a book');
    if (!borrower) return setError('Select a borrower');
    setBusy(true);
    try {
      const r = await libraryService.issue({ accessionNo: issueAccession.trim(), borrowerType, borrowerId: borrower.uuid });
      setResult({ severity: 'success', msg: `Issued to ${borrower.name}. Due ${fmtDate(r.dueDate)}.` });
      setIssueAccession(''); setIssueBook(null);
      loadIssued();
    } catch (err) {
      setResult({ severity: 'error', msg: err.response?.data?.error?.description || 'Issue failed' });
    } finally { setBusy(false); }
  };

  const doReturn = async () => {
    setError(''); setResult(null);
    if (!returnAccession.trim()) return setError('Pick or scan a book');
    setBusy(true);
    try {
      const r = await libraryService.returnBook({ accessionNo: returnAccession.trim(), markLost });
      const fine = r.fine ? ` A ${r.fine.fineType} fine of ₹${Number(r.fine.amount).toFixed(2)} was raised.` : '';
      setResult({ severity: r.fine ? 'warning' : 'success', msg: `${markLost ? 'Marked lost' : 'Returned'}.${fine}` });
      setReturnAccession(''); setReturnBook(null); setMarkLost(false);
      loadIssued();
    } catch (err) {
      setResult({ severity: 'error', msg: err.response?.data?.error?.description || 'Return failed' });
    } finally { setBusy(false); }
  };

  const doRenew = async () => {
    setError(''); setResult(null);
    if (!renewAccession.trim()) return setError('Pick or scan a book');
    setBusy(true);
    try {
      const r = await libraryService.renew({ accessionNo: renewAccession.trim() });
      setResult({ severity: 'success', msg: `Renewed. New due date ${fmtDate(r.dueDate)}.` });
      setRenewAccession(''); setRenewBook(null);
      loadIssued();
    } catch (err) {
      setResult({ severity: 'error', msg: err.response?.data?.error?.description || 'Renew failed' });
    } finally { setBusy(false); }
  };

  const columns = [
    { field: 'titleAsPrinted', headerName: 'Title', flex: 1, minWidth: 200, renderCell: (p) => p.value || '—' },
    { field: 'authorDisplay', headerName: 'Author', flex: 1, minWidth: 150, renderCell: (p) => p.value || '—' },
    { field: 'accessionNo', headerName: 'Accession', width: 130 },
    { field: 'localCallNo', headerName: 'Call No', width: 130, renderCell: (p) => p.value || '—' },
    { field: 'borrowerName', headerName: 'Borrower', width: 150 },
    { field: 'borrowerType', headerName: 'Type', width: 90, renderCell: (p) => <Chip label={p.value} size="small" variant="outlined" /> },
    { field: 'issueDate', headerName: 'Issued', width: 110, valueFormatter: (v) => fmtDate(v) },
    {
      field: 'dueDate', headerName: 'Due', width: 120,
      renderCell: (p) => {
        const overdue = new Date(p.value) < new Date(new Date().toDateString());
        return <Chip label={fmtDate(p.value)} size="small" color={overdue ? 'error' : 'default'} variant={overdue ? 'filled' : 'outlined'} />;
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Circulation</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => { setTab(v); setResult(null); }} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<IssueIcon />} iconPosition="start" label="Issue" />
          <Tab icon={<ReturnIcon />} iconPosition="start" label="Return" />
          <Tab icon={<RenewIcon />} iconPosition="start" label="Renew" />
        </Tabs>
        <CardContent>
          {result && <Alert severity={result.severity} sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.msg}</Alert>}

          {tab === 0 && (
            <>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={5}>
                  <CopySearch status="available" label="Find available book (title / author / keyword)"
                    onPick={(c) => { setIssueAccession(c.accessionNo); setIssueBook(c); }} />
                  <TextField fullWidth size="small" sx={{ mt: 1 }} label="…or scan accession #" value={issueAccession}
                    onChange={(e) => setIssueAccession(e.target.value)} onBlur={(e) => resolveBook(e.target.value, setIssueBook)} />
                  <BookChip book={issueBook} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <ToggleButtonGroup exclusive size="small" value={borrowerType}
                    onChange={(e, v) => { if (v) { setBorrowerType(v); setBorrower(null); } }}>
                    <ToggleButton value="student">Student</ToggleButton>
                    <ToggleButton value="employee">Staff</ToggleButton>
                  </ToggleButtonGroup>
                  <Button fullWidth variant="outlined" sx={{ mt: 1 }} startIcon={<PersonIcon />}
                    onClick={() => (borrowerType === 'student' ? setStudentDlg(true) : setEmployeeDlg(true))}>
                    {borrower ? borrower.name : 'Select borrower'}
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button fullWidth variant="contained" startIcon={<IssueIcon />} onClick={doIssue} disabled={busy}>Issue</Button>
                </Grid>
              </Grid>
            </>
          )}

          {tab === 1 && (
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={6}>
                <CopySearch status="issued" label="Find issued book (title / author / keyword)"
                  onPick={(c) => { setReturnAccession(c.accessionNo); setReturnBook(c); }} />
                <TextField fullWidth size="small" sx={{ mt: 1 }} label="…or scan accession #" value={returnAccession}
                  onChange={(e) => setReturnAccession(e.target.value)} onBlur={(e) => resolveBook(e.target.value, setReturnBook)} />
                <BookChip book={returnBook} />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel control={<Checkbox checked={markLost} onChange={(e) => setMarkLost(e.target.checked)} />} label="Mark as lost" />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button fullWidth variant="contained" color={markLost ? 'error' : 'primary'} startIcon={<ReturnIcon />} onClick={doReturn} disabled={busy}>
                  {markLost ? 'Mark lost' : 'Return'}
                </Button>
              </Grid>
            </Grid>
          )}

          {tab === 2 && (
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={8}>
                <CopySearch status="issued" label="Find issued book (title / author / keyword)"
                  onPick={(c) => { setRenewAccession(c.accessionNo); setRenewBook(c); }} />
                <TextField fullWidth size="small" sx={{ mt: 1 }} label="…or scan accession #" value={renewAccession}
                  onChange={(e) => setRenewAccession(e.target.value)} onBlur={(e) => resolveBook(e.target.value, setRenewBook)} />
                <BookChip book={renewBook} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button fullWidth variant="contained" startIcon={<RenewIcon />} onClick={doRenew} disabled={busy}>Renew</Button>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>Currently issued ({issued.length})</Typography>
      <Card>
        <DataGrid
          rows={issued}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 }, '& .MuiDataGrid-cell': { borderBottom: '1px solid #e4e9f2' } }}
        />
      </Card>

      <StudentSearchDialog open={studentDlg} onClose={() => setStudentDlg(false)} onSelect={(s) => setBorrower(s)} />
      <EmployeeSearchDialog open={employeeDlg} onClose={() => setEmployeeDlg(false)} onSelect={(e) => setBorrower(e)} />
    </Box>
  );
}
