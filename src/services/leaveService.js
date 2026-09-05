import api from '../config/api';

// Staff leave & attendance. Self-service (/me/*) is scoped to the logged-in employee;
// the admin/oversight calls need the leave.manage permission (god only for now). Mirrors
// the core-api `leave` module.
export const leaveService = {
  // ── Config + types ──────────────────────────────────────────────────────────
  getConfig: async () => (await api.get('/leave/config')).data,
  getTypes: async () => (await api.get('/leave/types')).data,

  // ── Self-service (/me) ────────────────────────────────────────────────────────
  myTypes: async () => (await api.get('/leave/me/types')).data,
  mySummary: async (month) => (await api.get('/leave/me/summary', { params: { month } })).data,
  myApplications: async (params = {}) => (await api.get('/leave/me/applications', { params })).data,
  apply: async (data) => (await api.post('/leave/me/applications', data)).data,
  cancel: async (id) => (await api.post(`/leave/me/applications/${id}/cancel`)).data,
  myAttendance: async (month) => (await api.get('/leave/me/attendance', { params: { month } })).data,
  myDeductions: async (month) => (await api.get('/leave/me/deductions', { params: { month } })).data,

  // ── Oversight: applications + decisions ───────────────────────────────────────
  listApplications: async (params = {}) => (await api.get('/leave/applications', { params })).data,
  getApplication: async (id) => (await api.get(`/leave/applications/${id}`)).data,
  approve: async (id) => (await api.post(`/leave/applications/${id}/approve`)).data,
  reject: async (id, note) => (await api.post(`/leave/applications/${id}/reject`, { note })).data,
  getAudit: async (id) => (await api.get(`/leave/applications/${id}/audit`)).data,
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
