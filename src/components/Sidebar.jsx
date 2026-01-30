import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  LocalHospital as MedicalIcon,
  ExpandLess,
  ExpandMore,
  Inventory as InventoryIcon,
  ShoppingCart as PurchaseIcon,
  Assignment as IssueIcon,
  Assessment as OverviewIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

const menuItems = [
  {
    title: 'Dashboard',
    icon: DashboardIcon,
    path: '/',
  },
  {
    title: 'Medical',
    icon: MedicalIcon,
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/medical' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/medical/items' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/medical/purchases' },
      { title: 'Issue Log', icon: IssueIcon, path: '/medical/issues' },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({ Medical: true });

  const handleToggle = (title) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const sidebarStyles = {
    background: '#222b45',
    text: '#8f9bb3',
    textActive: '#ffffff',
    hover: '#1a2138',
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: sidebarStyles.background,
          borderRight: 'none',
        },
      }}
    >
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography
          variant="h6"
          sx={{ color: '#fff', fontWeight: 700, letterSpacing: 1 }}
        >
          ItsMySkool
        </Typography>
        <Typography variant="caption" sx={{ color: sidebarStyles.text }}>
          Admin Portal
        </Typography>
      </Box>

      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.title}>
            {item.children ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleToggle(item.title)}
                    sx={{
                      px: 3,
                      py: 1.5,
                      '&:hover': { backgroundColor: sidebarStyles.hover },
                    }}
                  >
                    <ListItemIcon sx={{ color: sidebarStyles.text, minWidth: 40 }}>
                      <item.icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      sx={{ '& .MuiTypography-root': { color: sidebarStyles.text } }}
                    />
                    {openMenus[item.title] ? (
                      <ExpandLess sx={{ color: sidebarStyles.text }} />
                    ) : (
                      <ExpandMore sx={{ color: sidebarStyles.text }} />
                    )}
                  </ListItemButton>
                </ListItem>
                <Collapse in={openMenus[item.title]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        onClick={() => navigate(child.path)}
                        sx={{
                          pl: 6,
                          py: 1,
                          backgroundColor: isActive(child.path)
                            ? 'rgba(51, 102, 255, 0.2)'
                            : 'transparent',
                          borderLeft: isActive(child.path)
                            ? '3px solid #3366ff'
                            : '3px solid transparent',
                          '&:hover': { backgroundColor: sidebarStyles.hover },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isActive(child.path)
                              ? sidebarStyles.textActive
                              : sidebarStyles.text,
                            minWidth: 36,
                          }}
                        >
                          <child.icon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={child.title}
                          sx={{
                            '& .MuiTypography-root': {
                              color: isActive(child.path)
                                ? sidebarStyles.textActive
                                : sidebarStyles.text,
                              fontSize: '0.875rem',
                            },
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    px: 3,
                    py: 1.5,
                    backgroundColor: isActive(item.path)
                      ? 'rgba(51, 102, 255, 0.2)'
                      : 'transparent',
                    borderLeft: isActive(item.path)
                      ? '3px solid #3366ff'
                      : '3px solid transparent',
                    '&:hover': { backgroundColor: sidebarStyles.hover },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive(item.path)
                        ? sidebarStyles.textActive
                        : sidebarStyles.text,
                      minWidth: 40,
                    }}
                  >
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    sx={{
                      '& .MuiTypography-root': {
                        color: isActive(item.path)
                          ? sidebarStyles.textActive
                          : sidebarStyles.text,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}
          </React.Fragment>
        ))}
      </List>
    </Drawer>
  );
}

export { DRAWER_WIDTH };
