import api from '../config/api';

export const employeeService = {
  searchEmployees: async (params = {}) => {
    // params: { name, department_id }
    const response = await api.get('/employees/search', { params });
    return response.data;
  },

  getDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },
};
