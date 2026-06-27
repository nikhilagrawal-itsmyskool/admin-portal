import api from '../config/api';

export const attendanceService = {
  // Roster for the marking screen: { session, students: [{ studentId, name, admissionNumber, status?, remark? }] }
  getRoster: async ({ classId, academicYearId, date }) => {
    const response = await api.get('/attendance/roster', { params: { classId, academicYearId, date } });
    return response.data;
  },

  // Create/open a session for class+date (idempotent). Returns the session.
  openSession: async (data) => {
    const response = await api.post('/attendance/sessions', data);
    return response.data;
  },

  // Save marked exceptions: marks = [{ studentId, status, remark }]
  saveMarks: async (sessionId, marks) => {
    const response = await api.put(`/attendance/sessions/${sessionId}/marks`, { marks });
    return response.data;
  },

  // Finalize: fills the roster present + fires absence notifications. Returns counts.
  finalize: async (sessionId) => {
    const response = await api.post(`/attendance/sessions/${sessionId}/finalize`);
    return response.data;
  },

  // Session detail: { session, records, audit }
  getSession: async (id) => {
    const response = await api.get(`/attendance/sessions/${id}`);
    return response.data;
  },

  // History list: { sessions: [...] }
  listSessions: async (filters = {}) => {
    const response = await api.get('/attendance/sessions', { params: filters });
    return response.data;
  },

  // Edit one record (post-finalize correction): { status?, remark? }
  editRecord: async (recordId, data) => {
    const response = await api.put(`/attendance/records/${recordId}`, data);
    return response.data;
  },
};
