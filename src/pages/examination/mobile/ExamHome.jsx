import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Chip, Paper, Switch, Alert,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Tune as ConfigIcon, GridOn as SheetIcon, HowToReg as InvigIcon, Badge as CardIcon,
  ChevronRight as ChevronIcon,
} from '@mui/icons-material';
import { examinationService } from '../../../services/examinationService';

const gradeLabel = (g) => (!g || !g.length ? 'all grades' : g.length === 1 ? `grade ${g[0]}` : `grades ${g[0]}–${g[g.length - 1]}`);

// The phone "home" for one exam: four screens as cards, each with a status line.
export default function ExamHome({ exam, canManage, onPatch, onBack }) {
  const navigate = useNavigate();
  const [invig, setInvig] = useState(null);

  useEffect(() => {
    examinationService.getInvigilators(exam.uuid).then(setInvig).catch(() => setInvig(null));
  }, [exam.uuid]);

  let invigLine = 'Assign per day';
  if (invig) {
    let total = 0;
    (invig.dates || []).forEach((d) => { total += (invig.sections || []).filter((s) => (invig.gradesByDate?.[d] || []).includes(s.grade)).length; });
    invigLine = `${(invig.assignments || []).length} of ${total} assigned`;
  }

  const cards = [
    { icon: <ConfigIcon />, title: 'Config', sub: `Incharge: ${exam.inchargeName || '—'} · ${exam.cardsPerPage || 4}/page`, path: 'config' },
    { icon: <SheetIcon />, title: 'Datesheet', sub: `${exam.paperCount || 0} papers · ${gradeLabel(exam.grades)}`, path: 'datesheet' },
    { icon: <InvigIcon />, title: 'Invigilators', sub: invigLine, path: 'invigilators' },
    { icon: <CardIcon />, title: 'Admit Cards', sub: 'Review dues · override', path: 'admit-cards' },
  ];

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Button startIcon={<BackIcon />} onClick={onBack}>Exams</Button>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.15 }}>{exam.name}</Typography>
          <Chip size="small" sx={{ mt: 0.5 }} color={exam.status === 'published' ? 'success' : 'default'} label={exam.status} />
        </Box>
        {canManage && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="caption" color="text.secondary">Published</Typography>
            <Switch checked={exam.status === 'published'} onChange={(e) => onPatch({ status: e.target.checked ? 'published' : 'draft' })} />
          </Stack>
        )}
      </Stack>

      {!canManage && <Alert severity="info" sx={{ mb: 2 }}>Read-only — you can view this exam's setup.</Alert>}

      <Stack spacing={1.25}>
        {cards.map((c) => (
          <Paper key={c.path} variant="outlined"
            sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
            onClick={() => navigate(`/examinations/${exam.uuid}/${c.path}`)}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'primary.main' }}>{c.icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>{c.title}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{c.sub}</Typography>
            </Box>
            <ChevronIcon color="disabled" />
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
