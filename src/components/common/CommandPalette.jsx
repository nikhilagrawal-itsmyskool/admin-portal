import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  TextField,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Box,
  Chip,
  Typography,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { studentService } from '../../services/studentService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';

// Global "type anything, get the student" palette. Open with Ctrl/⌘+K (or the
// window 'open-command-palette' event fired by the header search button).
export default function CommandPalette() {
  const navigate = useNavigate();
  const can = useCan();
  const enabled = can(ACTIONS.STUDENT_VIEW);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  // Scope: 'current' pins to the current session (default); 'all' searches the
  // whole-school population (alumni, withdrawn, not-yet-enrolled).
  const [scope, setScope] = useState('current');
  const [currentYear, setCurrentYear] = useState(null);
  const abortRef = useRef(null);
  const listRef = useRef(null);

  // Global shortcut + external open event.
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpen);
    };
  }, [enabled]);

  // Resolve the current session once the palette opens (for the scope pin + the
  // "not in <year>" divider label).
  useEffect(() => {
    if (!open || currentYear) return;
    academicCalendarService
      .getCurrentAcademicYear()
      .then((y) => y && setCurrentYear(y))
      .catch(() => {});
  }, [open, currentYear]);

  // Debounced search. Re-runs when the scope toggles.
  useEffect(() => {
    if (!open) return undefined;
    const term = q.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const academicYearId = scope === 'all' ? 'all' : currentYear?.uuid;
        const { results: rows } = await studentService.omniSearch(term, ctrl.signal, { academicYearId });
        setResults(rows || []);
        setActive(0);
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, scope, currentYear]);

  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setResults([]);
    setActive(0);
    setScope('current');
  }, []);

  const choose = useCallback(
    (row) => {
      if (!row) return;
      close();
      navigate(`/students/${row.uuid}`);
    },
    [close, navigate]
  );

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  };

  // Keep the active row in view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!enabled) return null;

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { position: 'fixed', top: 80, m: 0, borderRadius: 2 } }}
    >
      <Box sx={{ p: 1.5, pb: 0.5 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search students by name, admission no, parent name or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={18} /> : <SearchIcon fontSize="small" />}
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
          <Chip
            size="small"
            label={currentYear?.name ? `Current: ${currentYear.name}` : 'Current session'}
            color={scope === 'current' ? 'primary' : 'default'}
            variant={scope === 'current' ? 'filled' : 'outlined'}
            onClick={() => setScope('current')}
          />
          <Chip
            size="small"
            label="All students"
            color={scope === 'all' ? 'primary' : 'default'}
            variant={scope === 'all' ? 'filled' : 'outlined'}
            onClick={() => setScope('all')}
          />
        </Box>
      </Box>
      <List ref={listRef} sx={{ maxHeight: '55vh', overflow: 'auto', pt: 0 }}>
        {results.length === 0 && q.trim() && !loading && (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No students found.
            </Typography>
          </Box>
        )}
        {(() => {
          // Two-section render: current-year hits first (backend ranks them first),
          // then a "Not in <year>" divider before the rest, which render greyed.
          // The flat index (data-idx) is preserved so keyboard nav still works.
          let dividerShown = false;
          return results.map((r, i) => {
            const outOfScope = scope === 'current' && !r.inCurrentYear;
            const showDivider = outOfScope && !dividerShown;
            if (showDivider) dividerShown = true;
            return (
              <React.Fragment key={r.uuid}>
                {showDivider && (
                  <Box
                    sx={{
                      px: 2,
                      py: 0.5,
                      bgcolor: '#fafafa',
                      borderTop: '1px solid #eee',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Not in {currentYear?.name || 'current session'}
                    </Typography>
                  </Box>
                )}
                <ListItemButton
                  data-idx={i}
                  selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                  sx={{ opacity: outOfScope ? 0.6 : 1 }}
                >
                  <ListItemAvatar>
                    <Avatar src={r.photoUrl || undefined} sx={{ width: 36, height: 36 }}>
                      {r.name?.[0]?.toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {r.name}
                        </Typography>
                        {r.admissionNumber && <Chip size="small" label={r.admissionNumber} variant="outlined" />}
                        {r.className && <Chip size="small" color="primary" variant="outlined" label={r.className} />}
                        {r.status === 'inactive' && <Chip size="small" label="inactive" />}
                      </Box>
                    }
                    secondary={
                      [r.fatherName && `F: ${r.fatherName}`, r.motherName && `M: ${r.motherName}`]
                        .filter(Boolean)
                        .join('   ') || null
                    }
                  />
                </ListItemButton>
              </React.Fragment>
            );
          });
        })()}
      </List>
      {results.length > 0 && (
        <Box sx={{ px: 2, py: 0.75, borderTop: '1px solid #eee' }}>
          <Typography variant="caption" color="text.secondary">
            ↑↓ to navigate · Enter to open · Esc to close
          </Typography>
        </Box>
      )}
    </Dialog>
  );
}
