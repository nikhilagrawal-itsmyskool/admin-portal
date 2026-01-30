import api from '../config/api';

export const studentService = {
  searchStudents: async (params = {}) => {
    // params: { name, classId }
    const response = await api.get('/students/search', { params });
    return response.data;
  },

  getStudentById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },
};
