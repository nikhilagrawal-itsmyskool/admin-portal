import api from '../config/api';

// Home-visit feedback / complaints. Recording + the teacher /me surface are open to
// teachers; the dashboard + review actions need feedback.review (god only for now).
// Mirrors the core-api `feedback` module.
export const feedbackService = {
  // ── Shared lookups ────────────────────────────────────────────────────────────
  categories: async () => (await api.get('/feedback/categories')).data,

  // ── Record (teacher) ──────────────────────────────────────────────────────────
  record: async (data) => (await api.post('/feedback', data)).data,
  // One in-app notification per teacher for the whole visit (called once after the
  // record loop). Best-effort on the caller's side.
  notifyVisit: async (feedbackIds) => (await api.post('/feedback/notify-visit', { feedbackIds })).data,

  // ── Teacher PWA (/me) ─────────────────────────────────────────────────────────
  mine: async (params = {}) => (await api.get('/feedback/me', { params })).data,
  getMine: async (id) => (await api.get(`/feedback/me/${id}`)).data,
  respond: async (id, comment) => (await api.post(`/feedback/me/${id}/respond`, { comment })).data,

  // ── Director / oversight (feedback.review) ────────────────────────────────────
  list: async (params = {}) => (await api.get('/feedback', { params })).data,
  summary: async (academicYearId) =>
    (await api.get('/feedback/summary', { params: academicYearId ? { academicYearId } : {} })).data,
  getById: async (id) => (await api.get(`/feedback/${id}`)).data,
  complete: async (id, note) => (await api.post(`/feedback/${id}/complete`, { note })).data,
  reopen: async (id, note) => (await api.post(`/feedback/${id}/reopen`, { note })).data,
};

// Status → MUI Chip color, shared across the feedback pages.
export const FEEDBACK_STATUS_COLOR = {
  assigned: 'info',
  reopened: 'warning',
  responded: 'primary',
  completed: 'success',
};

// Human labels for the statuses.
export const FEEDBACK_STATUS_LABEL = {
  assigned: 'Assigned',
  reopened: 'Reopened',
  responded: 'Responded',
  completed: 'Completed',
};
