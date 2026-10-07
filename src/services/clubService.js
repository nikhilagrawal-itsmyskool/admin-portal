import api from '../config/api';

// Clubs & Activities (day-neutral "Saturday Activities" engine). Mirrors modules/club/*.
export const clubService = {
  // ── Clubs / config / settings ──────────────────────────────────────────────
  listClubs: async () => (await api.get('/club/clubs')).data,
  getClub: async (id) => (await api.get(`/club/clubs/${id}`)).data,
  createClub: async (body) => (await api.post('/club/clubs', body)).data,
  updateClub: async (id, body) => (await api.put(`/club/clubs/${id}`, body)).data,
  getConfig: async (id) => (await api.get(`/club/clubs/${id}/config`)).data,
  updateConfig: async (id, body) => (await api.put(`/club/clubs/${id}/config`, body)).data,
  getSettings: async () => (await api.get('/club/settings')).data,
  updateSettings: async (body) => (await api.put('/club/settings', body)).data,
  getGrades: async () => (await api.get('/club/grades')).data,

  // ── Activity bank ────────────────────────────────────────────────────────────
  listActivities: async (params) => (await api.get('/club/activities', { params })).data,
  getActivity: async (id) => (await api.get(`/club/activities/${id}`)).data,
  createActivity: async (body) => (await api.post('/club/activities', body)).data,
  updateDraft: async (id, content) => (await api.put(`/club/activities/${id}/draft`, content)).data,
  createRevision: async (id) => (await api.post(`/club/activities/${id}/revise`, {})).data,
  replaceMaterials: async (id, materials) => (await api.put(`/club/activities/${id}/materials`, { materials })).data,
  approve: async (id, versionId) => (await api.post(`/club/activities/${id}/approve`, { versionId })).data,
  setAvailability: async (id, availability, reason) => (await api.post(`/club/activities/${id}/availability`, { availability, reason })).data,
  flagActivity: async (id, note) => (await api.post(`/club/activities/${id}/flag`, { note })).data,

  // ── Import / export round-trip ────────────────────────────────────────────────
  exportBank: async (clubId) => (await api.get(`/club/clubs/${clubId}/activities/export`)).data,
  importPreview: async (clubId, file) => (await api.post(`/club/clubs/${clubId}/activities/import/preview`, { file })).data,
  importCommit: async (clubId, file, fileName) => (await api.post(`/club/clubs/${clubId}/activities/import`, { file, fileName })).data,
  listImports: async (clubId) => (await api.get(`/club/clubs/${clubId}/imports`)).data,
  downloadImport: async (importId) => (await api.get(`/club/imports/${importId}/file`)).data,

  // ── Review queue ───────────────────────────────────────────────────────────────
  listReviews: async (status = 'open') => (await api.get('/club/reviews', { params: { status } })).data,
  decideReview: async (id, decision, note) => (await api.post(`/club/reviews/${id}/decide`, { decision, note })).data,

  // ── Plan board ───────────────────────────────────────────────────────────────
  listPlans: async (params) => (await api.get('/club/plans', { params })).data,
  getPlan: async (id) => (await api.get(`/club/plans/${id}`)).data,
  validatePlan: async (id) => (await api.get(`/club/plans/${id}/validate`)).data,
  createPlan: async (body) => (await api.post('/club/plans', body)).data,
  updatePlan: async (id, body) => (await api.put(`/club/plans/${id}`, body)).data,
  cancelPlan: async (id, reason) => (await api.post(`/club/plans/${id}/cancel`, { reason })).data,
  addSlot: async (id, body) => (await api.post(`/club/plans/${id}/slots`, body)).data,
  removeSlot: async (id, slotId) => (await api.delete(`/club/plans/${id}/slots/${slotId}`)).data,
  addGroup: async (id, body) => (await api.post(`/club/plans/${id}/groups`, body)).data,
  removeGroup: async (id, groupId) => (await api.delete(`/club/plans/${id}/groups/${groupId}`)).data,
  generateGroups: async (id) => (await api.post(`/club/plans/${id}/groups/generate`, {})).data,
  saveAssignment: async (id, body) => (await api.post(`/club/plans/${id}/assignments`, body)).data,
  changeAssignment: async (id, body) => (await api.post(`/club/plans/${id}/assignments/change`, body)).data,
  cancelAssignment: async (assignmentId, reason) => (await api.post(`/club/assignments/${assignmentId}/cancel`, { reason })).data,
  adminComplete: async (assignmentId, body) => (await api.post(`/club/assignments/${assignmentId}/complete`, body)).data,
  publishPlan: async (id, rowVersion) => (await api.post(`/club/plans/${id}/publish`, { rowVersion })).data,
  closePlan: async (id) => (await api.post(`/club/plans/${id}/close`, {})).data,
  reopenPlan: async (id) => (await api.post(`/club/plans/${id}/reopen`, {})).data,

  // ── Teacher PWA conduct ────────────────────────────────────────────────────────
  myPlan: async (date) => (await api.get('/club/me/plan', { params: { date } })).data,
  myGuide: async (assignmentId) => (await api.get(`/club/me/assignments/${assignmentId}/guide`)).data,
  myClose: async (assignmentId, body) => (await api.post(`/club/me/assignments/${assignmentId}/close`, body)).data,
  myReportSafety: async (assignmentId, note) => (await api.post(`/club/me/assignments/${assignmentId}/report-safety`, { note })).data,
};
