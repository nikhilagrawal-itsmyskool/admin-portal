import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardActionArea, CardContent, Alert, LinearProgress, Chip, CircularProgress, Divider,
} from '@mui/material';
import {
  ChevronRight as ChevronIcon, PictureAsPdf as PdfIcon, Description as WordIcon,
} from '@mui/icons-material';
import { syllabusService } from '../../services/syllabusService';
import DocPreviewDialog from './DocPreviewDialog';

const EXAM_LABEL = { half_yearly: 'Half Yearly', annual: 'Annual' };
const DOC_LABEL = { model_paper: 'Model Paper', answer_key: 'Answer Key', blueprint: 'Blueprint' };

// Teacher PWA: the plans (per section) this teacher is assigned to. Tap one to
// view its month timeline and mark coverage. Each subject also links to its
// model paper / blueprint / answer key (scoped to the subjects they teach).
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
        setError('Failed to load your syllabus plans');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDoc = (doc, subjectName, paper) => setPreview({
    docId: doc.uuid,
    format: doc.hasDocx ? 'docx' : 'pdf',
    title: `${subjectName || 'Paper'} · ${EXAM_LABEL[paper.exam] || paper.exam} · ${DOC_LABEL[doc.docType] || doc.docType}`,
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>My Syllabus</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : plans.length === 0 ? (
        <Alert severity="info">You’re not assigned to any syllabus yet. Ask your admin to add you as a teacher on a plan.</Alert>
      ) : (
        plans.map((p) => {
          const pct = p.totalTopics > 0 ? Math.round((p.coveredTopics / p.totalTopics) * 100) : 0;
          const paperSet = papersByPlan[p.syllabusId];
          return (
            <Card key={p.assignmentId} sx={{ mb: 1.5 }}>
              <CardActionArea onClick={() => navigate(`/syllabus/my/${p.syllabusId}/${p.classId}`)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {p.subjectName || 'Syllabus'} · {p.className}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Grade {p.grade} · {p.coveredTopics} / {p.totalTopics} topics covered
                      </Typography>
                      <LinearProgress variant="determinate" value={pct} sx={{ mt: 1, height: 6, borderRadius: 1 }} />
                    </Box>
                    <Chip size="small" color="success" label={`${pct}%`} />
                    <ChevronIcon color="action" />
                  </Box>
                </CardContent>
              </CardActionArea>

              {paperSet && paperSet.papers.length > 0 && (
                <Box sx={{ px: 2, pb: 1.5 }}>
                  <Divider sx={{ mb: 1 }} />
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
                          icon={d.hasDocx ? <WordIcon /> : <PdfIcon />}
                          label={DOC_LABEL[d.docType] || d.docType}
                          onClick={() => openDoc(d, p.subjectName, pp)} />
                      ))}
                    </Box>
                  ))}
                </Box>
              )}
            </Card>
          );
        })
      )}

      <DocPreviewDialog target={preview} onClose={() => setPreview(null)} />
    </Box>
  );
}
