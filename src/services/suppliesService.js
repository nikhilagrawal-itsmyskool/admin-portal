import api from '../config/api';

export const suppliesService = {
  // Lookups
  getUnits: async () => {
    const response = await api.get('/supplies/lookups/units');
    return response.data;
  },

  getConditions: async () => {
    const response = await api.get('/supplies/lookups/conditions');
    return response.data;
  },

  // Categories (user-defined, per-school; seeded on first list)
  getCategories: async () => {
    const response = await api.get('/supplies/categories');
    return response.data; // { categories: [...] }
  },

  getCategoryById: async (id) => {
    const response = await api.get(`/supplies/categories/${id}`);
    return response.data;
  },

  createCategory: async (data) => {
    const response = await api.post('/supplies/categories', data);
    return response.data;
  },

  updateCategory: async (id, data) => {
    const response = await api.put(`/supplies/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/supplies/categories/${id}`);
    return response.data;
  },

  // Items CRUD (+ merge). create may return { needsConfirmation, conflicts }.
  getItems: async (filters = {}) => {
    const response = await api.get('/supplies/items', { params: filters });
    return response.data;
  },

  getItemById: async (id) => {
    const response = await api.get(`/supplies/items/${id}`);
    return response.data;
  },

  createItem: async (data) => {
    const response = await api.post('/supplies/items', data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await api.put(`/supplies/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/supplies/items/${id}`);
    return response.data;
  },

  mergeItem: async (id, targetItemId) => {
    const response = await api.post(`/supplies/items/${id}/merge`, { targetItemId });
    return response.data;
  },

  // Purchases (bulk-only). createBulk may return { needsConfirmation, conflicts }.
  createBulkPurchase: async (data) => {
    const response = await api.post('/supplies/purchases/bulk', data);
    return response.data;
  },

  getPurchaseBatches: async (filters = {}) => {
    const response = await api.get('/supplies/purchases', { params: filters });
    return response.data;
  },

  getPurchaseBatchById: async (batchId) => {
    const response = await api.get(`/supplies/purchases/${batchId}`);
    return response.data;
  },

  updatePurchaseBatch: async (batchId, data) => {
    const response = await api.put(`/supplies/purchases/${batchId}`, data);
    return response.data;
  },

  deletePurchaseBatch: async (batchId) => {
    const response = await api.delete(`/supplies/purchases/${batchId}`);
    return response.data;
  },

  restorePurchaseBatch: async (batchId) => {
    const response = await api.post(`/supplies/purchases/${batchId}/restore`);
    return response.data;
  },

  uploadBill: async (batchId, data) => {
    const response = await api.post(`/supplies/purchases/${batchId}/bill`, data);
    return response.data;
  },

  getBill: async (batchId) => {
    const response = await api.get(`/supplies/purchases/${batchId}/bill`);
    return response.data;
  },

  deleteBill: async (batchId) => {
    const response = await api.delete(`/supplies/purchases/${batchId}/bill`);
    return response.data;
  },

  // Issues CRUD + Return
  getIssues: async (filters = {}) => {
    const response = await api.get('/supplies/issues', { params: filters });
    return response.data;
  },

  getIssueById: async (id) => {
    const response = await api.get(`/supplies/issues/${id}`);
    return response.data;
  },

  createIssue: async (data) => {
    const response = await api.post('/supplies/issues', data);
    return response.data;
  },

  updateIssue: async (id, data) => {
    const response = await api.put(`/supplies/issues/${id}`, data);
    return response.data;
  },

  deleteIssue: async (id) => {
    const response = await api.delete(`/supplies/issues/${id}`);
    return response.data;
  },

  returnIssue: async (id, data) => {
    const response = await api.put(`/supplies/issues/${id}/return`, data);
    return response.data;
  },

  // Wastages CRUD (+ image)
  getWastages: async (filters = {}) => {
    const response = await api.get('/supplies/wastages', { params: filters });
    return response.data;
  },

  getWastageById: async (id) => {
    const response = await api.get(`/supplies/wastages/${id}`);
    return response.data;
  },

  createWastage: async (data) => {
    const response = await api.post('/supplies/wastages', data);
    return response.data;
  },

  updateWastage: async (id, data) => {
    const response = await api.put(`/supplies/wastages/${id}`, data);
    return response.data;
  },

  deleteWastage: async (id) => {
    const response = await api.delete(`/supplies/wastages/${id}`);
    return response.data;
  },

  getWastageImage: async (id) => {
    const response = await api.get(`/supplies/wastages/${id}/image`);
    return response.data;
  },

  deleteWastageImage: async (id) => {
    const response = await api.delete(`/supplies/wastages/${id}/image`);
    return response.data;
  },
};
