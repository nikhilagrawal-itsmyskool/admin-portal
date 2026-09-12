import React, { useState, useEffect } from 'react';
import { Avatar } from '@mui/material';
import { studentService } from '../../services/studentService';

// Session cache: studentId -> Promise<dataUri|null>. Dedupes in-flight requests and
// avoids refetching a student's photo across rows / list <-> thread navigation.
const cache = new Map();

function loadPhoto(studentId) {
  if (cache.has(studentId)) return cache.get(studentId);
  const p = (async () => {
    for (const variant of ['thumb', undefined]) { // prefer the small thumb, fall back to original
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

// Student photo with an initials fallback. Lazily fetches the thumbnail from the existing
// student photo API (no new backend surface).
export default function StudentAvatar({ studentId, name, size = 36 }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (studentId) loadPhoto(studentId).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [studentId]);
  return (
    <Avatar src={src || undefined} sx={{ width: size, height: size, fontSize: size * 0.42, bgcolor: '#e0e0e0', color: '#555' }}>
      {(name || '?').trim()[0]?.toUpperCase()}
    </Avatar>
  );
}
