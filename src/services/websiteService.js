import api from '../config/api';

// Website publisher: push curated Moments photos (per-image tags) into the school's Contentful
// CMS as a School Event. The push is async (the server queues it; a worker uploads the assets),
// so the UI polls the publication's pushStatus / pushDetail.
export const websiteService = {
  // { enabled, eventTypes, academicSessions }
  config: async () => (await api.get('/website/config')).data,
  // Live Contentful tags: [{ id, name }]
  tags: async () => (await api.get('/website/tags')).data,

  sourceMoments: async (status) => (await api.get('/website/sources/moments', { params: status ? { status } : {} })).data,
  sourceMoment: async (id) => (await api.get(`/website/sources/moments/${id}`)).data,

  // { sourceMomentId, photos:[{photoId, tags:[]}], fields:{eventTitle,eventDetails,eventDate,eventType:[],academicSession:[]}, entryTags:[], publish }
  pushEvent: async (data) => (await api.post('/website/publications/event', data)).data,

  listPublications: async () => (await api.get('/website/publications')).data,
  getPublication: async (id) => (await api.get(`/website/publications/${id}`)).data,
  publish: async (id) => (await api.post(`/website/publications/${id}/publish`)).data,
};
