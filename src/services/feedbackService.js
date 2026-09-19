import api from '../config/api';

// Home-visit feedback / complaints — open-routing ticket model. Recording + the teacher
// /me surface are open to teachers; the dashboard + director actions need feedback.review
// (god only for now). Mirrors the core-api `feedback` module.
export const feedbackService = {
  // ── Shared lookups ────────────────────────────────────────────────────────────
  categories: async () => (await api.get('/feedback/categories')).data,

  // ── Record (teacher; optional evidence attachments) ─────────────────────────────
  record: async (data) => (await api.post('/feedback', data)).data,

  // ── Teacher PWA (/me) ─────────────────────────────────────────────────────────
  // params: { tab: 'act'|'watching'|'recorded', status? }
  mine: async (params = {}) => (await api.get('/feedback/me', { params })).data,
  getMine: async (id) => (await api.get(`/feedback/me/${id}`)).data,
  commentMine: async (id, data) => (await api.post(`/feedback/me/${id}/comment`, data)).data,
  assignMine: async (id, data) => (await api.post(`/feedback/me/${id}/assign`, data)).data,
  seenMine: async (id) => (await api.post(`/feedback/me/${id}/seen`)).data,
  attachmentMine: async (fileId) => (await api.get(`/feedback/me/attachment/${fileId}`)).data,

  // ── Director / oversight (feedback.review) ────────────────────────────────────
  list: async (params = {}) => (await api.get('/feedback', { params })).data,
  // params: { by: student|class|teacher|date, academicYearId? }
  grouped: async (params = {}) => (await api.get('/feedback/grouped', { params })).data,
  summary: async (academicYearId) =>
    (await api.get('/feedback/summary', { params: academicYearId ? { academicYearId } : {} })).data,
  getById: async (id) => (await api.get(`/feedback/${id}`)).data,
  comment: async (id, data) => (await api.post(`/feedback/${id}/comment`, data)).data,
  assign: async (id, data) => (await api.post(`/feedback/${id}/assign`, data)).data,
  complete: async (id, note) => (await api.post(`/feedback/${id}/complete`, { note })).data,
  cancel: async (id, note) => (await api.post(`/feedback/${id}/cancel`, { note })).data,
  reopen: async (id, data) => (await api.post(`/feedback/${id}/reopen`, data)).data,
  seen: async (id) => (await api.post(`/feedback/${id}/seen`)).data,
  attachment: async (fileId) => (await api.get(`/feedback/attachment/${fileId}`)).data,
};

// Status → MUI Chip color / label, shared across the feedback pages.
export const FEEDBACK_STATUS_COLOR = {
  open: 'info',
  completed: 'success',
  cancelled: 'default',
};
export const FEEDBACK_STATUS_LABEL = {
  open: 'Open',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Timeline event → human label + accent, for rendering the thread.
export const EVENT_META = {
  record: { label: 'recorded', color: '#0097a7' },
  comment: { label: 'commented', color: '#5c6bc0' },
  assign: { label: 'assigned', color: '#f57c00' },
  complete: { label: 'completed', color: '#2e7d32' },
  cancel: { label: 'cancelled', color: '#9e9e9e' },
  reopen: { label: 'reopened', color: '#ef6c00' },
};

export const ATTACH_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
export const ATTACH_MAX_BYTES = 8 * 1024 * 1024;

// File -> raw base64 (strips the data: URI prefix), for the attachment payload.
export function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Turn selected File[] into the AttachmentInput[] the API expects.
export async function filesToAttachments(files) {
  const out = [];
  for (const f of files) {
    out.push({ fileName: f.name, mimeType: f.type, base64Data: await readFileB64(f) });
  }
  return out;
}
