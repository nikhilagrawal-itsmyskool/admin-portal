import api from '../config/api';

// Transfer Certificate (TC) module. Issuing a TC withdraws the student
// (student.status -> inactive, withdrawal_date set) on the backend.
export const transferService = {
  // School-wide TC list/search. params: { query, status }
  listTcs: async (params = {}) => {
    const response = await api.get('/transfer/tc', { params });
    return response.data; // { tcs: [...] }
  },

  getTcs: async (studentId) => {
    const response = await api.get(`/transfer/students/${studentId}/tc`);
    return response.data; // { tcs: [...] }
  },

  createTc: async (studentId, data) => {
    // { applicationDate?, srnNumber?, issueDate?, reasonForLeaving?, totalAttendanceDays?, totalWorkingDays?, status? }
    const response = await api.post(`/transfer/students/${studentId}/tc`, data);
    return response.data;
  },

  updateTc: async (studentId, tcId, data) => {
    // set status:'issued' to withdraw the student
    const response = await api.put(`/transfer/students/${studentId}/tc/${tcId}`, data);
    return response.data;
  },
};
