import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton, Badge, Menu, Box, Typography, Button, Divider, CircularProgress, Stack,
} from '@mui/material';
import { NotificationsNone as BellIcon, DoneAll as MarkAllIcon } from '@mui/icons-material';
import { notificationService } from '../services/notificationService';
import { fmtDate } from '../utils/date';

const POLL_MS = 60000;

// Route to open when a notification is tapped, matched by the notification `key`
// prefix. Keys not listed here just mark-read (no navigation). Extend as modules
// start surfacing their pings.
const ROUTE_BY_KEY_PREFIX = [
  ['feedback', '/feedback/me'],
  ['leave', '/leave/me'],
];

// Backend timestamps are UTC wall-clock text (no zone) — treat as UTC for "x ago".
function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
  if (isNaN(d.getTime())) return '';
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso);
}

function routeFor(key) {
  if (!key) return null;
  const hit = ROUTE_BY_KEY_PREFIX.find(([p]) => key.startsWith(p));
  return hit ? hit[1] : null;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await notificationService.list({ limit: 30 });
      if (!mounted.current) return;
      setItems(data.items || []);
      setUnread(data.unreadCount || 0);
    } catch {
      /* transient / not logged in — leave prior state */
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const t = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { mounted.current = false; clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  const open = async (e) => {
    setAnchorEl(e.currentTarget);
    setLoading(true);
    await load();
    if (mounted.current) setLoading(false);
  };
  const close = () => setAnchorEl(null);

  const onItemClick = async (n) => {
    close();
    if (!n.readAt) {
      setItems((xs) => xs.map((x) => (x.uuid === n.uuid ? { ...x, readAt: 'now' } : x)));
      setUnread((u) => Math.max(0, u - 1));
      notificationService.markRead(n.uuid).catch(() => load());
    }
    // Prefer a deep-link to the specific entity (e.g. a feedback ticket thread); fall back
    // to the key-prefix route.
    const to = (n.entityType === 'feedback' && n.entityId)
      ? `/feedback/t/${n.entityId}`
      : (n.entityType === 'leave_covering' && n.entityId)
      ? `/leave/covering/${n.entityId}`
      : routeFor(n.key);
    if (to) navigate(to);
  };

  const markAll = async () => {
    setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt || 'now' })));
    setUnread(0);
    try { await notificationService.markAllRead(); } catch { load(); }
  };

  return (
    <>
      <IconButton onClick={open} size="small" aria-label="Notifications" sx={{ color: '#222b45' }}>
        <Badge badgeContent={unread} color="error" max={99}>
          <BellIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxWidth: '92vw', maxHeight: 460, mt: 1 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Notifications</Typography>
          {unread > 0 && (
            <Button size="small" startIcon={<MarkAllIcon />} onClick={markAll}>Mark all read</Button>
          )}
        </Box>
        <Divider />

        {loading && items.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography sx={{ fontSize: 13 }}>You're all caught up.</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowY: 'auto' }}>
            {items.map((n) => (
              <Box
                key={n.uuid}
                onClick={() => onItemClick(n)}
                sx={{
                  px: 2, py: 1.25, cursor: 'pointer', borderBottom: '1px solid #f0f2f7',
                  bgcolor: n.readAt ? 'transparent' : 'rgba(51,102,255,0.06)',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  {!n.readAt && <Box sx={{ mt: '6px', width: 8, height: 8, borderRadius: '50%', bgcolor: '#3366ff', flexShrink: 0 }} />}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: n.readAt ? 500 : 700 }}>{n.title || 'Notification'}</Typography>
                    {n.body && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', whiteSpace: 'pre-wrap' }}>{n.body}</Typography>}
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>{timeAgo(n.createdAt)}</Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Menu>
    </>
  );
}
