import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, LinearProgress, Chip, CircularProgress, Divider,
} from '@mui/material';
import {
  ChevronRight as ChevronIcon, PictureAsPdf as PdfIcon, Description as WordIcon,
} from '@mui/icons-material';
import { syllabusService } from '../../services/syllabusService';
import DocPreviewDialog from './DocPreviewDialog';

const EXAM_LABEL = { half_yearly: 'Half Yearly', annual: 'Annual' };
const DOC_LABEL = { model_paper: 'Model Paper', answer_key: 'Answer Key', blueprint: 'Blueprint' };

// Teacher PWA: one card per subject (grade level). Model papers hang off the
// subject once (a paper is per grade+subject); the sections the teacher teaches
// are listed inside, each with its own coverage bar that opens that section's
// coverage marking. Papers are scoped to the teacher's assigned subjects.
export default function MySyllabus() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [papersByPlan, setPapersByPlan] = useState({}); // syllabusId -> { papers:[...] }
  const [preview, setPreview] = useState(null); // { docId, format, title }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [pl, papers] = await Promise.all([
          syllabusService.getMyPlans(),
          syllabusService.getMyModelPapers().catch(() => []),
        ]);
        setPlans(pl || []);
        setPapersByPlan(Object.fromEntries((papers || []).map((e) => [e.syllabusId, e])));
      } catch {
        setError('Failed to load your syllabus');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Group the per-section assignments into one entry per subject (plan).
  const subjects = useMemo(() => {
    const map = new Map();
    for (const p of plans) {
      if (!map.has(p.syllabusId)) {
        map.set(p.syllabusId, { syllabusId: p.syllabusId, subjectName: p.subjectName, grade: p.grade, sections: [] });
      }
      map.get(p.syllabusId).sections.push(p);
    }
    const arr = [...map.values()];
    arr.forEach((g) => g.sections.sort((a, b) => (a.className || '').localeCompare(b.className || '')));
    arr.sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));
    return arr;
  }, [plans]);

  // Prefer the PDF (the clean rendered output) when it's ready; fall back to the
  // Word source only if there's no PDF yet.
  const openDoc = (doc, subjectName, paper) => setPreview({
    docId: doc.uuid,
    format: doc.hasPdf ? 'pdf' : 'docx',
    title: `${subjectName || 'Paper'} · ${EXAM_LABEL[paper.exam] || paper.exam} · ${DOC_LABEL[doc.docType] || doc.docType}`,
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>My Syllabus</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : subjects.length === 0 ? (
        <Alert severity="info">You’re not assigned to any syllabus yet. Ask your admin to add you as a teacher on a plan.</Alert>
      ) : (
        subjects.map((g) => {
          const paperSet = papersByPlan[g.syllabusId];
          return (
            <Card key={g.syllabusId} sx={{ mb: 1.5 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  {g.subjectName || 'Syllabus'} · Grade {g.grade}
                </Typography>

                {paperSet && paperSet.papers.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      Exam papers
                    </Typography>
                    {paperSet.papers.map((pp) => (
                      <Box key={pp.uuid} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 78 }}>
                          {EXAM_LABEL[pp.exam] || pp.exam}
                        </Typography>
                        {pp.docs.map((d) => (
                          <Chip key={d.uuid} size="small" variant="outlined" clickable
                            icon={d.hasPdf ? <PdfIcon /> : <WordIcon />}
                            label={DOC_LABEL[d.docType] || d.docType}
                            onClick={() => openDoc(d, g.subjectName, pp)} />
                        ))}
                      </Box>
                    ))}
                  </Box>
                )}

                <Divider sx={{ mb: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                  Coverage
                </Typography>
                {g.sections.map((s) => {
                  const pct = s.totalTopics > 0 ? Math.round((s.coveredTopics / s.totalTopics) * 100) : 0;
                  return (
                    <Box key={s.assignmentId} onClick={() => navigate(`/syllabus/my/${s.syllabusId}/${s.classId}`)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Typography variant="body2" sx={{ minWidth: 64, fontWeight: 600 }}>{s.className}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 1 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88, textAlign: 'right' }}>
                        {s.coveredTopics}/{s.totalTopics}
                      </Typography>
                      <Chip size="small" color="success" label={`${pct}%`} />
                      <ChevronIcon color="action" fontSize="small" />
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          );
        })
      )}

      <DocPreviewDialog target={preview} onClose={() => setPreview(null)} />
    </Box>
  );
}
