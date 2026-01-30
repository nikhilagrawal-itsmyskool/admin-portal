import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {
  LocalHospital as MedicalIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const getFirstName = (displayName) => {
  if (!displayName) return null;
  return displayName.split(' ')[0];
};

const modules = [
  {
    title: 'Medical',
    description: 'Manage medical inventory, purchases, and issues',
    icon: MedicalIcon,
    path: '/medical',
    color: '#3366ff',
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = getFirstName(user?.displayName) || user?.loginName;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Welcome back, {firstName}
      </Typography>
      <Typography variant="body1" sx={{ color: '#8f9bb3', mb: 4 }}>
        Select a module to get started
      </Typography>

      <Grid container spacing={3}>
        {modules.map((module) => (
          <Grid item xs={12} sm={6} md={4} key={module.title}>
            <Card>
              <CardActionArea onClick={() => navigate(module.path)}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      backgroundColor: `${module.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <module.icon sx={{ fontSize: 28, color: module.color }} />
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {module.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#8f9bb3' }}>
                    {module.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
