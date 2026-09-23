import api from '../config/api';

// Staff leave & attendance. Self-service (/me/*) is scoped to the logged-in employee;
// the admin/oversight calls need the leave.manage permission (god only for now). Mirrors
// the core-api `leave` module.
export const leaveService = {
  // ── Config + types ──────────────────────────────────────────────────────────
  getConfig: async () => (await api.get('/leave/config')).data,
  updateConfig: async (data) => (await api.put('/leave/config', data)).data,
  getTypes: async () => (await api.get('/leave/types')).data,
  updateType: async (code, data) => (await api.put(`/leave/types/${code}`, data)).data,

  // ── Self-service (/me) ────────────────────────────────────────────────────────
  myTypes: async () => (await api.get('/leave/me/types')).data,
  mySummary: async (month) => (await api.get('/leave/me/summary', { params: { month } })).data,
  myApplications: async (params = {}) => (await api.get('/leave/me/applications', { params })).data,
  handoverPreview: async (fromDate, toDate) => (await api.get('/leave/me/handover-preview', { params: { fromDate, toDate } })).data,
  apply: async (data) => (await api.post('/leave/me/applications', data)).data,
  cancel: async (id) => (await api.post(`/leave/me/applications/${id}/cancel`)).data,
  myAttendance: async (month) => (await api.get('/leave/me/attendance', { params: { month } })).data,
  // Classes I've been asked to cover (substitute) + the handover behind each.
  covering: async () => (await api.get('/leave/me/covering')).data,
  getCovering: async (id) => (await api.get(`/leave/me/covering/${id}`)).data,
  coveringFile: async (id, fileId) => (await api.get(`/leave/me/covering/${id}/file/${fileId}`)).data,
  myDeductions: async (month) => (await api.get('/leave/me/deductions', { params: { month } })).data,

  // ── Oversight: applications + decisions ───────────────────────────────────────
  listApplications: async (params = {}) => (await api.get('/leave/applications', { params })).data,
  getApplication: async (id) => (await api.get(`/leave/applications/${id}`)).data,
  // Approve. The daily cap / annual quota are soft: without override the API may return
  // { needsConfirmation, warnings }; call again with override + a reason to approve anyway.
  approve: async (id, override = false, overrideReason = undefined) =>
    (await api.post(`/leave/applications/${id}/approve`, { override, overrideReason })).data,
  reject: async (id, note) => (await api.post(`/leave/applications/${id}/reject`, { note })).data,
  getAudit: async (id) => (await api.get(`/leave/applications/${id}/audit`)).data,
  getHandover: async (id) => (await api.get(`/leave/applications/${id}/handover`)).data,
  handoverFile: async (id, fileId) => (await api.get(`/leave/applications/${id}/handover/file/${fileId}`)).data,
  getAttachment: async (id) => (await api.get(`/leave/applications/${id}/attachment`)).data,
  balance: async (employeeId, month) => (await api.get('/leave/balance', { params: { employeeId, month } })).data,

  // ── Oversight: attendance ─────────────────────────────────────────────────────
  markAttendance: async (data) => (await api.post('/leave/attendance/mark', data)).data,
  importBiometric: async (data) => (await api.post('/leave/attendance/import', data)).data,
  importTimewatch: async (fileText, fileName, autoMapByName = true) =>
    (await api.post('/leave/attendance/import-timewatch', { fileText, fileName, autoMapByName })).data,
  listMap: async () => (await api.get('/leave/attendance/map')).data,
  mapEnroll: async (enrollCode, employeeId) => (await api.post('/leave/attendance/map', { enrollCode, employeeId })).data,
  employeeAttendance: async (id, month) => (await api.get(`/leave/employees/${id}/attendance`, { params: { month } })).data,
  dayView: async (date) => (await api.get('/leave/day', { params: { date } })).data,

  // ── Oversight: deductions (payroll) ──────────────────────────────────────────
  runDeductions: async (month) => (await api.post('/leave/deductions/run', null, { params: { month } })).data,
  listDeductions: async (month) => (await api.get('/leave/deductions', { params: { month } })).data,
  finalizeDeduction: async (id, applyLadder) => (await api.post(`/leave/deductions/${id}/finalize`, { applyLadder })).data,
  employeeDeductions: async (id, month) => (await api.get(`/leave/employees/${id}/deductions`, { params: { month } })).data,
};
