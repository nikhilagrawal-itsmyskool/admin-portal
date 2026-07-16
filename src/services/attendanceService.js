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

  // A student's attendance for the 360 view: { summary, days:[{date,status,remark,className}] }
  getStudentAttendance: async (studentId, params = {}) => {
    // params: { academicYearId, from, to }
    const response = await api.get(`/attendance/student/${studentId}`, { params });
    return response.data;
  },

  // Class register grid: { dates:[...], students:[{ name, admissionNumber, rollNumber, marks:{date:status}, present, absent, leave, working, percent }] }
  getClassRegister: async (params = {}) => {
    // params: { classId, academicYearId, from, to }
    const response = await api.get('/attendance/register', { params });
    return response.data;
  },
};
