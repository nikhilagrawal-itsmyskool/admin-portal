import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Box, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { outreachService } from '../../services/outreachService';

// Full-size image: presigned URL (prod) or a base64 fallback (local).
function FullImage({ momentId, photo }) {
  const [src, setSrc] = useState(photo.imageUrl || null);
  useEffect(() => {
    let alive = true;
    if (photo.imageUrl) { setSrc(photo.imageUrl); return undefined; }
    outreachService.getPhotoImage(momentId, photo.uuid).then((r) => { if (alive) setSrc(r.dataUri); }).catch(() => {});
    return () => { alive = false; };
  }, [momentId, photo.uuid, photo.imageUrl]);
  return src
    ? <Box component="img" src={src} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
    : <Typography sx={{ color: '#fff' }} variant="caption">Loading…</Typography>;
}

// Full-screen swipeable photo carousel. index = current photo index (null = closed).
export default function PhotoLightbox({ momentId, photos, index, onClose, onIndex }) {
  const touchX = useRef(null);
  if (index === null || index === undefined || index < 0 || !photos?.length) return null;
  const count = photos.length;
  const go = (d) => onIndex(((index + d) % count + count) % count);
  const photo = photos[index];
  return (
    <Dialog open fullScreen onClose={onClose} PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.96)' } }}>
      <Box sx={{ position: 'absolute', top: 10, left: 16, color: '#fff', zIndex: 2 }}>
        <Typography variant="caption">{index + 1} / {count}</Typography>
      </Box>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: 6, right: 6, color: '#fff', zIndex: 2 }}><CloseIcon /></IconButton>
      <Box
        sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1 }}
        onTouchStart={(e) => { touchX.current = e.changedTouches[0].clientX; }}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touchX.current || 0); if (count > 1 && Math.abs(dx) > 40) go(dx > 0 ? -1 : 1); }}
      >
        {count > 1 && <IconButton onClick={() => go(-1)} sx={{ position: 'absolute', left: 2, color: '#fff' }}><ChevronLeft sx={{ fontSize: 40 }} /></IconButton>}
        <FullImage momentId={momentId} photo={photo} />
        {count > 1 && <IconButton onClick={() => go(1)} sx={{ position: 'absolute', right: 2, color: '#fff' }}><ChevronRight sx={{ fontSize: 40 }} /></IconButton>}
      </Box>
      {photo.caption && (
        <Box sx={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center', px: 2 }}>
          <Typography variant="caption" sx={{ color: '#fff' }}>{photo.caption}</Typography>
        </Box>
      )}
    </Dialog>
  );
}
