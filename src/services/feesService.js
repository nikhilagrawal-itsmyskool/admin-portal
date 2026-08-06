import api from '../config/api';

// Thin wrapper over the core-api `fees` module (gateway route /fees/*).
// All payloads/results are camelCase (core-api transforms snake_case↔camelCase).
export const feesService = {
  // ---- Lookups (enums: feeHeadKinds, concessionTypes, paymentModes, ...) ----
  getLookups: async () => (await api.get('/fees/lookups')).data,

  // ---- Fee Cycles ----
  getCycles: async (academicYearId) =>
    (await api.get('/fees/cycles', { params: academicYearId ? { academicYearId } : {} })).data,
  createCycle: async (data) => (await api.post('/fees/cycles', data)).data,
  updateCycle: async (id, data) => (await api.put(`/fees/cycles/${id}`, data)).data,
  deleteCycle: async (id) => (await api.delete(`/fees/cycles/${id}`)).data,

  // ---- Fee Heads ----
  getHeads: async (academicYearId) =>
    (await api.get('/fees/heads', { params: academicYearId ? { academicYearId } : {} })).data,
  createHead: async (data) => (await api.post('/fees/heads', data)).data,
  updateHead: async (id, data) => (await api.put(`/fees/heads/${id}`, data)).data,
  deleteHead: async (id) => (await api.delete(`/fees/heads/${id}`)).data,

  // ---- Fee Structure (class × head × cycle → amount) ----
  getStructure: async (params = {}) => (await api.get('/fees/structure', { params })).data,
  createStructure: async (data) => (await api.post('/fees/structure', data)).data,
  updateStructure: async (id, data) => (await api.put(`/fees/structure/${id}`, data)).data,
  deleteStructure: async (id) => (await api.delete(`/fees/structure/${id}`)).data,
  bulkStructure: async (data) => (await api.post('/fees/structure/bulk', data)).data,
  copyStructure: async (data) => (await api.post('/fees/structure/copy', data)).data,
  getStructureStudents: async (params = {}) =>
    (await api.get('/fees/structure/students', { params })).data,
  upsertStructureStudent: async (data) => (await api.post('/fees/structure/students', data)).data,
  deleteStructureStudent: async (id) => (await api.delete(`/fees/structure/students/${id}`)).data,

  // ---- Transport Slabs (km band → fee) ----
  getSlabs: async (academicYearId) =>
    (await api.get('/fees/transport-slabs', { params: academicYearId ? { academicYearId } : {} })).data,
  createSlab: async (data) => (await api.post('/fees/transport-slabs', data)).data,
  updateSlab: async (id, data) => (await api.put(`/fees/transport-slabs/${id}`, data)).data,
  deleteSlab: async (id) => (await api.delete(`/fees/transport-slabs/${id}`)).data,

  // ---- Late-fee rules ----
  getLateFeeRules: async (academicYearId) =>
    (await api.get('/fees/late-fee-rules', { params: academicYearId ? { academicYearId } : {} })).data,
  createLateFeeRule: async (data) => (await api.post('/fees/late-fee-rules', data)).data,
  updateLateFeeRule: async (id, data) => (await api.put(`/fees/late-fee-rules/${id}`, data)).data,
  deleteLateFeeRule: async (id) => (await api.delete(`/fees/late-fee-rules/${id}`)).data,

  // ---- Concessions (+ roster) ----
  getConcessions: async (academicYearId) =>
    (await api.get('/fees/concessions', { params: academicYearId ? { academicYearId } : {} })).data,
  createConcession: async (data) => (await api.post('/fees/concessions', data)).data,
  updateConcession: async (id, data) => (await api.put(`/fees/concessions/${id}`, data)).data,
  deleteConcession: async (id) => (await api.delete(`/fees/concessions/${id}`)).data,
  getConcessionStudents: async (id) => (await api.get(`/fees/concessions/${id}/students`)).data,
  getMultiConcession: async (academicYearId) => (await api.get('/fees/concessions/multi', { params: { academicYearId } })).data,
  addConcessionStudents: async (id, data) =>
    (await api.post(`/fees/concessions/${id}/students`, data)).data,
  removeConcessionStudent: async (id, studentId) =>
    (await api.delete(`/fees/concessions/${id}/students/${studentId}`)).data,

  // ---- Waivers ----
  getWaivers: async (params = {}) => (await api.get('/fees/waivers', { params })).data,
  createWaiver: async (data) => (await api.post('/fees/waivers', data)).data,
  deleteWaiver: async (id) => (await api.delete(`/fees/waivers/${id}`)).data,

  // ---- Ledger + charge run ----
  getStudentLedger: async (studentId, academicYearId) =>
    (await api.get(`/fees/students/${studentId}/ledger`, {
      params: academicYearId ? { academicYearId } : {},
    })).data,
  getStudentSummary: async (studentId, academicYearId) =>
    (await api.get(`/fees/students/${studentId}/summary`, {
      params: academicYearId ? { academicYearId } : {},
    })).data,
  chargeRun: async (data) => (await api.post('/fees/charge-run', data)).data,

  // ---- Receipts / collection ----
  collect: async (data) => (await api.post('/fees/receipts', data)).data,
  getReceipts: async (params = {}) => (await api.get('/fees/receipts', { params })).data,
  getReceiptById: async (id) => (await api.get(`/fees/receipts/${id}`)).data,
  cancelReceipt: async (id, data = {}) => (await api.post(`/fees/receipts/${id}/cancel`, data)).data,
  // print returns HTML — expose the URL so callers can open/print it.
  receiptPrintUrl: (id) => `${api.defaults.baseURL}/fees/receipts/${id}/print`,
  getReceiptHtml: async (id) => (await api.get(`/fees/receipts/${id}/print`)).data,
  collectAdhoc: async (data) => (await api.post('/fees/receipts/adhoc', data)).data,
  collectTransport: async (data) => (await api.post('/fees/receipts/transport', data)).data,

  // ---- Refunds ----
  getRefunds: async (params = {}) => (await api.get('/fees/refunds', { params })).data,
  createRefund: async (data) => (await api.post('/fees/refunds', data)).data,

  // ---- Reports ----
  getDailyCollection: async (params = {}) =>
    (await api.get('/fees/reports/daily-collection', { params })).data,
  getOverview: async (academicYearId) =>
    (await api.get('/fees/reports/overview', { params: academicYearId ? { academicYearId } : {} })).data,
  getUngeneratedStudents: async (academicYearId) =>
    (await api.get('/fees/reports/ungenerated-students', { params: { academicYearId } })).data,
  getDues: async (params = {}) =>
    (await api.get('/fees/reports/dues', { params })).data,
  setFollowup: async (data) => (await api.post('/fees/reports/followup', data)).data,
  getFollowup: async (params = {}) => (await api.get('/fees/reports/followup', { params })).data,
};

export default feesService;
