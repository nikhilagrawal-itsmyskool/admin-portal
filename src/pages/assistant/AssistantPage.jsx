import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, MenuItem, Button, IconButton,
  Chip, Stack, Avatar, CircularProgress, Alert, Tooltip, Divider,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Mic as MicIcon, Stop as StopIcon, Send as SendIcon, VolumeUp as SpeakIcon,
  RestartAlt as ResetIcon, School as StudentIcon, Person as PersonIcon,
  CalendarMonth as CalendarIcon, FactCheck as AttendIcon, Groups as TeacherIcon,
} from '@mui/icons-material';
import { assistantService } from '../../services/assistantService';
import { classService } from '../../services/classService';
import { useCan } from '../../permissions/can';

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const CAN_SPEAK = typeof window !== 'undefined' && 'speechSynthesis' in window;

// Read long digit runs (phone numbers) digit-by-digit — otherwise TTS says "eight billion…".
// Runs of 7+ digits only, so years (2026), attendance (94, 47) and admission ("1041") are
// left to read naturally. A comma every 5 digits gives a natural pause.
function forSpeech(text) {
  return String(text || '').replace(/\d{7,}/g, (run) =>
    run.split('').map((d, i) => (i > 0 && i % 5 === 0 ? ', ' : '') + d).join(' '));
}

