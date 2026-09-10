import api from '../config/api';

// In-app notification inbox for the logged-in employee (free/instant; separate from
// the SMS/WhatsApp queue). Mirrors the core-api communication `notification` surface.
export const notificationService = {
  // { items: [{ uuid, key, title, body, entityType, entityId, readAt, createdAt }], unreadCount }
  list: async (params = {}) => (await api.get('/communication/me/notifications', { params })).data,
  markRead: async (id) => (await api.post(`/communication/me/notifications/${id}/read`)).data,
  markAllRead: async () => (await api.post('/communication/me/notifications/read-all')).data,
};
