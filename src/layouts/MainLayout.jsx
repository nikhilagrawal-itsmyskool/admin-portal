import React, { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { isMobilePathAllowed } from '../mobile/mobileFeatures';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import Sidebar, { DRAWER_WIDTH } from '../components/Sidebar';
import Header from '../components/Header';

export default function MainLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  // On phones (< sm) only the mobile-published routes are reachable; anything else
  // bounces to the mobile home. Tablets (sm+) get the full portal.
  const blockedOnMobile = isMobile && !isMobilePathAllowed(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar open={sidebarOpen} onClose={handleSidebarClose} isDesktop={isDesktop} />
      <Header onMenuClick={handleSidebarToggle} isDesktop={isDesktop} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: '#edf1f7',
          overflow: 'auto',
        }}
      >
        <Toolbar />
        {blockedOnMobile ? <Navigate to="/" replace /> : <Outlet />}
      </Box>
    </Box>
  );
}
