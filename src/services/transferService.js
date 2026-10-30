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

  // Derived identity + config defaults to prefill a new TC form.
  prefillTc: async (studentId) => {
    const response = await api.get(`/transfer/students/${studentId}/tc/prefill`);
    return response.data; // { derived, config, suggested, duesOutstanding }
  },

  createTc: async (studentId, data) => {
    const response = await api.post(`/transfer/students/${studentId}/tc`, data);
    return response.data;
  },

  updateTc: async (studentId, tcId, data) => {
    // set status:'issued' to withdraw the student
    const response = await api.put(`/transfer/students/${studentId}/tc/${tcId}`, data);
    return response.data;
  },

  // ── Per-school TC config (god-only write) ──────────────────────────────────
  getConfig: async () => {
    const response = await api.get('/transfer/config');
    return response.data; // TransferConfig
  },

  updateConfig: async (data) => {
    const response = await api.put('/transfer/config', data);
    return response.data; // TransferConfig
  },

  // Certificate HTML (auth-gated). Fetched via the authenticated client, not window.open.
  getTcHtml: async (studentId, tcId) => {
    const response = await api.get(`/transfer/students/${studentId}/tc/${tcId}/print`, { responseType: 'text' });
    return response.data; // HTML string
  },
};

// Print a TC: open a blank window synchronously (dodges popup blockers), fetch the
// auth-gated HTML, and write it in. Mirrors fees openReceipt().
export async function openTc(studentId, tcId) {
  const w = window.open('', '_blank');
  try {
    const html = await transferService.getTcHtml(studentId, tcId);
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
    return true;
  } catch (e) {
    if (w) w.close();
    throw e;
  }
}
