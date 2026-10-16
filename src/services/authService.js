import api from '../config/api';

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/employee/login', {
      username,
      password,
    });
    return response.data;
  },

  // Change the logged-in user's password. Routes to the employee or student
  // endpoint based on account type. The Bearer token is attached automatically.
  changePassword: async (type, currentPassword, newPassword) => {
    const path =
      type === 'student'
        ? '/auth/student/change-password'
        : '/auth/employee/change-password';
    const response = await api.post(path, { currentPassword, newPassword });
    return response.data;
  },

  // Permissions grid (god-only). list → catalog (rows/cols) + override rows; toggle → flip one cell
  // to 'grant' | 'revoke' | 'default' and returns the refreshed payload.
  getPermissions: async (module) => {
    const response = await api.get('/auth/permissions', module ? { params: { module } } : undefined);
    return response.data;
  },
  togglePermission: async (role, action, desired, reason) => {
    const response = await api.post('/auth/permissions/toggle', { role, action, desired, reason });
    return response.data;
  },
  // Temporary per-employee grants (god-only). List is narrowed to one module's actions.
  listGrants: async (module) => {
    const response = await api.get('/auth/permissions/grants', module ? { params: { module } } : undefined);
    return response.data;
  },
  createGrants: async (employeeId, actions, durationHours, reason) => {
    const response = await api.post('/auth/permissions/grants', { employeeId, actions, durationHours, reason });
    return response.data;
  },
  revokeGrant: async (id) => {
    const response = await api.delete(`/auth/permissions/grants/${id}`);
    return response.data;
  },
};
