import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Divider,
} from '@mui/material';
import {
  AccountCircle,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { DRAWER_WIDTH } from './Sidebar';
import { getShortDisplayName, getFirstNameInitial } from '../utils/userDisplay';

export default function Header({ onMenuClick, isDesktop }) {
  const { user, logout, schoolCode } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const shortDisplayName = getShortDisplayName(user?.displayName) || user?.loginName;
  const avatarInitial = getFirstNameInitial(user?.displayName) || user?.loginName?.charAt(0).toUpperCase();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: isDesktop ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
        ml: isDesktop ? `${DRAWER_WIDTH}px` : 0,
        backgroundColor: '#fff',
        borderBottom: '1px solid #e4e9f2',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isDesktop && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={onMenuClick}
              sx={{ color: '#222b45' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="body2" sx={{ color: '#8f9bb3', textTransform: 'uppercase', letterSpacing: 1 }}>
            {schoolCode}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#222b45' }}>
            {shortDisplayName}
          </Typography>
          <IconButton onClick={handleMenuOpen} size="small">
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#3366ff' }}>
              {avatarInitial || 'U'}
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: { width: 200, mt: 1 },
          }}
        >
          <MenuItem disabled>
            <PersonIcon sx={{ mr: 1 }} fontSize="small" />
            {user?.displayName || user?.loginName}
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
