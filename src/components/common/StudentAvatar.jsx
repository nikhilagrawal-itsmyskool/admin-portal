import React, { useState, useEffect } from 'react';
import { Avatar } from '@mui/material';
import { studentService } from '../../services/studentService';

// Lazily loads a student's photo (thumb, falling back to original) via the existing
// students photo API and renders it as an Avatar (initials while loading / if none).
// Results are cached per studentId for the session and in-flight requests are deduped,
// so the same student appearing in many rows — or across the list and the thread —
// only fetches once.
const cache = new Map(); // studentId -> Promise<string|null> (data URI or null)

function loadPhoto(studentId) {
  if (cache.has(studentId)) return cache.get(studentId);
  const p = (async () => {
    for (const variant of ['thumb', undefined]) {
      try {
        const res = await studentService.getPhoto('student', studentId, variant);
        if (res?.data) return `data:${res.mimeType || 'image/jpeg'};base64,${res.data}`;
      } catch { /* try the next variant / give up */ }
    }
    return null;
  })();
  cache.set(studentId, p);
  return p;
}

export default function StudentAvatar({ studentId, name, size = 36 }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (studentId) loadPhoto(studentId).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [studentId]);
  return (
    <Avatar src={src || undefined} sx={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
      {(name || '?')[0]?.toUpperCase()}
    </Avatar>
  );
}
