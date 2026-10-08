import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Button, Chip, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, IconButton, Breadcrumbs, Link, LinearProgress, Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, AutoFixHigh as GenIcon } from '@mui/icons-material';
import EmployeeSearchDialog from '../../components/common/EmployeeSearchDialog';
import { clubService } from '../../services/clubService';
import { useCan } from '../../permissions/can';

export default function PlanningBoard() {
  const { id } = useParams();
  return id ? <PlanEditor planId={id} /> : <PlanList />;
}

// ── List ────────────────────────────────────────────────────────────────────────
function PlanList() {
  const navigate = useNavigate();
  const can = useCan();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPlans(await clubService.listPlans({})); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load plans'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>Planning Board</Typography>
        {can('club.plan.manage') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}>New plan</Button>}
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <Card variant="outlined"><Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Title</TableCell><TableCell>Scope</TableCell><TableCell>Coverage</TableCell><TableCell>Assignments</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.uuid} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/club/plans/${p.uuid}`)}>
                <TableCell>{p.planDate}</TableCell><TableCell>{p.title || '—'}</TableCell>
                <TableCell>{p.participationScope}</TableCell><TableCell>{p.coverage}</TableCell>
                <TableCell>{p.assignmentCount}</TableCell>
                <TableCell><Chip size="small" label={p.status} color={p.status === 'published' ? 'success' : p.status === 'closed' ? 'default' : p.status === 'cancelled' ? 'error' : 'warning'} /></TableCell>
              </TableRow>
            ))}
            {!plans.length && <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No plans yet.</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Box></Card>
      {newOpen && <NewPlanDialog onClose={() => setNewOpen(false)} onSaved={(pid) => navigate(`/club/plans/${pid}`)} />}
    </Box>
  );
}

function NewPlanDialog({ onClose, onSaved }) {
  const [form, setForm] = useState({ planDate: '', title: '', participationScope: 'whole', coverage: 'selective' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setErr('');
    try { const r = await clubService.createPlan(form); onSaved(r.uuid); }
    catch (e) { setErr(e.response?.data?.error?.description || 'Create failed'); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New plan</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.planDate} onChange={set('planDate')} size="small" />
        <TextField label="Title" value={form.title} onChange={set('title')} size="small" />
        <TextField label="Scope" select value={form.participationScope} onChange={set('participationScope')} size="small">
          {['whole', 'grades', 'groups'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField label="Coverage" select value={form.coverage} onChange={set('coverage')} size="small" helperText="Complete = every group must be assigned before publish">
          {['selective', 'complete'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack></DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy || !form.planDate} onClick={save}>Create</Button></DialogActions>
    </Dialog>
  );
}

// ── Editor ──────────────────────────────────────────────────────────────────────
function PlanEditor({ planId }) {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('club.plan.manage');
  const canPublish = can('club.plan.publish');
  const [plan, setPlan] = useState(null);
  const [validation, setValidation] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [assignDialog, setAssignDialog] = useState(null); // { group, slot, current }
  const [customOpen, setCustomOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [p, acts] = await Promise.all([
        clubService.getPlan(planId),
        clubService.listActivities({ availability: 'available', versionStatus: 'approved' }),
      ]);
      setPlan(p); setActivities(acts);
      setValidation(await clubService.validatePlan(planId));
    } catch (e) { setErr(e.response?.data?.error?.description || 'Failed to load plan'); }
    finally { setLoading(false); }
  }, [planId]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, okMsg) => {
    setErr(''); setMsg('');
    try { await fn(); setMsg(okMsg || 'Done'); await load(); }
    catch (e) {
      let d = e.response?.data?.error?.description || 'Action failed';
      try { const parsed = JSON.parse(d); if (parsed.message) d = parsed.message; } catch { /* plain */ }
      setErr(d);
    }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!plan) return <Alert severity="error">Plan not found</Alert>;
  const draft = plan.status === 'draft';
  const published = plan.status === 'published';
  const assignOf = (gId, sId) => plan.assignments.find((a) => a.groupId === gId && a.slotId === sId && a.state === 'scheduled');

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link component="button" onClick={() => navigate('/club/plans')}>Planning Board</Link>
        <Typography color="text.primary">{plan.planDate}</Typography>
      </Breadcrumbs>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>{plan.title || 'Saturday'} · {plan.planDate}</Typography>
        <Chip label={plan.status} color={published ? 'success' : plan.status === 'closed' ? 'default' : 'warning'} />
        {draft && canPublish && <Button variant="contained" disabled={!validation?.ready} onClick={() => act(() => clubService.publishPlan(planId, plan.rowVersion), 'Published')}>Publish ▸</Button>}
        {published && canPublish && <Button variant="outlined" onClick={() => act(() => clubService.closePlan(planId), 'Closed')}>Close</Button>}
        {plan.status === 'closed' && canPublish && <Button variant="outlined" onClick={() => act(() => clubService.reopenPlan(planId), 'Reopened')}>Reopen</Button>}
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {validation && (
        <Card variant="outlined" sx={{ mb: 2 }}><CardContent sx={{ py: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{plan.coverage === 'complete' ? 'Complete coverage' : 'Selective'}</Typography>
            <Box sx={{ flex: 1, minWidth: 160, maxWidth: 280 }}>
              <LinearProgress variant="determinate" value={validation.coverage.inScope ? (validation.coverage.assigned / validation.coverage.inScope) * 100 : 0} color={validation.ready ? 'success' : 'warning'} />
            </Box>
            <Typography variant="caption">{validation.coverage.assigned}/{validation.coverage.inScope} groups · {validation.coverage.unassigned} unassigned</Typography>
            {validation.blockers.map((b, i) => <Tooltip key={i} title={b.message}><Chip size="small" color="error" label={b.code} /></Tooltip>)}
            {validation.warnings.map((w, i) => <Tooltip key={i} title={w.message}><Chip size="small" color="warning" variant="outlined" label={w.code} /></Tooltip>)}
            {validation.ready && <Chip size="small" color="success" label="Ready to publish" />}
          </Stack>
        </CardContent></Card>
      )}

      {/* Slots + Groups controls */}
      {draft && canManage && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <SlotAdder onAdd={(b) => act(() => clubService.addSlot(planId, b), 'Slot added')} />
          <Button size="small" startIcon={<GenIcon />} onClick={() => act(() => clubService.generateGroups(planId), 'Groups generated from classes')}>Generate from classes</Button>
          <Button size="small" startIcon={<GenIcon />} onClick={() => act(() => clubService.generateHouses(planId), 'Groups generated from houses')}>Generate from houses</Button>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setCustomOpen(true)}>Custom group</Button>
        </Stack>
      )}
      {customOpen && (
        <CustomGroupDialog
          onClose={() => setCustomOpen(false)}
          onCreate={(body) => { setCustomOpen(false); act(() => clubService.addGroup(planId, body), 'Custom group added'); }}
        />
      )}

      {/* Assignment grid: rows = groups, cols = slots */}
      <Card variant="outlined"><Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Group</TableCell>
            {plan.slots.map((s) => (
              <TableCell key={s.uuid}>{s.label || `${s.startTime}–${s.endTime}`}
                {draft && canManage && <IconButton size="small" onClick={() => act(() => clubService.removeSlot(planId, s.uuid), 'Slot removed')}><DeleteIcon fontSize="inherit" /></IconButton>}
              </TableCell>
            ))}
            {!plan.slots.length && <TableCell><Typography variant="caption" color="text.secondary">Add a slot →</Typography></TableCell>}
          </TableRow></TableHead>
          <TableBody>
            {plan.groups.map((g) => (
              <TableRow key={g.uuid} hover>
                <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {g.labelSnapshot}{g.strengthSnapshot ? ` · ${g.strengthSnapshot}` : ''}
                  {draft && canManage && <IconButton size="small" onClick={() => act(() => clubService.removeGroup(planId, g.uuid), 'Group removed')}><DeleteIcon fontSize="inherit" /></IconButton>}
                </TableCell>
                {plan.slots.map((s) => {
                  const a = assignOf(g.uuid, s.uuid);
                  return (
                    <TableCell key={s.uuid}>
                      {a ? (
                        <Box sx={{ cursor: (draft || published) ? 'pointer' : 'default' }} onClick={() => (draft || published) && (canManage || canPublish) && setAssignDialog({ group: g, slot: s, current: a })}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.activityTitle || 'Activity'}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.teacherName || 'No teacher'}{a.venueNameSnapshot ? ` · ${a.venueNameSnapshot}` : ''}</Typography>
                        </Box>
                      ) : (
                        (draft || published) && (canManage || canPublish)
                          ? <Button size="small" onClick={() => setAssignDialog({ group: g, slot: s, current: null })}>Assign</Button>
                          : <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {!plan.groups.length && <TableRow><TableCell colSpan={(plan.slots.length || 1) + 1}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No groups yet — generate from classes or add one.</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Box></Card>

      {assignDialog && (
        <AssignDialog
          activities={activities} info={assignDialog} published={published}
          onClose={() => setAssignDialog(null)}
          onSave={(body) => { setAssignDialog(null); act(() => published ? clubService.changeAssignment(planId, body) : clubService.saveAssignment(planId, body), 'Assignment saved'); }}
          onCancelAssignment={(aid, reason) => { setAssignDialog(null); act(() => clubService.cancelAssignment(aid, reason), 'Assignment cancelled'); }}
        />
      )}
    </Box>
  );
}

function SlotAdder({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ startTime: '09:00', endTime: '10:00', label: '' });
  return (
    <>
      <Button size="small" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Add slot</Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)}><DialogTitle>Add slot</DialogTitle>
          <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" type="time" label="Start" InputLabelProps={{ shrink: true }} value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} />
            <TextField size="small" type="time" label="End" InputLabelProps={{ shrink: true }} value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} />
            <TextField size="small" label="Label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          </Stack></DialogContent>
          <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => { onAdd(f); setOpen(false); }}>Add</Button></DialogActions>
        </Dialog>
      )}
    </>
  );
}

// Build a custom group by picking students from one or more classes. Selections accumulate
// across classes; name it and create. Stored as a 'selected' group with a member roster.
function CustomGroupDialog({ onClose, onCreate }) {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [picked, setPicked] = useState({}); // studentId -> { name, className }
  const [label, setLabel] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { clubService.pickerClasses().then(setClasses).catch(() => setClasses([])); }, []);
  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    setLoadingStudents(true);
    clubService.pickerClassStudents(classId).then(setStudents).catch(() => setStudents([])).finally(() => setLoadingStudents(false));
  }, [classId]);

  const className = classes.find((c) => c.uuid === classId)?.name || '';
  const toggle = (s) => setPicked((p) => {
    const next = { ...p };
    if (next[s.uuid]) delete next[s.uuid]; else next[s.uuid] = { name: s.name, className };
    return next;
  });
  const ids = Object.keys(picked);

  const create = () => {
    if (!label.trim()) { setErr('Give the group a name'); return; }
    if (!ids.length) { setErr('Pick at least one student'); return; }
    onCreate({
      sourceType: 'selected',
      label: label.trim(),
      strength: ids.length,
      members: ids.map((id) => ({ studentId: id, studentName: picked[id].name })),
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Custom group</DialogTitle>
      <DialogContent>
        {err && <Alert severity="warning" sx={{ mb: 1 }}>{err}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField size="small" label="Group name" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Diorama team" />
          <TextField size="small" select label="Add students from class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}{c.strength ? ` (${c.strength})` : ''}</MenuItem>)}
          </TextField>
          {classId && (
            <Box sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
              {loadingStudents ? <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={22} /></Box> : students.map((s) => (
                <Stack key={s.uuid} direction="row" alignItems="center" spacing={1} sx={{ py: 0.3 }}>
                  <input type="checkbox" checked={!!picked[s.uuid]} onChange={() => toggle(s)} />
                  <Typography variant="body2">{s.name}{s.admissionNumber ? ` · ${s.admissionNumber}` : ''}</Typography>
                </Stack>
              ))}
              {!loadingStudents && !students.length && <Typography variant="caption" color="text.secondary">No students in this class.</Typography>}
            </Box>
          )}
          {ids.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">Picked ({ids.length}):</Typography>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {ids.slice(0, 30).map((id) => <Chip key={id} size="small" label={picked[id].name} onDelete={() => setPicked((p) => { const n = { ...p }; delete n[id]; return n; })} />)}
                {ids.length > 30 && <Chip size="small" label={`+${ids.length - 30} more`} />}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={create}>Create group ({ids.length})</Button>
      </DialogActions>
    </Dialog>
  );
}

function AssignDialog({ activities, info, published, onClose, onSave, onCancelAssignment }) {
  const cur = info.current;
  const [activityVersionId, setAvid] = useState(cur?.activityVersionId || '');
  const [teacher, setTeacher] = useState(cur ? { uuid: cur.teacherEmployeeId, name: cur.teacherName } : null);
  const [venueName, setVenue] = useState(cur?.venueNameSnapshot || '');
  const [empOpen, setEmpOpen] = useState(false);
  const save = () => onSave({
    slotId: info.slot.uuid, groupId: info.group.uuid, activityVersionId,
    teacherEmployeeId: teacher?.uuid || null, venueName, venueRef: teacher ? (cur?.venueRef || venueName) : (cur?.venueRef || venueName),
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{info.group.labelSnapshot} · {info.slot.label || `${info.slot.startTime}–${info.slot.endTime}`}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
        <TextField size="small" label="Activity" select value={activityVersionId} onChange={(e) => setAvid(e.target.value)}>
          {activities.map((a) => <MenuItem key={a.currentVersionId || a.uuid} value={a.currentVersionId}>{a.title} ({a.activityCode})</MenuItem>)}
          {!activities.length && <MenuItem disabled value="">No released activities — release some in the bank first</MenuItem>}
        </TextField>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" label="Teacher" value={teacher?.name || ''} InputProps={{ readOnly: true }} sx={{ flex: 1 }} />
          <Button onClick={() => setEmpOpen(true)}>Pick</Button>
          {teacher && <Button color="inherit" onClick={() => setTeacher(null)}>Clear</Button>}
        </Stack>
        <TextField size="small" label="Venue" value={venueName} onChange={(e) => setVenue(e.target.value)} />
        {published && <Alert severity="info">This is a published plan — saving records a controlled change.</Alert>}
      </Stack></DialogContent>
      <DialogActions>
        {cur && <Button color="error" onClick={() => onCancelAssignment(cur.uuid, 'Cancelled from board')} sx={{ mr: 'auto' }}>Cancel assignment</Button>}
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" disabled={!activityVersionId} onClick={save}>Save</Button>
      </DialogActions>
      <EmployeeSearchDialog open={empOpen} onClose={() => setEmpOpen(false)} onSelect={(e) => setTeacher({ uuid: e.uuid, name: e.name })} />
    </Dialog>
  );
}
