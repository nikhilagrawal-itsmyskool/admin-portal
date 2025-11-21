// src/components/Layout/MainLayout.jsx
import React from 'react';
import { Box, CssBaseline } from '@mui/material';
import Sidebar from './sidebar';
import Header from './header';

const drawerWidth = 240;

const MainLayout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* ➡️ Header (Top Bar) */}
      <Header drawerWidth={drawerWidth} />
      
      {/* ⬅️ Sidebar (Left Navigation) */}
      <Sidebar drawerWidth={drawerWidth} />
      
      {/* 🖼️ Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8, // Adjust for fixed header
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;