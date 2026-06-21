import api from '../config/api';

export const assetService = {
  // ---- Lookups ----
  getTypes: async () => {
    const response = await api.get('/asset/lookups/types');
    return response.data; // { types: [...] }
  },

  getConditions: async () => {
    const response = await api.get('/asset/lookups/conditions');
    return response.data; // { conditions: [...] }
  },

  getStatuses: async () => {
    const response = await api.get('/asset/lookups/statuses');
    return response.data; // { statuses: [...] }
  },

  getKinds: async () => {
    const response = await api.get('/asset/lookups/kinds');
    return response.data; // { kinds: [...] }
  },

  // ---- Asset Types (managed lookup) ----
  listTypes: async () => {
    const response = await api.get('/asset/asset-types');
    return response.data; // [ ...types ]
  },

  createType: async (data) => {
    const response = await api.post('/asset/asset-types', data);
    return response.data;
  },

  updateType: async (id, data) => {
    const response = await api.put(`/asset/asset-types/${id}`, data);
    return response.data;
  },

  deleteType: async (id) => {
    const response = await api.delete(`/asset/asset-types/${id}`);
    return response.data;
  },

  // ---- Assets ----
  getAssets: async (filters = {}) => {
    const response = await api.get('/asset/assets', { params: filters });
    return response.data;
  },

  getTree: async (rootId) => {
    const params = rootId ? { rootId } : {};
    const response = await api.get('/asset/assets/tree', { params });
    return response.data;
  },

  getAsset: async (id) => {
    const response = await api.get(`/asset/assets/${id}`);
    return response.data;
  },

  createAsset: async (data) => {
    const response = await api.post('/asset/assets', data);
    return response.data;
  },

  updateAsset: async (id, data) => {
    const response = await api.put(`/asset/assets/${id}`, data);
    return response.data;
  },

  deleteAsset: async (id) => {
    const response = await api.delete(`/asset/assets/${id}`);
    return response.data;
  },

  // ---- Tree operations ----
  moveAsset: async (id, data) => {
    const response = await api.post(`/asset/assets/${id}/move`, data);
    return response.data;
  },

  individualize: async (id, data) => {
    const response = await api.post(`/asset/assets/${id}/individualize`, data);
    return response.data;
  },

  suggestCode: async (prefix) => {
    const params = prefix ? { prefix } : {};
    const response = await api.get('/asset/assets/code/suggest', { params });
    return response.data; // { code }
  },

  // Hierarchy-aware tag preview for a type under a parent.
  suggestTag: async ({ typeId, parentId } = {}) => {
    const params = {};
    if (typeId) params.typeId = typeId;
    if (parentId) params.parentId = parentId;
    const response = await api.get('/asset/assets/code/suggest', { params });
    return response.data; // { code }
  },

  // ---- Aggregates ----
  getSummary: async () => {
    const response = await api.get('/asset/assets/summary');
    return response.data; // [ { typeId, typeCode, typeLabel, kind, totalQuantity, bucketCount, individualizedCount } ]
  },

  getCounts: async (typeId) => {
    const response = await api.get('/asset/assets/counts', { params: { typeId } });
    return response.data; // { typeId, typeLabel, total, rows: [ { uuid, name, assetCode, quantity, ancestors:[{name,typeLabel}] } ] }
  },

  // ---- Responsibility ----
  getResponsibility: async (id) => {
    const response = await api.get(`/asset/assets/${id}/responsibility`);
    return response.data;
  },

  setResponsibility: async (id, data) => {
    const response = await api.put(`/asset/assets/${id}/responsibility`, data);
    return response.data;
  },

  getByResponsible: async (employeeId) => {
    const response = await api.get(`/asset/assets/responsible/${employeeId}`);
    return response.data;
  },

  // ---- Movement history ----
  getMovements: async (id) => {
    const response = await api.get(`/asset/assets/${id}/movements`);
    return response.data;
  },
};
