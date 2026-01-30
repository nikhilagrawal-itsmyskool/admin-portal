import api from '../config/api';

export const classService = {
  getClasses: async (params = {}) => {
    // params: { academic_year_id }
    const response = await api.get('/classes/search', { params });
    return response.data;
  },

  getClassById: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  getSections: async (classId) => {
    const response = await api.get(`/classes/${classId}/sections`);
    return response.data;
  },
};
