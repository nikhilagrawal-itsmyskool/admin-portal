import api from '../config/api';

// Wraps the core-api /library/* endpoints. Three-level model:
// Work (intellectual work) -> Title (edition+language) -> Copy (physical book).
export const libraryService = {
  // ---- Reference / lookups ----
  getEnums: async () => (await api.get('/library/enums')).data,

  getDdc: async (q) => (await api.get('/library/ddc', { params: q ? { q } : {} })).data,
  getDdcByCode: async (code) => (await api.get(`/library/ddc/${code}`)).data,

  getLookups: async (type) => (await api.get(type ? `/library/lookups/${type}` : '/library/lookups')).data,
  createLookup: async (data) => (await api.post('/library/lookups', data)).data,
  updateLookup: async (id, data) => (await api.put(`/library/lookups/${id}`, data)).data,
  deleteLookup: async (id) => (await api.delete(`/library/lookups/${id}`)).data,

  // ---- Author / call number / ISBN ----
  normalizeAuthor: async (input) => (await api.post('/library/authors/normalize', { input })).data,
  generateCallNo: async (data) => (await api.post('/library/callno/generate', data)).data,
  isbnLookup: async (isbn) => (await api.get(`/library/isbn/${isbn}`)).data,
  getKeywords: async (q) => (await api.get('/library/keywords', { params: q ? { q } : {} })).data,
  getUsedDdc: async (q) => (await api.get('/library/ddc-used', { params: q ? { q } : {} })).data,

  // ---- Catalog / works / titles / copies ----
  catalog: async (data) => (await api.post('/library/catalog', data)).data,

  searchWorks: async (filters = {}) => (await api.get('/library/works', { params: filters })).data,
  getWork: async (id) => (await api.get(`/library/works/${id}`)).data,
  createWork: async (data) => (await api.post('/library/works', data)).data,
  updateWork: async (id, data) => (await api.put(`/library/works/${id}`, data)).data,
  addTitle: async (workId, data) => (await api.post(`/library/works/${workId}/titles`, data)).data,

  getTitle: async (id) => (await api.get(`/library/titles/${id}`)).data,
  updateTitle: async (id, data) => (await api.put(`/library/titles/${id}`, data)).data,
  addCopies: async (titleId, copies) => (await api.post(`/library/titles/${titleId}/copies`, { copies })).data,
  listCopiesByTitle: async (titleId) => (await api.get(`/library/titles/${titleId}/copies`)).data,
  searchCopies: async (params = {}) => (await api.get('/library/copies-search', { params })).data,

  getCopy: async (id) => (await api.get(`/library/copies/${id}`)).data,
  getCopyByAccession: async (accessionNo) => (await api.get(`/library/copies/by-accession/${encodeURIComponent(accessionNo)}`)).data,
  updateCopy: async (id, data) => (await api.put(`/library/copies/${id}`, data)).data,
  deleteCopy: async (id) => (await api.delete(`/library/copies/${id}`)).data,

  // ---- Labels ----
  getLabel: async (copyId, format = 'qr') => (await api.get(`/library/copies/${copyId}/label`, { params: { format } })).data,
  resolve: async (accessionNo) => (await api.get(`/library/resolve/${encodeURIComponent(accessionNo)}`)).data,

  // ---- Circulation ----
  issue: async (data) => (await api.post('/library/issue', data)).data,
  returnBook: async (data) => (await api.post('/library/return', data)).data,
  renew: async (data) => (await api.post('/library/renew', data)).data,
  listCirculation: async (filters = {}) => (await api.get('/library/circulation', { params: filters })).data,
  borrowerLoans: async (type, id) => (await api.get(`/library/borrowers/${type}/${id}/loans`)).data,

  // ---- Fines ----
  listFines: async (filters = {}) => (await api.get('/library/fines', { params: filters })).data,
  collectFine: async (id, data) => (await api.post(`/library/fines/${id}/collect`, data)).data,
  waiveFine: async (id, data) => (await api.post(`/library/fines/${id}/waive`, data)).data,

  // ---- Policy ----
  getPolicy: async () => (await api.get('/library/policy')).data,
  updatePolicy: async (data) => (await api.put('/library/policy', data)).data,
};
