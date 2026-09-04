import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Alert, CircularProgress, Stack, Paper, Typography, IconButton, Tooltip,
  Autocomplete, TextField, MenuItem, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon, Print as PrintIcon,
  ContentCopy as CopyIcon, MeetingRoom as RoomIcon, PhotoCamera as PhotoIcon, Image as ImageIcon,
} from '@mui/icons-material';
import { examinationService } from '../../services/examinationService';
import { printSeatingPlan } from './seatingPlanHtml';

// Read a File into { base64 (no data: prefix), mimeType, fileName }.
const readFile = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve({ base64: String(r.result).split(',')[1], mimeType: file.type || 'image/jpeg', fileName: file.name || 'seating.jpg' });
  r.onerror = reject;
  r.readAsDataURL(file);
});

// Desktop seating-scheme builder: rooms, each seating a mix of sections by roll-range.
// One card per room with an editable allocation table; copy a whole scheme from another
// exam; print the plan in the school's sheet format.
export default function SeatingTab({ examId, exam, canManage }) {
  const [rooms, setRooms] = useState([]);
  const [sections, setSections] = useState([]);
  const [otherExams, setOtherExams] = useState([]);
  const [edits, setEdits] = useState({}); // roomId -> [{sectionClassId, rollFrom, rollTo}]
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [planImg, setPlanImg] = useState(null); // { fileId, dataUri }
  const [roomImgHas, setRoomImgHas] = useState({}); // roomId -> bool
  const [viewImg, setViewImg] = useState(null); // { name, dataUri }

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [r, inv, list, img] = await Promise.all([
        examinationService.getRooms(examId),
        examinationService.getInvigilators(examId).catch(() => ({ sections: [] })),
        examinationService.list({ academicYearId: exam?.academicYearId }).catch(() => []),
        examinationService.getSeatingImage(examId).catch(() => ({ dataUri: null })),
      ]);
      setRooms(r.rooms || []);
      setSections(inv.sections || []);
      setOtherExams((list || []).filter((e) => e.uuid !== examId));
      setPlanImg(img || null);
      const e = {};
      (r.rooms || []).forEach((rm) => { e[rm.uuid] = (rm.allocations || []).map((a) => ({ sectionClassId: a.sectionClassId, rollFrom: a.rollFrom ?? '', rollTo: a.rollTo ?? '' })); });
      setEdits(e);
    } catch (x) {
      setErr(x.response?.data?.error?.description || 'Failed to load the seating scheme');
    } finally { setLoading(false); }
  }, [examId, exam?.academicYearId]);
  useEffect(() => { load(); }, [load]);

  const sectionById = useMemo(() => {
    const m = {}; for (const s of sections) m[s.classId] = s; return m;
  }, [sections]);

  const addRoom = async () => {
    const name = newRoom.trim(); if (!name) return;
    setBusy(true); setErr('');
    try { const r = await examinationService.saveRoom(examId, { name, sortOrder: rooms.length }); setRooms(r.rooms || []); syncEdits(r.rooms); setNewRoom(''); }
    catch (x) { setErr(x.response?.data?.error?.description || 'Failed to add room'); }
    finally { setBusy(false); }
  };

  const syncEdits = (rlist) => {
    setEdits((prev) => {
      const e = { ...prev };
      (rlist || []).forEach((rm) => { if (!e[rm.uuid]) e[rm.uuid] = (rm.allocations || []).map((a) => ({ sectionClassId: a.sectionClassId, rollFrom: a.rollFrom ?? '', rollTo: a.rollTo ?? '' })); });
      return e;
    });
  };

  const removeRoom = async (roomId) => {
    setBusy(true); setErr('');
    try { const r = await examinationService.deleteRoom(examId, roomId); setRooms(r.rooms || []); }
    catch (x) { setErr(x.response?.data?.error?.description || 'Failed to delete room'); }
    finally { setBusy(false); }
  };

  const setAlloc = (roomId, idx, field, value) =>
    setEdits((e) => ({ ...e, [roomId]: e[roomId].map((a, i) => (i === idx ? { ...a, [field]: value } : a)) }));
  const addAlloc = (roomId) => setEdits((e) => ({ ...e, [roomId]: [...(e[roomId] || []), { sectionClassId: '', rollFrom: '', rollTo: '' }] }));
  const removeAlloc = (roomId, idx) => setEdits((e) => ({ ...e, [roomId]: e[roomId].filter((_, i) => i !== idx) }));

  const saveRoomAllocs = async (roomId) => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const allocations = (edits[roomId] || []).filter((a) => a.sectionClassId);
      const r = await examinationService.saveRoomAllocations(examId, roomId, allocations);
      setRooms(r.rooms || []);
      setMsg('Room saved.');
    } catch (x) { setErr(x.response?.data?.error?.description || 'Failed to save the room'); }
    finally { setBusy(false); }
  };

  const doCopy = async () => {
    if (!copyFrom) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await examinationService.copyRooms(examId, copyFrom);
      setRooms(r.rooms || []);
      const e = {};
      (r.rooms || []).forEach((rm) => { e[rm.uuid] = (rm.allocations || []).map((a) => ({ sectionClassId: a.sectionClassId, rollFrom: a.rollFrom ?? '', rollTo: a.rollTo ?? '' })); });
      setEdits(e); setCopyFrom(''); setMsg('Seating copied.');
    } catch (x) { setErr(x.response?.data?.error?.description || 'Failed to copy seating'); }
    finally { setBusy(false); }
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const { base64, mimeType, fileName } = await readFile(file);
      const img = await examinationService.setSeatingImage(examId, base64, mimeType, fileName);
      setPlanImg(img); setMsg('Seating image uploaded.');
    } catch (x) { setErr(x.response?.data?.error?.description || 'Failed to upload the image'); }
    finally { setBusy(false); }
  };

  const removeImage = async () => {
    setBusy(true); setErr('');
    try { await examinationService.deleteSeatingImage(examId); setPlanImg({ fileId: null, dataUri: null }); }
    catch (x) { setErr(x.response?.data?.error?.description || 'Failed to remove the image'); }
    finally { setBusy(false); }
  };

  const hasRoomImg = (rm) => (roomImgHas[rm.uuid] !== undefined ? roomImgHas[rm.uuid] : rm.hasImage);

  const uploadRoomImage = async (roomId, file) => {
    if (!file) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const { base64, mimeType, fileName } = await readFile(file);
      await examinationService.setRoomImage(examId, roomId, base64, mimeType, fileName);
      setRoomImgHas((m) => ({ ...m, [roomId]: true })); setMsg('Room image uploaded.');
    } catch (x) { setErr(x.response?.data?.error?.description || 'Failed to upload the room image'); }
    finally { setBusy(false); }
  };

  const removeRoomImage = async (roomId) => {
    setBusy(true); setErr('');
    try { await examinationService.deleteRoomImage(examId, roomId); setRoomImgHas((m) => ({ ...m, [roomId]: false })); }
    catch (x) { setErr(x.response?.data?.error?.description || 'Failed to remove the room image'); }
    finally { setBusy(false); }
  };

  const viewRoomImage = async (rm) => {
    setBusy(true); setErr('');
    try { const img = await examinationService.getRoomImage(examId, rm.uuid); if (img?.dataUri) setViewImg({ title: `Room ${rm.name} · plan`, dataUri: img.dataUri }); }
    catch (x) { setErr(x.response?.data?.error?.description || 'Failed to load the room image'); }
    finally { setBusy(false); }
  };

  const print = async () => {
    setErr('');
    try {
      const brand = await examinationService.getBranding().catch(() => ({}));
      printSeatingPlan({
        examName: exam?.name, inchargeName: exam?.inchargeName,
        rooms: rooms.map((rm) => ({ name: rm.name, allocations: (rm.allocations || []).map((a) => ({ label: a.sectionName, rollFrom: a.rollFrom, rollTo: a.rollTo })) })),
        logoDataUri: brand?.logoDataUri, stampDataUri: brand?.stampDataUri,
        schoolName: brand?.schoolName, motto: brand?.motto, address: brand?.address,
      });
    } catch (x) { setErr(x.response?.data?.error?.description || 'Failed to prepare the seating plan'); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
          {rooms.length} room{rooms.length === 1 ? '' : 's'} · each seats a mix of sections by roll range.
        </Typography>
        {canManage && otherExams.length > 0 && (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField select size="small" sx={{ minWidth: 200 }} label="Copy seating from" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              {otherExams.map((e) => <MenuItem key={e.uuid} value={e.uuid}>{e.name}</MenuItem>)}
            </TextField>
            <Button size="small" startIcon={<CopyIcon />} onClick={doCopy} disabled={!copyFrom || busy}>Copy</Button>
          </Stack>
        )}
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={print} disabled={!rooms.length}>Print plan</Button>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {/* Uploaded seating-plan photo — collapsed to a chip; click it to open the image. */}
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <PhotoIcon fontSize="small" color="action" />
          <Typography variant="subtitle2">Seating plan image</Typography>
          {planImg?.dataUri ? (
            <Tooltip title="View the uploaded plan">
              <Chip size="small" color="success" variant="outlined" icon={<ImageIcon />} label="Uploaded — view"
                onClick={() => setViewImg({ title: 'Consolidated seating plan', dataUri: planImg.dataUri })} />
            </Tooltip>
          ) : (
            <Typography variant="caption" color="text.secondary">optional — a photo of the printed plan</Typography>
          )}
          <Box sx={{ flex: 1 }} />
          {canManage && (
            <Button size="small" component="label" startIcon={<PhotoIcon />} disabled={busy}>
              {planImg?.dataUri ? 'Replace' : 'Upload'}
              <input hidden type="file" accept="image/*" onChange={(e) => { uploadImage(e.target.files?.[0]); e.target.value = ''; }} />
            </Button>
          )}
          {canManage && planImg?.dataUri && <Button size="small" color="error" onClick={removeImage} disabled={busy}>Remove</Button>}
        </Stack>
      </Paper>

      <Stack spacing={2}>
        {rooms.map((rm) => (
          <Paper key={rm.uuid} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <RoomIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Room {rm.name}</Typography>
              {hasRoomImg(rm) && (
                <Tooltip title="View room plan image"><Chip size="small" icon={<ImageIcon />} label="Plan" variant="outlined" onClick={() => viewRoomImage(rm)} /></Tooltip>
              )}
              <Box sx={{ flex: 1 }} />
              {canManage && (
                <Button size="small" component="label" startIcon={<PhotoIcon />} disabled={busy}>
                  {hasRoomImg(rm) ? 'Replace' : 'Image'}
                  <input hidden type="file" accept="image/*" onChange={(e) => { uploadRoomImage(rm.uuid, e.target.files?.[0]); e.target.value = ''; }} />
                </Button>
              )}
              {canManage && hasRoomImg(rm) && (
                <Tooltip title="Remove room image"><IconButton size="small" onClick={() => removeRoomImage(rm.uuid)}><ImageIcon fontSize="small" color="disabled" /></IconButton></Tooltip>
              )}
              {canManage && (
                <Tooltip title="Delete room"><IconButton size="small" color="error" onClick={() => removeRoom(rm.uuid)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              )}
            </Stack>
            <Stack spacing={1}>
              {(edits[rm.uuid] || []).map((a, idx) => (
                <Stack key={idx} direction="row" spacing={1} alignItems="center">
                  <Autocomplete
                    size="small" sx={{ flex: 1, minWidth: 180 }} disabled={!canManage}
                    options={sections} getOptionLabel={(o) => o.name || ''}
                    value={a.sectionClassId ? (sectionById[a.sectionClassId] || null) : null}
                    onChange={(_, v) => setAlloc(rm.uuid, idx, 'sectionClassId', v ? v.classId : '')}
                    isOptionEqualToValue={(o, v) => o.classId === v.classId}
                    renderInput={(p) => <TextField {...p} placeholder="Section" />}
                  />
                  <TextField size="small" type="number" sx={{ width: 100 }} label="Roll from" disabled={!canManage}
                    value={a.rollFrom} onChange={(e) => setAlloc(rm.uuid, idx, 'rollFrom', e.target.value)} />
                  <TextField size="small" type="number" sx={{ width: 100 }} label="Roll to" disabled={!canManage}
                    value={a.rollTo} onChange={(e) => setAlloc(rm.uuid, idx, 'rollTo', e.target.value)} />
                  {canManage && <IconButton size="small" color="error" onClick={() => removeAlloc(rm.uuid, idx)}><DeleteIcon fontSize="small" /></IconButton>}
                </Stack>
              ))}
              {!(edits[rm.uuid] || []).length && <Typography variant="caption" color="text.secondary">No sections in this room yet.</Typography>}
            </Stack>
            {canManage && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => addAlloc(rm.uuid)}>Add section</Button>
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={() => saveRoomAllocs(rm.uuid)} disabled={busy}>Save room</Button>
              </Stack>
            )}
          </Paper>
        ))}
        {!rooms.length && <Alert severity="info">No rooms yet. Add the first room below (or copy the scheme from another exam).</Alert>}
      </Stack>

      {canManage && (
        <>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField size="small" label="New room name" placeholder="e.g. 1A, III, Library" value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addRoom(); }} sx={{ minWidth: 240 }} />
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addRoom} disabled={!newRoom.trim() || busy}>Add room</Button>
          </Stack>
        </>
      )}

      <Dialog open={!!viewImg} onClose={() => setViewImg(null)} maxWidth="md" fullWidth>
        <DialogTitle>{viewImg?.title}</DialogTitle>
        <DialogContent>
          {viewImg?.dataUri && <img src={viewImg.dataUri} alt="Room plan" style={{ width: '100%', objectFit: 'contain', background: '#fff' }} />}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewImg(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
