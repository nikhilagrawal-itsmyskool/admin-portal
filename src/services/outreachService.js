import api from '../config/api';

// Outreach "Moments": staff compose a photo+text post for an audience (whole school /
// grade / class), attach photos, then Publish (parents get an in-app notification and see
// it in the app feed). Unpublish hides it again. Mirrors the homework/feedback service style.
export const outreachService = {
  // Admin list of moments. Optional { status: 'draft'|'published', classId }.
  list: async (params = {}) => {
    const response = await api.get('/outreach/moments', { params });
    return response.data;
  },

  // Full moment (photos + audience + reaction summary).
  getById: async (id) => {
    const response = await api.get(`/outreach/moments/${id}`);
    return response.data;
  },

  // Who reacted (names) — admin only: { reactors: [{ emoji, reactorType, name, familyNumber, at }] }.
  getReactions: async (id) => {
    const response = await api.get(`/outreach/moments/${id}/reactions`);
    return response.data;
  },

  // Grades + base classes for the audience picker: { grades:[{grade}], classes:[{classId,name,grade}] }.
  audienceOptions: async () => {
    const response = await api.get('/outreach/audience-options');
    return response.data;
  },

  // Create a draft. { title?, body?, audience: [{ scope:'school'|'grade'|'class', refId? }] }.
  create: async (data) => {
    const response = await api.post('/outreach/moments', data);
    return response.data;
  },

  // Edit a draft's text/audience. { title?, body?, audience? }.
  update: async (id, data) => {
    const response = await api.put(`/outreach/moments/${id}`, data);
    return response.data;
  },

  // Add a photo to a draft: { caption?, image: { fileName, mimeType, base64Data } }.
  addPhoto: async (id, data) => {
    const response = await api.post(`/outreach/moments/${id}/photos`, data);
    return response.data;
  },

  removePhoto: async (id, photoId) => {
    const response = await api.delete(`/outreach/moments/${id}/photos/${photoId}`);
    return response.data;
  },

  // Raw base64 for a photo (fallback / local dev): { dataUri, mimeType, fileName }.
  getPhotoImage: async (id, photoId) => {
    const response = await api.get(`/outreach/moments/${id}/photos/${photoId}/image`);
    return response.data;
  },

  // Publish → fans an in-app notification to the audience families. Requires ≥1 photo.
  publish: async (id) => {
    const response = await api.post(`/outreach/moments/${id}/publish`);
    return response.data;
  },

  unpublish: async (id) => {
    const response = await api.post(`/outreach/moments/${id}/unpublish`);
    return response.data;
  },

  getAudit: async (id) => {
    const response = await api.get(`/outreach/moments/${id}/audit`);
    return response.data;
  },

  // Videos = YouTube links (several per moment). { url, caption? }.
  addVideo: async (id, data) => (await api.post(`/outreach/moments/${id}/videos`, data)).data,
  removeVideo: async (id, videoId) => (await api.delete(`/outreach/moments/${id}/videos/${videoId}`)).data,

  // Uploaded videos (direct-to-R2). Step 1: get a presigned PUT URL. Step 2: record the clip.
  videoUploadUrl: async (id, data) => (await api.post(`/outreach/moments/${id}/videos/upload-url`, data)).data,
  addR2Video: async (id, data) => (await api.post(`/outreach/moments/${id}/videos/r2`, data)).data,

  // Scheduled publish — publishAt is an ISO datetime (UTC). unschedule clears it (back to draft).
  schedule: async (id, publishAt) => (await api.post(`/outreach/moments/${id}/schedule`, { publishAt })).data,
  unschedule: async (id) => (await api.post(`/outreach/moments/${id}/unschedule`)).data,

  // ── Teacher PWA (own-class) — the /me surface used on phones ──────────────────
  me: {
    // Classes this teacher is the class teacher of (can post for).
    classes: async (academicYearId) =>
      (await api.get('/outreach/me/classes', { params: { academicYearId } })).data,
    // Moments this teacher authored.
    posted: async () => (await api.get('/outreach/me/posted')).data,
    // Create a draft for the teacher's own class. { classId, title?, body? } (audience forced to the class).
    create: async (data) => (await api.post('/outreach/me/moments', data)).data,
    addPhoto: async (id, data) => (await api.post(`/outreach/me/moments/${id}/photos`, data)).data,
    removePhoto: async (id, photoId) => (await api.delete(`/outreach/me/moments/${id}/photos/${photoId}`)).data,
    publish: async (id) => (await api.post(`/outreach/me/moments/${id}/publish`)).data,
    unpublish: async (id) => (await api.post(`/outreach/me/moments/${id}/unpublish`)).data,
  },
};

// Reaction token → emoji, for displaying the parent reaction tally.
export const REACTION_EMOJI = { love: '❤️', like: '👍', clap: '👏', smile: '😊', celebrate: '🎉' };

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
// Sanity cap on the ORIGINAL file before downscaling (reject absurd files, e.g. a RAW).
export const PHOTO_MAX_BYTES = 40 * 1024 * 1024;
// Delivery size: resize to this long-edge + JPEG quality in the browser before upload. Not
// editing (no crop/filter) — just sizing for the feed, like WhatsApp's HD. Keeps 50-photo
// posts fast and light on R2 + parents' data, and comfortably under the backend's 5 MB cap.
const DOWNSCALE_MAX_EDGE = 1920;
const DOWNSCALE_QUALITY = 0.85;

