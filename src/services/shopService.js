import api from '../config/api';

const shopService = {
  // Lookups & Stats
  getLookups: async () => {
    const response = await api.get('/shop/lookups');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/shop/stats');
    return response.data;
  },

  // Items
  getItems: async (filters = {}) => {
    const response = await api.get('/shop/items', { params: filters });
    return response.data;
  },

  createItem: async (data) => {
    const response = await api.post('/shop/items', data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await api.put(`/shop/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await api.delete(`/shop/items/${id}`);
    return response.data;
  },

  // Purchases
  getPurchases: async (filters = {}) => {
    const response = await api.get('/shop/purchases', { params: filters });
    return response.data;
  },

  getPurchaseById: async (id) => {
    const response = await api.get(`/shop/purchases/${id}`);
    return response.data;
  },

  createPurchase: async (data) => {
    const response = await api.post('/shop/purchases', data);
    return response.data;
  },

  deletePurchase: async (id) => {
    const response = await api.delete(`/shop/purchases/${id}`);
    return response.data;
  },

  uploadPurchaseBill: async (id, billData) => {
    const response = await api.put(`/shop/purchases/${id}/bill`, billData);
    return response.data;
  },

  getPurchaseBill: async (id) => {
    const response = await api.get(`/shop/purchases/${id}/bill`);
    return response.data;
  },

  deletePurchaseBill: async (id) => {
    const response = await api.delete(`/shop/purchases/${id}/bill`);
    return response.data;
  },

  // Sets
  getSets: async (filters = {}) => {
    const response = await api.get('/shop/sets', { params: filters });
    return response.data;
  },

  getSetById: async (id) => {
    const response = await api.get(`/shop/sets/${id}`);
    return response.data;
  },

  createSet: async (data) => {
    const response = await api.post('/shop/sets', data);
    return response.data;
  },

  updateSet: async (id, data) => {
    const response = await api.put(`/shop/sets/${id}`, data);
    return response.data;
  },

  deleteSet: async (id) => {
    const response = await api.delete(`/shop/sets/${id}`);
    return response.data;
  },

  // Sales
  getSales: async (filters = {}) => {
    const response = await api.get('/shop/sales', { params: filters });
    return response.data;
  },

  getSaleById: async (id) => {
    const response = await api.get(`/shop/sales/${id}`);
    return response.data;
  },

  createSale: async (data) => {
    const response = await api.post('/shop/sales', data);
    return response.data;
  },
};

export default shopService;
