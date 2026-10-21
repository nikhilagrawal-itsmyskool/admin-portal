import React, { useEffect, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

// A single selected (not-yet-uploaded) photo thumbnail from a File, with a remove button.
// Manages its own object URL so it's revoked on unmount (no memory leak).
function Thumb({ file, onRemove }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <Box sx={{ position: 'relative', width: 76, height: 76, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover', flex: '0 0 auto' }}>
      {url && <Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <IconButton
        size="small"
        onClick={onRemove}
        aria-label="remove photo"
        sx={{ position: 'absolute', top: 2, right: 2, p: 0.2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}
      >
        <CloseIcon sx={{ fontSize: 15 }} />
      </IconButton>
    </Box>
  );
}

// Grid of selected-photo thumbnails. files: File[]; onRemove(index).
export default function SelectedThumbs({ files, onRemove }) {
  if (!files?.length) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {files.map((f, i) => <Thumb key={`${f.name}-${i}`} file={f} onRemove={() => onRemove(i)} />)}
    </Box>
  );
}