// Decode a file ONCE and render it to one or more target sizes. Re-decoding a 12MP photo
// per size is what exhausts a phone's canvas memory on a big batch (16+ photos) and makes
// the whole upload throw — so every variant comes from a single decode here. Each canvas is
// zeroed right after export to prompt the browser to release its backing store (iOS Safari).
function renderSizes(file, sizes) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const fileName = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
      try {
        const out = sizes.map(({ maxEdge, quality }) => {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const base64Data = canvas.toDataURL('image/jpeg', quality).split(',')[1];
          canvas.width = 0; canvas.height = 0; // free the backing store promptly
          return { fileName, mimeType: 'image/jpeg', base64Data };
        });
        resolve(out);
      } catch (e) {
        reject(new Error(`Could not process "${file.name}" — try fewer photos at once.`));
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read "${file.name}"`)); };
    img.src = url;
  });
}

// Resize one image file in-browser and return the { fileName, mimeType, base64Data } payload.
export async function downscaleImage(file, maxEdge = DOWNSCALE_MAX_EDGE, quality = DOWNSCALE_QUALITY) {
  const [image] = await renderSizes(file, [{ maxEdge, quality }]);
  return image;
}

// Turn selected File[] into downscaled image payloads. onProgress(done, total) optional.
export async function filesToImages(files, onProgress) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    out.push(await downscaleImage(files[i]));
    if (onProgress) onProgress(i + 1, files.length);
  }
  return out;
}

// A display image (~1920px) + a tiny cover thumb (~320px) per file — both from ONE decode.
// If the thumb step somehow fails, the display image still goes up (never block a photo on it).
export async function fileToUpload(file) {
  const [image, thumb] = await renderSizes(file, [
    { maxEdge: DOWNSCALE_MAX_EDGE, quality: DOWNSCALE_QUALITY },
    { maxEdge: 320, quality: 0.7 },
  ]);
  return { image, thumb };
}

// ── Uploaded video (direct-to-R2) ──────────────────────────────────────────────────
// Short clips upload straight from the phone to R2; longer recordings stay on YouTube.
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm';
export const VIDEO_ALLOWED_MIME = ['video/mp4', 'video/quicktime', 'video/webm'];
export const VIDEO_MAX_BYTES = 250 * 1024 * 1024; // 250 MB (matches the backend backstop)
export const VIDEO_MAX_SECONDS = 300;             // 5 minutes

// Read a video file's duration in the browser (so we can reject >5 min before uploading).
function readVideoDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(v.duration) ? v.duration : null); };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    v.src = url;
  });
}

// Validate a picked video before upload. Returns { ok, error?, mimeType, sizeBytes, durationSeconds }.
export async function validateVideo(file) {
  const mimeType = (file.type || '').toLowerCase();
  if (!VIDEO_ALLOWED_MIME.includes(mimeType)) {
    return { ok: false, error: `"${file.name}" isn't a supported video (use MP4, MOV or WebM).` };
  }
  if (file.size > VIDEO_MAX_BYTES) {
    return { ok: false, error: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(0)} MB — the limit is ${VIDEO_MAX_BYTES / (1024 * 1024)} MB. Put it on YouTube and paste the link instead.` };
  }
  const durationSeconds = await readVideoDuration(file);
  if (durationSeconds && durationSeconds > VIDEO_MAX_SECONDS) {
    const mins = Math.floor(durationSeconds / 60);
    const secs = Math.round(durationSeconds % 60);
    return { ok: false, error: `"${file.name}" is ${mins}m ${secs}s — the limit is ${VIDEO_MAX_SECONDS / 60} minutes. Put it on YouTube and paste the link instead.` };
  }
  return { ok: true, mimeType, sizeBytes: file.size, durationSeconds: durationSeconds ? Math.round(durationSeconds) : null };
}

// Full two-step upload of one video onto a (draft) moment. onProgress(pct 0..100) optional.
// 1) ask the API for a presigned R2 PUT URL, 2) PUT the bytes straight to R2 (with progress),
// 3) tell the API to record the clip. Returns the updated moment.
export async function uploadVideo(momentId, file, caption, onProgress) {
  const meta = await validateVideo(file);
  if (!meta.ok) throw new Error(meta.error);
  const { uploadUrl, storageKey } = await outreachService.videoUploadUrl(momentId, {
    fileName: file.name || 'video.mp4', mimeType: meta.mimeType, sizeBytes: meta.sizeBytes, durationSeconds: meta.durationSeconds,
  });
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', meta.mimeType); // MUST match what the backend signed
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed — check your connection and try again.'));
    xhr.send(file);
  });
  return outreachService.addR2Video(momentId, {
    storageKey, mimeType: meta.mimeType, sizeBytes: meta.sizeBytes, durationSeconds: meta.durationSeconds,
    caption: (caption || '').trim() || undefined,
  });
}
