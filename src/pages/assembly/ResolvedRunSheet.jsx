import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, Stack, Avatar, Dialog, DialogContent, Link } from '@mui/material';
import { Cake as CakeIcon } from '@mui/icons-material';
import { assemblyService } from '../../services/assemblyService';

// The image for a reference — presigned imageUrl (prod) or a lazily-fetched base64
// data URI (local dev). Shown inside the "view" popup.
function RefViewImage({ reference }) {
  const [src, setSrc] = useState(reference.imageUrl || '');
  useEffect(() => {
    let alive = true;
    if (reference.imageUrl) { setSrc(reference.imageUrl); return undefined; }
    assemblyService.getReferenceImage(reference.uuid)
      .then((r) => { if (alive && r) setSrc(`data:${r.mimeType};base64,${r.base64Data}`); })
      .catch(() => {});
    return () => { alive = false; };
  }, [reference.uuid, reference.imageUrl]);
  return (
    <Box component="img" src={src || undefined} alt={reference.description}
      sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }} />
  );
}

// Day-level references (staff-only): a description list; tap "view" to see the image.
function References({ references }) {
  const [open, setOpen] = useState(null);
  if (!references?.length) return null;
  return (
    <Box sx={{ my: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>References</Typography>
      <Stack spacing={0.25} sx={{ pl: 0.5 }}>
        {references.map((r) => (
          <Stack key={r.uuid} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>• {r.description}</Typography>
            <Link component="button" type="button" variant="caption" onClick={() => setOpen(r)}>view</Link>
          </Stack>
        ))}
      </Stack>
      <Dialog open={!!open} onClose={() => setOpen(null)} maxWidth="md" fullWidth>
        {open && (
          <DialogContent sx={{ p: 1 }}>
            <RefViewImage reference={open} />
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{open.description}</Typography>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}

// Person label with the student's section in brackets: "Siddhi Rathore (VIII-A)".
const personName = (p) => {
  const name = p.targetName || p.name || p.targetText || p.targetType || p.studentId;
  return name && p.className ? `${name} (${p.className})` : name;
};

const initials = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// The birthday-spotlight list (students of the plan's classes, ordered smaller→
// higher class, then staff), each with a small photo or an initials avatar.
function Birthdays({ people }) {
  if (!people?.length) return null;
  return (
    <Stack spacing={0.5} sx={{ pl: 0.5, mt: 0.25 }}>
      {people.map((p) => (
        <Stack key={`${p.kind}-${p.id}`} direction="row" spacing={1} alignItems="center">
          <Avatar src={p.photoUrl || undefined} sx={{ width: 26, height: 26, fontSize: 11, bgcolor: p.kind === 'employee' ? 'secondary.light' : 'primary.light' }}>
            {initials(p.name)}
          </Avatar>
          <Typography variant="body2">{p.name}</Typography>
          {p.kind === 'employee'
            ? <Chip size="small" variant="outlined" color="secondary" label="Staff" sx={{ height: 18, fontSize: 10 }} />
            : p.className && <Chip size="small" variant="outlined" label={p.className} sx={{ height: 18, fontSize: 10 }} />}
        </Stack>
      ))}
    </Stack>
  );
}

// Compact read-only render of a /resolve result. Shows a "no assembly" state
// when not held (a non-assembly weekday now; a holiday once the academic
// calendar exists — same state, so holidays plug in with no UI change).
function RunNodes({ nodes, depth = 0, showDescriptions = true, showContent = true }) {
  return (nodes || []).map((n) => (
    <Box key={n.uuid} sx={{ pl: depth ? 1.5 : 0, borderLeft: depth ? '2px solid' : 'none', borderColor: 'divider', ml: depth ? 0.5 : 0, py: 0.25 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" fontWeight={depth ? 400 : 600}>{n.title}</Typography>
        {showDescriptions && n.description && <Typography variant="caption" color="text.secondary">— {n.description}</Typography>}
        {n.startTime && <Chip size="small" variant="outlined" label={n.startTime} sx={{ height: 16, fontSize: 10 }} />}
        {(n.responsible || []).map((r) => (
          <Chip key={r.uuid} size="small" color="info" variant="outlined" sx={{ height: 16, fontSize: 10 }}
            label={`${r.role ? r.role + ': ' : ''}${personName(r)}`} />
        ))}
      </Stack>
      {/* Content the house/teacher filled for the day stands out (accent); the
          plan's template placeholder stays muted, so it's clear what's been added. */}
      {showContent && n.content && (
        <Typography variant="body2" sx={{ pl: 0.5, whiteSpace: 'pre-wrap', fontStyle: n.contentFromRoster ? 'normal' : 'italic', color: n.contentFromRoster ? 'primary.main' : 'text.secondary' }}>
          {n.content}
        </Typography>
      )}
      {n.dynamicSource === 'birthday' && (
        n.birthdays?.length
          ? <Birthdays people={n.birthdays} />
          : <Stack direction="row" spacing={0.5} alignItems="center" sx={{ pl: 0.5, color: 'text.secondary' }}><CakeIcon sx={{ fontSize: 15 }} /><Typography variant="caption">No birthdays today</Typography></Stack>
      )}
      <RunNodes nodes={n.children} depth={depth + 1} showDescriptions={showDescriptions} showContent={showContent} />
    </Box>
  ));
}

export default function ResolvedRunSheet({ resolved, showThemes = true, showDescriptions = true, showContent = true }) {
  if (!resolved) return null;
  if (!resolved.held) {
    return (
      <Box sx={{ color: 'text.secondary', py: 1 }}>
        <Typography variant="body2">No assembly</Typography>
        <Typography variant="caption">({resolved.weekday})</Typography>
      </Box>
    );
  }
  return (
    <Box>
      {resolved.source === 'special' && (
        <Chip size="small" color="secondary" sx={{ mb: 0.5, mr: 0.5 }} label={`Special: ${resolved.title || ''}`} />
      )}
      {showThemes && (resolved.themes || []).map((t) => (
        <Chip key={t.uuid} size="small" variant="outlined" sx={{ mb: 0.5, mr: 0.5 }} label={t.title} />
      ))}
      {/* Day roster people — who's been assigned each responsibility. */}
      {[
        ['Anchor', resolved.anchors],
        ['Owner', resolved.dayOwners],
        ['Commander', resolved.commanders],
        ['Drummer', resolved.drummers],
      ].map(([label, arr]) => {
        const names = (arr || []).map((p) => personName(p) || p.studentId).filter(Boolean).join(', ');
        return names ? (
          <Chip key={label} size="small" color="success" variant="outlined" sx={{ mb: 0.5, mr: 0.5 }} label={`${label}: ${names}`} />
        ) : null;
      })}
      {/* Day-level references (staff-only; present only on approved rosters). */}
      <References references={resolved.references} />
      {resolved.nodes?.length
        ? <RunNodes nodes={resolved.nodes} showDescriptions={showDescriptions} showContent={showContent} />
        : <Typography variant="caption" color="text.secondary">No items for this day.</Typography>}
    </Box>
  );
}
