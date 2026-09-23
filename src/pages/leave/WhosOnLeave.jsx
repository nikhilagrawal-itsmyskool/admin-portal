import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Alert, CircularProgress, Card, Chip, Stack,
  Drawer, IconButton, Button, Divider,
} from '@mui/material';
import { Close as CloseIcon, AttachFile as AttachIcon } from '@mui/icons-material';
import { leaveService } from '../../services/leaveService';
import { thisMonth, openDataUri } from './LeaveShared';
import { fmtDate, todayIso } from '../../utils/date';

const dateRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

// Every date (YYYY-MM-DD) in [from,to] inclusive, both within the same month.
function eachDate(from, to) {
  const out = [];
  const s = new Date(`${from}T00:00:00Z`);
  const e = new Date(`${to}T00:00:00Z`);
  const cur = new Date(s.getTime());
  while (cur.getTime() <= e.getTime()) { out.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
  return out;
}

export default function WhosOnLeave() {
  const [month, setMonth] = useState(thisMonth());
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = todayIso();
  const todayRef = useRef(null);
  const [drawer, setDrawer] = useState(null); // { person } — the tapped leave
  const [detail, setDetail] = useState({ loading: false, handover: null, attachment: null });

  const openDrawer = async (person) => {
    setDrawer(person);
    if (!person.uuid) { setDetail({ loading: false, handover: null, attachment: null }); return; }
    setDetail({ loading: true, handover: null, attachment: null });
    const [ho, att] = await Promise.all([
      leaveService.getHandover(person.uuid).catch(() => null),
      leaveService.getAttachment(person.uuid).catch(() => null),
    ]);
    setDetail({ loading: false, handover: ho, attachment: att });
  };
  const openFile = async (fileId, name) => {
    const f = await leaveService.handoverFile(drawer.uuid, fileId).catch(() => null);
    if (f?.dataUri) openDataUri(f.dataUri, name);
  };

  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${pad(lastDay)}`;

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    leaveService.listApplications({ from: first, to: last })
      .then((list) => { if (alive) setApps((list || []).filter((a) => a.status === 'approved' || a.status === 'pending')); })
      .catch((err) => { if (alive) setError(err.response?.data?.error?.description || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open scrolled to the current day (when this month contains today) so back/forward is natural.
  useEffect(() => {
    if (loading) return undefined;
    const t = setTimeout(() => todayRef.current?.scrollIntoView({ block: 'center' }), 60);
    return () => clearTimeout(t);
  }, [loading, month]);

  // date -> [{ name, code, status }]
  const byDate = {};
  for (const a of apps) {
    const lo = a.fromDate < first ? first : a.fromDate;
    const hi = a.toDate > last ? last : a.toDate;
    for (const d of eachDate(lo, hi)) {
      const half = a.dayPortion === 'first_half' || a.dayPortion === 'second_half';
      (byDate[d] = byDate[d] || []).push({ uuid: a.uuid, name: a.employeeName || a.employeeId, code: a.leaveTypeCode, status: a.status, half, fromDate: a.fromDate, toDate: a.toDate, typeName: a.leaveTypeName, reason: a.reason });
    }
  }

  const approvedCount = apps.filter((a) => a.status === 'approved').length;
  const pendingCount = apps.filter((a) => a.status === 'pending').length;
  const days = Array.from({ length: lastDay }, (_, i) => `${month}-${pad(i + 1)}`);

  return (
    <Box sx={{ maxWidth: 880 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Leave Calendar</Typography>
        <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip label={`${approvedCount} approved`} sx={{ bgcolor: '#e5f8f2', color: '#00916e', fontWeight: 700 }} />
            <Chip label={`${pendingCount} pending`} sx={{ bgcolor: '#fff5e0', color: '#8a6400', fontWeight: 700 }} />
          </Stack>

          <Card variant="outlined">
            {days.map((date) => {
              const list = byDate[date] || [];
              const dd = date.slice(8, 10);
              const dow = DOW[new Date(`${date}T00:00:00Z`).getUTCDay()];
              const isToday = date === today;
              const isSunday = dow === 'Sun';
              return (
                <Box
                  key={date}
                  ref={isToday ? todayRef : undefined}
                  sx={{
                    display: 'flex', gap: 1.5, px: 1.5, py: 1, borderBottom: '1px solid #eef2f8',
                    bgcolor: isToday ? '#eaf0ff' : 'transparent',
                    borderLeft: isToday ? '3px solid #3366ff' : '3px solid transparent',
                  }}
                >
                  <Box sx={{ width: 42, flex: '0 0 auto', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: isToday ? '#274bdb' : (isSunday ? '#c3cad9' : '#2e3a59'), fontVariantNumeric: 'tabular-nums' }}>{dd}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.disabled', textTransform: 'uppercase' }}>{dow}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 0.5 }}>
                    {/* Today sits on its own line above the names so the name chips stay
                        left-aligned with every other day (no inline label shoving them over). */}
                    {isToday && <Chip size="small" label="Today" sx={{ height: 20, bgcolor: '#3366ff', color: '#fff', fontWeight: 700, fontSize: 10.5 }} />}
                    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                      {list.length === 0 ? (
                        <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>—</Typography>
                      ) : (
                        list.map((p, i) => (
                          <Chip
                            key={`${date}-${i}`} size="small"
                            label={<span><b>{p.name}</b>{p.code ? ` · ${p.code}` : ''}{p.half ? ' · ½' : ''}</span>}
                            variant="outlined"
                            onClick={() => openDrawer(p)}
                            sx={{
                              fontSize: 12, cursor: 'pointer',
                              borderColor: p.status === 'approved' ? '#00b887' : '#f0c14b',
                              color: p.status === 'approved' ? '#00916e' : '#8a6400',
                              bgcolor: p.status === 'approved' ? '#f2fcf9' : '#fffaf0',
                            }}
                            title="View leave & handover"
                          />
                        ))
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Card>
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 1.5 }}>
            Green = approved, amber = pending. One row per day; today is highlighted. Tap a name to see the leave & academic handover.
          </Typography>
        </>
      )}

      <Drawer anchor="right" open={Boolean(drawer)} onClose={() => setDrawer(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%' } }}>
        {drawer && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{drawer.name}</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {drawer.typeName || drawer.code} · {dateRange(drawer.fromDate, drawer.toDate)}
                  {drawer.half ? ' · ½ day' : ''}
                </Typography>
                <Chip size="small" label={drawer.status} sx={{ mt: 0.5, height: 20, fontWeight: 700,
                  bgcolor: drawer.status === 'approved' ? '#e5f8f2' : '#fff5e0', color: drawer.status === 'approved' ? '#00916e' : '#8a6400' }} />
              </Box>
              <IconButton size="small" onClick={() => setDrawer(null)}><CloseIcon fontSize="small" /></IconButton>
            </Box>
            {drawer.reason && <Typography sx={{ fontSize: 13, mt: 1 }}><b>Reason:</b> {drawer.reason}</Typography>}

            <Divider sx={{ my: 2 }} />

            {detail.loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} /></Box>
            ) : (
              <>
                {detail.attachment?.dataUri && (
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary', mb: 0.5 }}>Supporting document</Typography>
                    <Button size="small" startIcon={<AttachIcon />} onClick={() => openDataUri(detail.attachment.dataUri, detail.attachment.fileName)}>
                      {detail.attachment.fileName || 'View document'}
                    </Button>
                  </Box>
                )}

                {(() => {
                  const ho = detail.handover;
                  if (!ho) return <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>No academic handover on file (non-teaching staff or older leave).</Typography>;
                  const topics = ho.topics || [];
                  const duties = ho.otherDuties || {};
                  const files = ho.files || [];
                  const plans = files.filter((f) => f.variant !== 'worksheet');
                  const sheets = files.filter((f) => f.variant === 'worksheet');
                  return (
                    <>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary', mb: 1 }}>Academic handover</Typography>
                      {topics.length > 0 && (
                        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                          {topics.map((t, i) => (
                            <Box key={i} sx={{ fontSize: 12.5 }}>
                              <Typography component="span" sx={{ fontWeight: 700, fontSize: 12.5 }}>{t.className || '—'}{t.subjectName ? ` · ${t.subjectName}` : ''}: </Typography>
                              <Typography component="span" sx={{ fontSize: 12.5 }}>{t.chapter ? `${t.chapter} — ` : ''}{t.topic}</Typography>
                              {t.substituteName && <Typography sx={{ fontSize: 11.5, color: '#274bdb', fontWeight: 600 }}>↳ Covering: {t.substituteName}</Typography>}
                              {t.substitution && <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>↳ {t.substitution}</Typography>}
                            </Box>
                          ))}
                        </Stack>
                      )}
                      {ho.lessonPlan && <Typography sx={{ fontSize: 12.5, mb: 1 }}><b>Lesson plan:</b> {ho.lessonPlan}</Typography>}
                      {plans.length > 0 && (
                        <Stack spacing={0.5} alignItems="flex-start" sx={{ mb: 1 }}>
                          {plans.map((f) => <Button key={f.fileId} size="small" startIcon={<AttachIcon />} onClick={() => openFile(f.fileId, f.fileName)}>Lesson plan: {f.fileName}</Button>)}
                        </Stack>
                      )}
                      {sheets.length > 0 && (
                        <Stack spacing={0.5} alignItems="flex-start" sx={{ mb: 1 }}>
                          {sheets.map((f) => <Button key={f.fileId} size="small" startIcon={<AttachIcon />} onClick={() => openFile(f.fileId, f.fileName)}>Worksheet: {f.fileName}</Button>)}
                        </Stack>
                      )}
                      <Typography sx={{ fontSize: 12.5, mt: 1 }}><b>Other duties:</b> {(duties.duties || []).join(', ') || '—'}{duties.covering ? ` · covered by ${duties.covering}` : ''}{duties.note ? ` · ${duties.note}` : ''}</Typography>
                    </>
                  );
                })()}
              </>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
