import api from '../config/api';

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/employee/login', {
      username,
      password,
    });
    return response.data;
  },
};
