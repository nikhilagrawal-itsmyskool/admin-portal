import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Button, Chip, Alert, CircularProgress, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Switch, FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Publish as PublishIcon,
  Unpublished as UnpublishIcon, ChevronRight as OpenIcon,
} from '@mui/icons-material';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useCan } from '../../permissions/can';
import { useIsMobile } from '../../hooks/useIsMobile';
import { examinationService } from '../../services/examinationService';

const STATUS_COLOR = { draft: 'default', published: 'success', archived: 'warning' };

export default function ExaminationList() {
  const navigate = useNavigate();
  const { academicYearId } = useAcademicYear();
  const canManage = useCan()('exam.manage');
  const isMobile = useIsMobile();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const [hasInvigilation, setHasInvigilation] = useState(true);
  const [hasAdmitCards, setHasAdmitCards] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true); setErr('');
    try {
      setExams(await examinationService.list({ academicYearId }));
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load examinations');
    } finally { setLoading(false); }
  }, [academicYearId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true); setErr('');
    try {
      const exam = await examinationService.create({ name: name.trim(), academicYearId, cardsPerPage, hasInvigilation, hasAdmitCards });
      setCreateOpen(false); setName(''); setCardsPerPage(4); setHasInvigilation(true); setHasAdmitCards(true);
      navigate(`/examinations/${exam.uuid}`);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to create the exam');
    } finally { setSaving(false); }
  };

  const togglePublish = async (exam) => {
    setErr('');
    try {
      await examinationService.update(exam.uuid, { status: exam.status === 'published' ? 'draft' : 'published' });
      load();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to change status');
    }
  };

  const remove = async (exam) => {
    if (!window.confirm(`Delete "${exam.name}"? This removes its datesheet and invigilator assignments.`)) return;
    setErr('');
    try {
      await examinationService.remove(exam.uuid);
      load();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to delete');
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="h4">Examinations</Typography>
        <Box sx={{ flex: 1 }} />
        {canManage && !isMobile && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Exam
          </Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Build each exam's datesheet (grade × date) and assign invigilators. Admit cards, dues gating and digital signatures come next.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
          ) : exams.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No examinations yet for this academic year.
            </Typography>
          ) : isMobile ? (
            <Stack spacing={1}>
              {exams.map((e) => (
                <Paper key={e.uuid} variant="outlined"
                  sx={{ p: 1.25, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                  onClick={() => navigate(`/examinations/${e.uuid}`)}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }} noWrap>{e.name}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      <Chip size="small" label={e.status} color={STATUS_COLOR[e.status] || 'default'} />
                      {e.grades?.length ? <Chip size="small" variant="outlined" label={`${e.grades[0]}–${e.grades[e.grades.length - 1]}`} /> : null}
                      <Chip size="small" variant="outlined" label={`${e.paperCount ?? 0} papers`} />
                    </Stack>
                  </Box>
                  <OpenIcon color="disabled" />
                </Paper>
              ))}
            </Stack>
          ) : (
            <Table
              size="small"
              sx={{
                '& thead th': {
                  bgcolor: 'action.hover', fontWeight: 700, fontSize: 11.5,
                  textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary',
                  borderBottom: 2, borderColor: 'divider',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Papers</TableCell>
                  <TableCell>Incharge</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exams.map((e) => (
                  <TableRow key={e.uuid} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/examinations/${e.uuid}`)}>
                    <TableCell>{e.name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={e.status} color={STATUS_COLOR[e.status] || 'default'} />
                    </TableCell>
                    <TableCell align="center">{e.paperCount ?? 0}</TableCell>
                    <TableCell>{e.inchargeName || <span style={{ opacity: 0.5 }}>—</span>}</TableCell>
                    <TableCell align="right" onClick={(ev) => ev.stopPropagation()}>
                      {canManage && (
                        <Tooltip title={e.status === 'published' ? 'Unpublish' : 'Publish'}>
                          <IconButton size="small" onClick={() => togglePublish(e)}>
                            {e.status === 'published' ? <UnpublishIcon fontSize="small" /> : <PublishIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}
                      {canManage && (
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => remove(e)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Open">
                        <IconButton size="small" onClick={() => navigate(`/examinations/${e.uuid}`)}>
                          <OpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Examination</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Name" placeholder="e.g. Half Yearly Examination"
            value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1, mb: 2 }}
          />
          <FormControlLabel sx={{ display: 'block', ml: 0 }}
            control={<Switch checked={hasInvigilation} onChange={(e) => setHasInvigilation(e.target.checked)} />}
            label="Assign invigilators" />
          <FormControlLabel sx={{ display: 'block', ml: 0, mb: 1 }}
            control={<Switch checked={hasAdmitCards} onChange={(e) => setHasAdmitCards(e.target.checked)} />}
            label="Issue admit cards" />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Turn both off for a datesheet-only exam (e.g. an oral test).
          </Typography>
          {hasAdmitCards && (
            <TextField
              select fullWidth label="Admit cards per A4 page"
              value={cardsPerPage} onChange={(e) => setCardsPerPage(Number(e.target.value))}
              helperText="Default for printing; changeable later"
            >
              <MenuItem value={4}>4 per page</MenuItem>
              <MenuItem value={3}>3 per page</MenuItem>
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={saving || !name.trim()}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
