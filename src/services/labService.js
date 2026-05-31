import api from '../config/api';

export const labService = {
  // Lookups
  getUnits: async () => {
    const response = await api.get('/lab/lookups/units');
    return response.data;
  },

  getLabTypes: async () => {
    const response = await api.get('/lab/lookups/lab-types');
    return response.data;
  },

  getCategories: async (labType) => {
    const params = labType ? { labType } : {};
    const response = await api.get('/lab/lookups/categories', { params });
    return response.data;
  },

  getConditions: async () => {
    const response = await api.get('/lab/lookups/conditions');
    return response.data;
  },

  // Labs CRUD
  getLabs: async () => {
    const response = await api.get('/lab/labs');
    return response.data;
  },

  getLabById: async (id) => {
    const response = await api.get(`/lab/labs/${id}`);
    return response.data;
  },

  createLab: async (data) => {
    const response = await api.post('/lab/labs', data);
    return response.data;
  },

  updateLab: async (id, data) => {
    const response = await api.put(`/lab/labs/${id}`, data);
    return response.data;
  },

  deleteLab: async (id) => {
    const response = await api.delete(`/lab/labs/${id}`);
    return response.data;
  },

  // Items CRUD
  getItems: async (filters = {}) => {
    const response = await api.get('/lab/items', { params: filters });
    return response.data;
  },

  getItemById: async (id) => {
    const response = await api.get(`/lab/items/${id}`);
    return response.data;
  },

  createItem: async (data) => {
    const response = await api.post('/lab/items', data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await api.put(`/lab/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/lab/items/${id}`);
    return response.data;
  },

  // Purchase Batches
  createBulkPurchase: async (data) => {
    const response = await api.post('/lab/purchases/bulk', data);
    return response.data;
  },

  getPurchaseBatches: async (filters = {}) => {
    const response = await api.get('/lab/purchases/batches', { params: filters });
    return response.data;
  },

  getPurchaseBatchById: async (batchId) => {
    const response = await api.get(`/lab/purchases/batches/${batchId}`);
    return response.data;
  },

  updatePurchaseBatch: async (batchId, data) => {
    const response = await api.put(`/lab/purchases/batches/${batchId}`, data);
    return response.data;
  },

  deletePurchaseBatch: async (batchId) => {
    const response = await api.delete(`/lab/purchases/batches/${batchId}`);
    return response.data;
  },

  uploadLabBill: async (batchId, data) => {
    const response = await api.post(`/lab/purchases/batches/${batchId}/bill`, data);
    return response.data;
  },

  getLabBill: async (batchId) => {
    const response = await api.get(`/lab/purchases/batches/${batchId}/bill`);
    return response.data;
  },

  deleteLabBill: async (batchId) => {
    const response = await api.delete(`/lab/purchases/batches/${batchId}/bill`);
    return response.data;
  },

  getAlerts: async (days = 60) => {
    const response = await api.get('/lab/alerts', { params: { days } });
    return response.data;
  },

  // Purchases CRUD
  getPurchases: async (filters = {}) => {
    const response = await api.get('/lab/purchases', { params: filters });
    return response.data;
  },

  getPurchaseById: async (id) => {
    const response = await api.get(`/lab/purchases/${id}`);
    return response.data;
  },

  createPurchase: async (data) => {
    const response = await api.post('/lab/purchases', data);
    return response.data;
  },

  updatePurchase: async (id, data) => {
    const response = await api.put(`/lab/purchases/${id}`, data);
    return response.data;
  },

  deletePurchase: async (id) => {
    const response = await api.delete(`/lab/purchases/${id}`);
    return response.data;
  },

  // Issues CRUD + Return
  getIssues: async (filters = {}) => {
    const response = await api.get('/lab/issues', { params: filters });
    return response.data;
  },

  getIssueById: async (id) => {
    const response = await api.get(`/lab/issues/${id}`);
    return response.data;
  },

  createIssue: async (data) => {
    const response = await api.post('/lab/issues', data);
    return response.data;
  },

  updateIssue: async (id, data) => {
    const response = await api.put(`/lab/issues/${id}`, data);
    return response.data;
  },

  deleteIssue: async (id) => {
    const response = await api.delete(`/lab/issues/${id}`);
    return response.data;
  },

  returnIssue: async (id, data) => {
    const response = await api.put(`/lab/issues/${id}/return`, data);
    return response.data;
  },

  // Breakages CRUD
  getBreakages: async (filters = {}) => {
    const response = await api.get('/lab/breakages', { params: filters });
    return response.data;
  },

  getBreakageById: async (id) => {
    const response = await api.get(`/lab/breakages/${id}`);
    return response.data;
  },

  createBreakage: async (data) => {
    const response = await api.post('/lab/breakages', data);
    return response.data;
  },

  updateBreakage: async (id, data) => {
    const response = await api.put(`/lab/breakages/${id}`, data);
    return response.data;
  },

  deleteBreakage: async (id) => {
    const response = await api.delete(`/lab/breakages/${id}`);
    return response.data;
  },

  getBreakageImage: async (id) => {
    const response = await api.get(`/lab/breakages/${id}/image`);
    return response.data;
  },

  deleteBreakageImage: async (id) => {
    const response = await api.delete(`/lab/breakages/${id}/image`);
    return response.data;
  },
};
