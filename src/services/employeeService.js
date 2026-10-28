import api from '../config/api';

export const employeeService = {
  searchEmployees: async (params = {}) => {
    // params: { name, includeDeleted }
    const response = await api.get('/employees/search', { params });
    return response.data;
  },

  getDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  // Roles available for this school (used by the add/edit role picker)
  listRoles: async () => {
    const response = await api.get('/employees/roles');
    return response.data;
  },

  getEmployee: async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  createEmployee: async (data) => {
    const response = await api.post('/employees/create', data);
    return response.data;
  },

  updateEmployee: async (id, data) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },

  deleteEmployee: async (id) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },

  // Restore a soft-deleted employee (god only — gated in the UI)
  restoreEmployee: async (id) => {
    const response = await api.post(`/employees/${id}/restore`);
    return response.data;
  },

  // Credentials (admin/god only — gated in the UI)
  getCredentials: async (id) => {
    const response = await api.get(`/employees/${id}/credentials`);
    return response.data;
  },

  resetPassword: async (id) => {
    const response = await api.post(`/employees/${id}/reset-password`);
    return response.data;
  },

  // Force an employee to sign out and back in (god only — gated in the UI). Bumps the login's
  // session version so their live tokens are rejected within ~60s and they must log in again.
  forceReLogin: async (id) => {
    const response = await api.post(`/employees/${id}/force-logout`);
    return response.data;
  },

  // Per-school employee config. getConfig readable by employee viewers; updateConfig god-only.
  getConfig: async () => {
    const response = await api.get('/employees/config');
    return response.data; // { config: { restrictRoledEdit } }
  },

  updateConfig: async (payload) => {
    const response = await api.put('/employees/config', payload);
    return response.data;
  },
};