// The summary "student card" the assistant returns on a new student (card = context).
function StudentCard({ card }) {
  const father = (card.guardians || []).find((g) => g.relation === 'father');
  const mother = (card.guardians || []).find((g) => g.relation === 'mother');
  const att = card.attendance;
  const Row = ({ icon, label, children }) => (
    <Box sx={{ display: 'flex', gap: 1.5, py: 1 }}>
      <Box sx={{ color: 'primary.main', mt: '2px' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary', display: 'block' }}>{label}</Typography>
        <Box sx={{ mt: 0.25 }}>{children}</Box>
      </Box>
    </Box>
  );
  return (
    <Card variant="outlined" sx={{ mt: 1.5 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontSize: 16 }}>
            {(card.name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.1 }}>{card.name}</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
              {card.className && <Chip size="small" color="primary" label={`Class ${card.className}`} />}
              {card.roll != null && <Typography variant="caption" color="text.secondary">Roll {card.roll}</Typography>}
              {card.house && <Typography variant="caption" color="text.secondary">· {card.house} House</Typography>}
            </Stack>
          </Box>
        </Stack>
        <Divider />
        <Row icon={<PersonIcon fontSize="small" />} label="Parents">
          {father && <Typography variant="body2"><b>Father:</b> {father.name || '—'}</Typography>}
          {mother && <Typography variant="body2"><b>Mother:</b> {mother.name || '—'}</Typography>}
          {!father && !mother && <Typography variant="body2" color="text.secondary">Not on record</Typography>}
        </Row>
        {card.classTeacher?.name && (
          <Row icon={<TeacherIcon fontSize="small" />} label="Class teacher">
            <Typography variant="body2">{card.classTeacher.name}{card.classTeacher.teaches ? ` · ${card.classTeacher.teaches}` : ''}</Typography>
          </Row>
        )}
        {card.subjects?.length > 0 && (
          <Row icon={<StudentIcon fontSize="small" />} label="Subjects">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {card.subjects.map((s) => <Chip key={s} size="small" variant="outlined" label={s} />)}
            </Box>
          </Row>
        )}
        {card.today?.length > 0 && (
          <Row icon={<CalendarIcon fontSize="small" />} label="Today's periods">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {card.today.map((p, i) => (
                <Typography key={i} variant="body2" sx={{ mr: 1 }}>
                  {i + 1}. {p.subject}{p.teacher ? ` (${p.teacher})` : ''}
                </Typography>
              ))}
            </Box>
          </Row>
        )}
        {att && (
          <Row icon={<AttendIcon fontSize="small" />} label="Attendance so far">
            <Typography variant="body2">
              <b>{att.percent}%</b> — present {att.present} of {att.total} days
            </Typography>
          </Row>
        )}
      </CardContent>
    </Card>
  );
}

export default function AssistantPage() {
  const can = useCan();
  const canView = can('assistant.use');

  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', text, card?}
  const [context, setContext] = useState(null); // opaque Convo blob {history, focusStudentId, focusName}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState('');
  const [classes, setClasses] = useState([]);
  const [pickClass, setPickClass] = useState('');
  const [lang, setLang] = useState('en'); // 'en' | 'hi' — reply + speech language
  const recogRef = useRef(null);
  const threadRef = useRef(null);
  const focusName = context?.focusName || null;

  useEffect(() => {
    classService.getClasses().then((c) => setClasses(Array.isArray(c) ? c : c?.classes || [])).catch(() => {});
  }, []);
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } }, []);

  const speak = useCallback((text, lng = lang) => {
    if (!CAN_SPEAK || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(forSpeech(text));
      u.rate = 1.03; u.lang = lng === 'hi' ? 'hi-IN' : 'en-IN';
      const voices = window.speechSynthesis.getVoices() || [];
      const v = voices.find((x) => x.lang === u.lang) || voices.find((x) => x.lang?.startsWith(lng === 'hi' ? 'hi' : 'en'));
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch { /* noop */ }
  }, [lang]);

  const send = useCallback(async (question) => {
    const q = (question || '').trim();
    if (!q) return;
    setError(''); setBusy(true);
    setMessages((m) => [...m, { role: 'user', text: q }]);
    try {
      const r = await assistantService.ask({ question: q, context: context || undefined, lang });
      setMessages((m) => [...m, { role: 'assistant', text: r.speech, card: r.card }]);
      if (r.context) setContext(r.context);
      speak(r.speech);
    } catch (e) {
      setError(e.response?.data?.error?.description || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [context, speak, lang]);

  const startMic = () => {
    if (!SR) { setError('Voice input needs Chrome (desktop or Android). You can type instead.'); return; }
    try {
      const r = new SR();
      r.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e) => { setListening(false); send(e.results[0][0].transcript); };
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      recogRef.current = r; setListening(true); r.start();
    } catch { setListening(false); }
  };
  const stopMic = () => { try { recogRef.current?.stop(); } catch { /* noop */ } setListening(false); };

  const askTyped = () => {
    const name = typed.trim();
    if (!name) return;
    const clsName = classes.find((c) => c.uuid === pickClass)?.name;
    setTyped('');
    send(clsName ? `Give me a summary of ${name} in class ${clsName}` : `Give me a summary of ${name}`);
  };
  const reset = () => {
    setMessages([]); setContext(null); setError('');
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
  };

  if (!canView) return <Navigate to="/" replace />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">Assistant</Typography>
          <Typography variant="body2" color="text.secondary">
            Ask about a student, then follow up — "his father's mobile?", "any siblings?", "attendance this month?"
          </Typography>
        </Box>
        {focusName && <Chip color="primary" variant="outlined" icon={<StudentIcon />} label={`On: ${focusName}`} sx={{ mr: 1 }} />}
        <ToggleButtonGroup size="small" exclusive value={lang} onChange={(_e, v) => v && setLang(v)} sx={{ mr: 1 }}>
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="hi">हिंदी</ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title="New student / clear"><span><IconButton onClick={reset} disabled={busy}><ResetIcon /></IconButton></span></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Thread */}
      <Box ref={threadRef} sx={{ flex: 1, overflowY: 'auto', pr: 0.5, mb: 2 }}>
        {messages.length === 0 && !busy && (
          <Card variant="outlined" sx={{ textAlign: 'center', py: 5 }}>
            <CardContent>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mx: 'auto', mb: 1.5 }}><MicIcon /></Avatar>
              <Typography variant="h6">Tap the mic and ask</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                e.g. <i>"Give me a summary of Aarav Sharma in class nine A"</i>
              </Typography>
            </CardContent>
          </Card>
        )}
        {messages.map((m, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', mb: 1.25 }}>
            <Box sx={{ maxWidth: m.card ? '100%' : '82%', width: m.card ? '100%' : 'auto' }}>
              <Box sx={{
                px: 1.75, py: 1.15, borderRadius: 2,
                bgcolor: m.role === 'user' ? 'primary.main' : 'background.paper',
                color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                border: m.role === 'user' ? 'none' : '1px solid', borderColor: 'divider',
                borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                borderBottomLeftRadius: m.role === 'user' ? 16 : 4,
              }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.text}</Typography>
                {m.role === 'assistant' && CAN_SPEAK && (
                  <IconButton size="small" onClick={() => speak(m.text)} sx={{ mt: 0.25, ml: -0.5, color: 'text.secondary' }}><SpeakIcon fontSize="inherit" /></IconButton>
                )}
              </Box>
              {m.card && <StudentCard card={m.card} />}
            </Box>
          </Box>
        ))}
        {busy && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', py: 1 }}>
            <CircularProgress size={16} /><Typography variant="body2">Thinking…</Typography>
          </Box>
        )}
      </Box>

      {/* Compose bar */}
      <Card>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <Tooltip title={listening ? 'Listening… tap to stop' : 'Tap and speak'}>
              <span>
                <IconButton color={listening ? 'error' : 'primary'} onClick={listening ? stopMic : startMic} disabled={busy}
                  sx={{ bgcolor: listening ? 'error.main' : 'primary.main', color: '#fff', '&:hover': { bgcolor: listening ? 'error.dark' : 'primary.dark' }, width: 48, height: 48 }}>
                  {listening ? <StopIcon /> : <MicIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <TextField
              size="small" fullWidth placeholder={focusName ? `Ask about ${focusName}, or type a new name…` : 'Ask about a student…'}
              value={typed} onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && typed.trim()) { context ? (send(typed), setTyped('')) : askTyped(); } }}
            />
            {!context && (
              <TextField select size="small" label="Class" value={pickClass} onChange={(e) => setPickClass(e.target.value)} sx={{ minWidth: 130 }}>
                <MenuItem value="">Any</MenuItem>
                {classes.map((c) => <MenuItem key={c.uuid} value={c.uuid}>{c.name}</MenuItem>)}
              </TextField>
            )}
            <Button variant="contained" startIcon={<SendIcon />} disabled={busy || !typed.trim()}
              onClick={() => { if (context) { send(typed); setTyped(''); } else { askTyped(); } }}>
              Ask
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
