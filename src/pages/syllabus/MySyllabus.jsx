import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Alert, CircularProgress,
} from '@mui/material';
import {
  ChevronRight as ChevronIcon, PictureAsPdf as PdfIcon, Description as WordIcon,
} from '@mui/icons-material';
import { syllabusService } from '../../services/syllabusService';
import DocPreviewDialog from './DocPreviewDialog';

const EXAM_LABEL = { half_yearly: 'Half Yearly', annual: 'Annual' };
const EXAM_SHORT = { half_yearly: 'HY', annual: 'Annual' };
const DOC_LABEL = { model_paper: 'Model Paper', answer_key: 'Answer Key', blueprint: 'Blueprint' };
const DOC_SHORT = { model_paper: 'Paper', answer_key: 'Key', blueprint: 'Blueprint' };
const MONTH_ABBR = ['A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M'];

// Map covered leaves onto the academic calendar (0..1) via the plan's monthly
// schedule — same plan-weighted logic as the admin Overview.
function frontierFrac(monthly, covered, total) {
  if (total <= 0 || covered <= 0) return 0;
  if (covered >= total) return 1;
  let running = 0;
  for (let m = 0; m < 12; m++) {
    const s = monthly[m] || 0;
    if (s === 0) continue;
    if (covered <= running + s) return (m + (covered - running) / s) / 12;
    running += s;
  }
  return 1;
}

