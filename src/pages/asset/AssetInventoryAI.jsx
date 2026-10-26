import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Chip, Alert,
  CircularProgress, Autocomplete, Divider, IconButton,
} from '@mui/material';
import {
  Inventory2 as InventoryIcon, AddAPhoto as AddPhotoIcon, Save as SaveIcon,
  Delete as DeleteIcon, AddCircleOutline as AddItemIcon, Refresh as ResetIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';
import { assetService } from '../../services/assetService';
import { filesToImages, PHOTO_ACCEPT } from '../../services/outreachService';

// Guided one-photo-at-a-time hint. The operator shoots NON-overlapping zones so the
// same fan isn't counted twice — they are the de-dup arbiter, not the algorithm.
const ZONE_HINTS = ['front wall', 'back wall', 'left side', 'right side', 'the ceiling (fans & lights)'];

// Flatten the asset tree into a selectable list of containers (rooms/labs/halls…),
// each with a breadcrumb path so identical names ("Store Room") are distinguishable.
function flattenContainers(nodes, trail = [], out = []) {
  for (const n of nodes || []) {
    const path = [...trail, n.name];
    if (n.kind === 'container') {
      out.push({ uuid: n.uuid, name: n.name, pathLabel: path.join(' / ') });
    }
    if (n.children?.length) flattenContainers(n.children, path, out);
  }
  return out;
}

const confColor = (c) => (c === 'high' ? 'success' : c === 'medium' ? 'warning' : 'default');

// AI-assisted inventory capture (phone-first). Pick a room, photograph it zone by zone,
// Claude drafts "what + how many", the operator corrects the counts and saves. Saved rows
// are quantity BUCKETS under the room. Gated on asset.register.manage (admin/assets-incharge/god).
export default function AssetInventoryAI() {
  const { user } = useAuth();
  const allowed = can(user, ACTIONS.ASSET_REGISTER_MANAGE);

  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);
  const [itemTypes, setItemTypes] = useState([]); // for manual add
  const [roomType, setRoomType] = useState(null); // container type used to create new rooms
  const [newRoom, setNewRoom] = useState(''); // inline new-room name
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [lines, setLines] = useState([]); // [{typeId, typeCode, label, count, confidence}]
  const [unmatched, setUnmatched] = useState([]); // [{label, count}]
  const [shotCount, setShotCount] = useState(0);
  const [notes, setNotes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  // manual-add row
  const [addType, setAddType] = useState(null);
  const [addCount, setAddCount] = useState('1');

  const load = useCallback(async () => {
    try {
      const [tree, types] = await Promise.all([assetService.getTree(), assetService.listTypes()]);
      setRooms(flattenContainers(Array.isArray(tree) ? tree : []));
      const list = Array.isArray(types) ? types : [];
      setItemTypes(list.filter((t) => t.kind === 'item'));
      // The type new rooms are created as: prefer 'room', else any container.
      setRoomType(list.find((t) => t.code === 'room') || list.find((t) => t.kind === 'container') || null);
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to load rooms');
    }
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  // Merge a freshly-analyzed zone into the running list: sum counts per type, keep the
  // lowest confidence (a type seen uncertainly anywhere stays flagged for review).
  const mergeDraft = (incoming) => {
    setLines((prev) => {
      const byId = new Map(prev.map((l) => [l.typeId, { ...l }]));
      for (const d of incoming) {
        const ex = byId.get(d.typeId);
        if (ex) {
          ex.count += d.count;
          const rank = { high: 2, medium: 1, low: 0 };
          if (rank[d.confidence] < rank[ex.confidence]) ex.confidence = d.confidence;
        } else {
          byId.set(d.typeId, { ...d });
        }
      }
      return [...byId.values()];
    });
  };

  const onPickPhotos = async (e) => {
    setErr(''); setSuccess('');
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      setProgress(`Preparing ${files.length} photo${files.length > 1 ? 's' : ''}…`);
      const imgs = await filesToImages(files, (d, t) => setProgress(`Preparing… ${d}/${t}`));
      // outreach gives { fileName, mimeType, base64Data }; our endpoint wants { data, mediaType }
      const images = imgs.map((i) => ({ data: i.base64Data, mediaType: i.mimeType }));
      setProgress('Looking at the photos…');
      const res = await assetService.analyzeInventory(images);
      mergeDraft(res.draft || []);
      if (res.notes) setNotes((prev) => [...prev, res.notes]);
      if (res.unmatched?.length) {
        setUnmatched((prev) => {
          const byLabel = new Map(prev.map((u) => [u.label.toLowerCase(), { ...u }]));
          for (const u of res.unmatched) {
            const k = u.label.toLowerCase();
            if (byLabel.has(k)) byLabel.get(k).count += u.count;
            else byLabel.set(k, { ...u });
          }
          return [...byLabel.values()];
        });
      }
      setShotCount((n) => n + 1);
    } catch (e2) {
      setErr(e2.response?.data?.error?.description || 'Could not analyze the photos');
    } finally { setBusy(false); setProgress(''); }
  };

  const setLineCount = (typeId, v) => {
    setLines((prev) => prev.map((l) => (l.typeId === typeId ? { ...l, count: v } : l)));
  };
  const removeLine = (typeId) => setLines((prev) => prev.filter((l) => l.typeId !== typeId));

  const addManual = () => {
    if (!addType) return;
    const c = Math.max(1, Math.round(Number(addCount) || 1));
    mergeDraft([{ typeId: addType.uuid, typeCode: addType.code, label: addType.label, count: c, confidence: 'high' }]);
    setAddType(null); setAddCount('1');
  };

  const dismissUnmatched = (label) => setUnmatched((prev) => prev.filter((u) => u.label !== label));

  // Create a room on the fly (flat, at the tree root) so the operator never has to
  // pre-build a hierarchy on desktop. They can reparent it later on the Asset Tree.
  const createRoom = async () => {
    const name = newRoom.trim();
    if (!name || !roomType) return;
    setErr(''); setCreatingRoom(true);
    try {
      const created = await assetService.createAsset({ typeId: roomType.uuid, name });
      const opt = { uuid: created.uuid, name: created.name, pathLabel: created.name };
      setRooms((prev) => [...prev, opt]);
      setRoom(opt);
      setNewRoom('');
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Could not create the room');
    } finally { setCreatingRoom(false); }
  };

  const resetCapture = () => {
    setLines([]); setUnmatched([]); setNotes([]); setShotCount(0); setErr(''); setSuccess('');
  };

  const save = async () => {
    setErr(''); setSuccess('');
    if (!room) { setErr('Pick a room first.'); return; }
    const payload = lines
      .map((l) => ({ typeId: l.typeId, count: Math.round(Number(l.count)) }))
      .filter((l) => l.count > 0);
    if (!payload.length) { setErr('Nothing to save — add at least one item.'); return; }
    setBusy(true);
    try {
      const res = await assetService.commitInventory({ roomId: room.uuid, lines: payload });
      setSuccess(`Saved ${res.count} item type${res.count > 1 ? 's' : ''} to ${room.name}.`);
      resetCapture();
    } catch (e) {
      setErr(e.response?.data?.error?.description || 'Failed to save the inventory');
    } finally { setBusy(false); }
  };

  const totalUnits = useMemo(
    () => lines.reduce((s, l) => s + (Math.round(Number(l.count)) || 0), 0),
    [lines],
  );

  if (!allowed) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>AI Inventory</Typography>
        <Alert severity="info">Only the asset in-charge, admin, or god can record inventory.</Alert>
      </Box>
    );
  }

  const nextHint = ZONE_HINTS[Math.min(shotCount, ZONE_HINTS.length - 1)];

  return (
    <Box sx={{ p: 2, maxWidth: 640, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <InventoryIcon color="primary" />
        <Typography variant="h6">AI Inventory</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pick a room, photograph it one part at a time, fix the counts, and save. Shoot
        non-overlapping zones (front, back, sides, ceiling) so nothing is counted twice.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Autocomplete
              size="small" options={rooms} value={room} onChange={(_, v) => setRoom(v)}
              getOptionLabel={(o) => o.pathLabel || o.name || ''}
              isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
              renderInput={(params) => <TextField {...params} label={rooms.length ? 'Room' : 'No rooms yet — add one below'} placeholder="Search for a room / lab / hall" />}
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small" fullWidth label="Or add a new room" value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createRoom(); } }}
                placeholder="e.g. Class I-A, Computer Lab"
              />
              <Button variant="outlined" onClick={createRoom} disabled={!newRoom.trim() || !roomType || creatingRoom}>
                {creatingRoom ? '…' : 'Add'}
              </Button>
            </Stack>

            <Button component="label" variant="contained" startIcon={<AddPhotoIcon />} fullWidth sx={{ py: 1.3 }} disabled={!room || busy}>
              {shotCount === 0 ? 'Take a photo of the room' : `Add another photo (${nextHint})`}
              <input hidden type="file" accept={PHOTO_ACCEPT} capture="environment" multiple onChange={onPickPhotos} />
            </Button>
            {busy && progress && (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">{progress}</Typography>
              </Stack>
            )}
            {shotCount > 0 && !busy && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                {shotCount} photo{shotCount > 1 ? 's' : ''} analyzed · review the counts below
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {(lines.length > 0 || shotCount > 0) && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Draft inventory</Typography>
              <Typography variant="caption" color="text.secondary">{lines.length} types · {totalUnits} units</Typography>
            </Stack>

            {lines.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Nothing detected yet — add a photo or an item.</Typography>
            ) : (
              <Stack spacing={1} divider={<Divider flexItem />}>
                {lines.map((l) => (
                  <Stack key={l.typeId} direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>{l.label}</Typography>
                      <Chip size="small" label={l.confidence} color={confColor(l.confidence)}
                        variant={l.confidence === 'low' ? 'outlined' : 'filled'} sx={{ height: 18, fontSize: 11 }} />
                    </Box>
                    <TextField
                      type="number" size="small" value={l.count}
                      onChange={(e) => setLineCount(l.typeId, e.target.value)}
                      inputProps={{ min: 0, style: { width: 56, textAlign: 'center' } }}
                    />
                    <IconButton size="small" color="error" onClick={() => removeLine(l.typeId)}><DeleteIcon fontSize="small" /></IconButton>
                  </Stack>
                ))}
              </Stack>
            )}

            {unmatched.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Also seen (no matching type):</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {unmatched.map((u) => (
                    <Chip key={u.label} size="small" variant="outlined" label={`${u.label} ×${u.count}`} onDelete={() => dismissUnmatched(u.label)} />
                  ))}
                </Stack>
              </Box>
            )}

            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Autocomplete
                size="small" sx={{ flex: 1 }} options={itemTypes} value={addType} onChange={(_, v) => setAddType(v)}
                getOptionLabel={(o) => o.label || ''}
                isOptionEqualToValue={(o, v) => o.uuid === v.uuid}
                renderInput={(params) => <TextField {...params} label="Add a missed item" placeholder="Pick a type" />}
              />
              <TextField type="number" size="small" value={addCount} onChange={(e) => setAddCount(e.target.value)}
                inputProps={{ min: 1, style: { width: 48, textAlign: 'center' } }} />
              <IconButton color="primary" onClick={addManual} disabled={!addType}><AddItemIcon /></IconButton>
            </Stack>

            {notes.length > 0 && (
              <Alert severity="info" sx={{ mt: 1.5 }} icon={false}>
                <Typography variant="caption">{notes.join(' · ')}</Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {(lines.length > 0 || shotCount > 0) && (
        <Stack spacing={1}>
          <Button variant="contained" fullWidth startIcon={<SaveIcon />} onClick={save} disabled={busy || !room || lines.length === 0}>
            {busy ? 'Saving…' : `Save to ${room?.name || 'register'}`}
          </Button>
          <Button variant="text" fullWidth startIcon={<ResetIcon />} onClick={resetCapture} disabled={busy}>Start over</Button>
        </Stack>
      )}
    </Box>
  );
}
