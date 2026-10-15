import React, { useState, useRef } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { isMobilePathAllowed } from '../mobile/mobileFeatures';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import Sidebar, { DRAWER_WIDTH, COLLAPSED_WIDTH } from '../components/Sidebar';
import Header from '../components/Header';
import CommandPalette from '../components/common/CommandPalette';
import { AcademicYearProvider } from '../context/AcademicYearContext';
import { AdminRevealProvider } from '../context/AdminRevealContext';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

export default function MainLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  // On phones (< sm) only the mobile-published routes are reachable; anything else
  // bounces to the mobile home. Tablets (sm+) get the full portal.
  const blockedOnMobile = isMobile && !isMobilePathAllowed(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop icon-rail collapse — remembered across sessions.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');
  const handleCollapseToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
      return next;
    });
  };
  // Effective drawer width the fixed Header must offset by (collapse only applies on desktop).
  const effectiveDrawerWidth = isDesktop && collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;
  // Restore each screen's scroll position when returning to it (list -> detail -> back).
  const mainRef = useRef(null);
  useScrollRestoration(mainRef);

  const handleSidebarToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <AcademicYearProvider>
      <AdminRevealProvider>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar
          open={sidebarOpen}
          onClose={handleSidebarClose}
          isDesktop={isDesktop}
          collapsed={collapsed}
          onToggleCollapsed={handleCollapseToggle}
        />
        <Header onMenuClick={handleSidebarToggle} isDesktop={isDesktop} drawerWidth={effectiveDrawerWidth} />
        <CommandPalette />
        <Box
          component="main"
          ref={mainRef}
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
      </AdminRevealProvider>
    </AcademicYearProvider>
  );
}
