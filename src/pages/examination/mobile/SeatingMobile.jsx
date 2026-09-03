import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useCan } from '../../../permissions/can';
import { examinationService } from '../../../services/examinationService';
import SeatingTab from '../SeatingTab';

// Phone seating screen: the desktop SeatingTab is already card-based (rooms as cards), so
// it reuses cleanly on mobile. This wrapper just loads the exam for the header + props.
export default function SeatingMobile() {
  const { id } = useParams();
  const canManage = useCan()('exam.manage');
  const [exam, setExam] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    examinationService.get(id).then(setExam).catch((e) => setErr(e.response?.data?.error?.description || 'Failed to load'));
  }, [id]);

  if (err) return <Alert severity="error">{err}</Alert>;
  if (!exam) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1.5 }}>Seating · {exam.name}</Typography>
      <SeatingTab examId={id} exam={exam} canManage={canManage} />
    </Box>
  );
}
