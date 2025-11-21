// src/components/Layout/Sidebar.jsx
import React from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { Link } from 'react-router-dom';

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Medicine Stock', icon: <InventoryIcon />, path: '/stock' },
  { text: 'Issue Log', icon: <PostAddIcon />, path: '/issues' },
  { text: 'Purchase Log', icon: <ReceiptLongIcon />, path: '/purchases' },
];

const Sidebar = ({ drawerWidth }) => {
  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
      }}
      variant="permanent"
      anchor="left"
    >
      <Toolbar>
        {/* Your Logo/App Name here */}
        <ListItemText primary="Admin Dashboard" sx={{ fontWeight: 'bold' }} />
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton component={Link} to={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;