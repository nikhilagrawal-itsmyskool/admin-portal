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
  Science as ScienceIcon,
  Gavel as GavelIcon,
  Checkroom as CheckroomIcon,
  MenuBook as MenuBookIcon,
  SportsCricket as SportsIcon,
  Inventory2 as AssetIcon,
  LocalLibrary as LibraryIcon,
  Widgets as SuppliesIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getFirstName } from '../utils/userDisplay';

const modules = [
  {
    title: 'Medical',
    description: 'Manage medical inventory, purchases, and issues',
    icon: MedicalIcon,
    path: '/medical',
    color: '#3366ff',
  },
  {
    title: 'Laboratory',
    description: 'Manage lab inventory, purchases, issues, and breakages',
    icon: ScienceIcon,
    path: '/lab',
    color: '#00b887',
  },
  {
    title: 'Fines',
    description: 'Track incidents, decisions, and fine collections',
    icon: GavelIcon,
    path: '/fine',
    color: '#ff3d71',
  },
  {
    title: 'Uniform',
    description: 'Manage uniform catalog, stock, and student sales',
    icon: CheckroomIcon,
    path: '/uniform',
    color: '#7b5ea7',
  },
  {
    title: 'Shop',
    description: 'Manage shop catalog, stock, and student sales',
    icon: MenuBookIcon,
    path: '/shop',
    color: '#ff9f43',
  },
  {
    title: 'Sports',
    description: 'Manage sports inventory, purchases, issues, and breakages',
    icon: SportsIcon,
    path: '/sports',
    color: '#0095ff',
  },
  {
    title: 'Assets',
    description: 'Manage the asset register, asset tree, and asset types',
    icon: AssetIcon,
    path: '/asset',
    color: '#8d6e63',
  },
  {
    title: 'Library',
    description: 'Manage the catalog, circulation, and library fines',
    icon: LibraryIcon,
    path: '/library',
    color: '#5e35b1',
  },
  {
    title: 'Supplies',
    description: 'Manage supply categories, inventory, purchases, issues, and wastage',
    icon: SuppliesIcon,
    path: '/supplies',
    color: '#00acc1',
  },
  {
    title: 'Employees',
    description: 'Manage employees, logins, and passwords',
    icon: PeopleIcon,
    path: '/employees',
    color: '#009688',
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