// Teacher PWA: one card per subject (grade level), aligned with the admin
// Syllabus Overview — a materials row (content + exam·doc chips) and a coverage
// timeline per section on the Apr→Mar calendar with a "now" marker.
export default function MySyllabus() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [papersByPlan, setPapersByPlan] = useState({});
  const [preview, setPreview] = useState(null);
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

  const subjects = useMemo(() => {
    const map = new Map();
    for (const p of plans) {
      if (!map.has(p.syllabusId)) {
        map.set(p.syllabusId, {
          syllabusId: p.syllabusId, subjectName: p.subjectName, grade: p.grade,
          totalTopics: p.totalTopics, monthlyScheduled: p.monthlyScheduled || [],
          currentMonthIndex: p.currentMonthIndex ?? 0, sections: [],
        });
      }
      map.get(p.syllabusId).sections.push(p);
    }
    const arr = [...map.values()];
    arr.forEach((g) => g.sections.sort((a, b) => (a.className || '').localeCompare(b.className || '')));
    arr.sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));
    return arr;
  }, [plans]);

  const openDoc = (doc, subjectName, paper) => setPreview({
    docId: doc.uuid,
    format: doc.hasPdf ? 'pdf' : 'docx',
    title: `${subjectName || 'Paper'} · ${EXAM_LABEL[paper.exam] || paper.exam} · ${DOC_LABEL[doc.docType] || doc.docType}`,
  });

  const sectionRow = (g, s, nowFrac) => {
    const total = s.totalTopics || 0;
    const front = frontierFrac(g.monthlyScheduled, s.coveredTopics || 0, total);
    const pct = total > 0 ? Math.round(((s.coveredTopics || 0) / total) * 100) : 0;
    const behind = nowFrac - front;
    let cls = 'good'; let st = front > nowFrac + 0.02 ? 'ahead' : 'on track';
    if (behind > 0.01) {
      const wks = Math.max(1, Math.round(behind * 52));
      if (behind <= 0.06) { cls = 'warn'; st = `~${wks} wk behind`; }
      else { cls = 'crit'; st = wks >= 8 ? 'well behind' : `~${wks} wk behind`; }
    }
    if ((s.coveredTopics || 0) === 0) { cls = 'crit'; st = 'not started'; }
    return (
      <div className="sy-sec" key={s.assignmentId} onClick={() => navigate(`/syllabus/my/${s.syllabusId}/${s.classId}`)}>
        <span className="sy-nm">{s.className}</span>
        <div className="sy-tl">
          <div className="sy-track" />
          <div className={`sy-fill ${cls}`} style={{ width: `${front * 100}%` }} />
          {behind > 0.01 && <div className="sy-gap" style={{ left: `${front * 100}%`, width: `${behind * 100}%` }} />}
          <div className="sy-now" style={{ left: `${nowFrac * 100}%` }} />
        </div>
        <span className="sy-meta"><b>{pct}%</b><span className={`sy-st ${cls}`}>{st}</span></span>
        <ChevronIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
      </div>
    );
  };

  return (
    <Box>
      <style>{`
        .sy-mats{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
        .sy-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;border:1px solid #d5dae6;color:#586074;display:inline-flex;align-items:center;gap:4px;cursor:default}
        .sy-pill.ok{background:#e6f4ec;color:#17935a;border-color:transparent}
        .sy-pill.doc{background:#eef0fd;color:#4338ca;border-color:transparent;cursor:pointer}
        .sy-pill.off{color:#8b94a7}
        .sy-lbl{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#8b94a7;font-weight:700;margin-bottom:7px}
        .sy-ruler{position:relative;height:13px;margin:0 84px 3px 60px}
        .sy-ruler .ml{position:absolute;inset:0;display:grid;grid-template-columns:repeat(12,1fr)}
        .sy-ruler .ml span{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:8.5px;color:#8b94a7;text-align:center}
        .sy-nowlab{position:absolute;top:-2px;transform:translateX(-50%);font-size:8.5px;font-weight:800;color:#4f46e5;white-space:nowrap}
        .sy-sec{display:flex;align-items:center;gap:0;padding:6px 0;border-radius:10px;cursor:pointer}
        .sy-sec:hover{background:rgba(140,150,170,.08)}
        .sy-nm{width:60px;font-size:12.5px;font-weight:700;color:#586074}
        .sy-tl{position:relative;flex:1;height:22px}
        .sy-track{position:absolute;inset:5px 0;border-radius:6px;background:rgba(140,150,170,.16);
          background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(8.3333% - 1px),rgba(140,150,170,.30) calc(8.3333% - 1px),rgba(140,150,170,.30) 8.3333%)}
        .sy-fill{position:absolute;top:5px;bottom:5px;left:0;border-radius:6px}
        .sy-fill.good{background:#17935a}.sy-fill.warn{background:#bd7710}.sy-fill.crit{background:#cf473d}
        .sy-gap{position:absolute;top:5px;bottom:5px;border-radius:0 6px 6px 0;background-image:repeating-linear-gradient(45deg,rgba(207,71,61,.28) 0 5px,transparent 5px 10px)}
        .sy-now{position:absolute;top:0;bottom:0;width:2px;background:#4f46e5;border-radius:2px}
        .sy-now::after{content:"";position:absolute;top:-2px;left:-3px;width:8px;height:8px;border-radius:50%;background:#4f46e5}
        .sy-meta{width:84px;padding-left:8px;font-size:11px;font-variant-numeric:tabular-nums;line-height:1.2}
        .sy-meta b{font-size:12.5px}
        .sy-meta .sy-st{display:block;font-size:9.5px;margin-top:1px}
        .sy-st.good{color:#17935a}.sy-st.warn{color:#bd7710}.sy-st.crit{color:#cf473d}
      `}</style>

      <Typography variant="h4" sx={{ mb: 3 }}>My Syllabus</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : subjects.length === 0 ? (
        <Alert severity="info">You’re not assigned to any syllabus yet. Ask your admin to add you as a teacher on a plan.</Alert>
      ) : (
        subjects.map((g) => {
          const paperSet = papersByPlan[g.syllabusId];
          const nowFrac = ((g.currentMonthIndex ?? 0) + 0.5) / 12;
          return (
            <Card key={g.syllabusId} sx={{ mb: 1.75, maxWidth: 720 }}>
              <CardContent sx={{ pb: '14px !important' }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>{g.subjectName || 'Syllabus'}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 600 }}>Grade {g.grade}</Typography>

                <div className="sy-mats">
                  {g.totalTopics > 0
                    ? <span className="sy-pill ok">✓ {g.totalTopics} topics</span>
                    : <span className="sy-pill off">no plan yet</span>}
                  {(paperSet?.papers || []).flatMap((pp) => pp.docs.map((d) => (
                    <span key={d.uuid} className="sy-pill doc" onClick={() => openDoc(d, g.subjectName, pp)}>
                      {d.hasPdf ? <PdfIcon sx={{ fontSize: 13 }} /> : <WordIcon sx={{ fontSize: 13 }} />}
                      {EXAM_SHORT[pp.exam] || pp.exam} · {DOC_SHORT[d.docType] || d.docType}
                    </span>
                  )))}
                </div>

                <Box sx={{ mt: 1.5 }}>
                  <div className="sy-lbl">Coverage by section</div>
                  <div className="sy-ruler">
                    <div className="ml">{MONTH_ABBR.map((m, i) => <span key={i}>{m}</span>)}</div>
                    <span className="sy-nowlab" style={{ left: `${nowFrac * 100}%` }}>now</span>
                  </div>
                  {g.sections.map((s) => sectionRow(g, s, nowFrac))}
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}

      <DocPreviewDialog target={preview} onClose={() => setPreview(null)} />
    </Box>
  );
}
