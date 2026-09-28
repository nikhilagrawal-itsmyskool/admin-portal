import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CardActionArea, Alert, CircularProgress, Grid, Button, Stack,
} from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import { programmesService } from '../../services/programmesService';
import { useCan } from '../../permissions/can';

export default function ProgrammesList() {
  const navigate = useNavigate();
  const can = useCan();
  const canManage = can('godpwa.programme.manage');
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setProgrammes(await programmesService.getCatalog());
      } catch {
        setError('Failed to load programmes.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Programmes</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : programmes.length === 0 ? (
        <Alert severity="info">No programmes set up yet.</Alert>
      ) : (
        <Grid container spacing={2}>
          {programmes.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.uuid}>
              <Card>
                <CardActionArea onClick={() => navigate('/programmes/selc')}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <ForumIcon color="primary" />
                      <Typography variant="h6">{p.name}</Typography>
                    </Stack>
                    {p.motto && (
                      <Typography variant="body2" color="text.secondary">{p.motto}</Typography>
                    )}
                  </CardContent>
                </CardActionArea>
                {canManage && (
                  <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1 }}>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => navigate('/programmes/selc/edit')}>
                      Manage
                    </Button>
                    <Button size="small" startIcon={<SettingsIcon />} onClick={() => navigate('/programmes/selc/settings')}>
                      Settings
                    </Button>
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
