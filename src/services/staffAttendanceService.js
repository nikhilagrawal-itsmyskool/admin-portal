import api from '../config/api';

// Staff attendance (live-ESSL generation): derives daily staff in/out from biometric
// punches against season-aware policy, with a regularization -> director-approval flow.
// Mirrors the core-api `staff-attendance` module. Distinct from the student roll-call
// `attendance` module and the older leave-based Excel import.
export const staffAttendanceService = {
  // ── Config (god-only) ─────────────────────────────────────────────────────────
  getConfig: async () => (await api.get('/staff-attendance/config')).data,
  updateConfig: async (data) => (await api.put('/staff-attendance/config', data)).data,
  listSeasons: async () => (await api.get('/staff-attendance/config/seasons')).data,
  createSeason: async (data) => (await api.post('/staff-attendance/config/seasons', data)).data,
  updateSeason: async (id, data) => (await api.put(`/staff-attendance/config/seasons/${id}`, data)).data,
  deleteSeason: async (id) => (await api.delete(`/staff-attendance/config/seasons/${id}`)).data,

  // ── Oversight ───────────────────────────────────────────────────────────────
  dayView: async (date) => (await api.get('/staff-attendance/day', { params: { date } })).data,
  report: async (params = {}) => (await api.get('/staff-attendance/report', { params })).data,
  employeeAttendance: async (id, params = {}) => (await api.get(`/staff-attendance/employees/${id}`, { params })).data,

  // ── Regularization queue ──────────────────────────────────────────────────────
  listRegularizations: async (params = {}) => (await api.get('/staff-attendance/regularizations', { params })).data,
  approveRegularization: async (id, comment) => (await api.post(`/staff-attendance/regularizations/${id}/approve`, { comment })).data,
  rejectRegularization: async (id, comment) => (await api.post(`/staff-attendance/regularizations/${id}/reject`, { comment })).data,

  // ── Employee self-service (/me) ────────────────────────────────────────────────
  myAttendance: async (params = {}) => (await api.get('/staff-attendance/me/attendance', { params })).data,
  myRegularizations: async () => (await api.get('/staff-attendance/me/regularizations')).data,
  applyRegularization: async (data) => (await api.post('/staff-attendance/me/regularizations', data)).data,
  cancelRegularization: async (id) => (await api.post(`/staff-attendance/me/regularizations/${id}/cancel`)).data,
};

// Shared status → MUI Chip color + label, used across the staff-attendance screens.
export const STATUS_META = {
  present: { label: 'Present', color: 'success' },
  late: { label: 'Late', color: 'warning' },
  half_day: { label: 'Half day', color: 'warning' },
  missing_punch: { label: 'Missing punch', color: 'error' },
  absent: { label: 'Absent', color: 'error' },
  regularized: { label: 'Regularized', color: 'info' },
  on_leave: { label: 'On leave', color: 'default' },
  holiday: { label: 'Holiday', color: 'default' },
  weekly_off: { label: 'Weekly off', color: 'default' },
};

export const REG_KINDS = [
  { value: 'missing_in', label: 'Missing check-in' },
  { value: 'missing_out', label: 'Missing check-out' },
  { value: 'missing_both', label: 'Missing both' },
  { value: 'late', label: 'Marked late' },
  { value: 'absent', label: 'Marked absent' },
  { value: 'other', label: 'Other' },
];
