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
};
