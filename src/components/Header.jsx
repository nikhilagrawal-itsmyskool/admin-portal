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
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { DRAWER_WIDTH } from './Sidebar';
import { getShortDisplayName, getFirstNameInitial } from '../utils/userDisplay';
import InstallButton from './InstallButton';

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

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
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
          <Box
            onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              cursor: 'pointer',
              color: '#8f9bb3',
              border: isDesktop ? '1px solid #e4e9f2' : 'none',
              borderRadius: 2,
              px: isDesktop ? 1.5 : 0.5,
              py: 0.5,
              ml: 1,
            }}
          >
            <SearchIcon fontSize="small" />
            {isDesktop && <Typography variant="body2">Search students…</Typography>}
            {isDesktop && (
              <Box component="span" sx={{ ml: 0.5, px: 0.75, border: '1px solid #e4e9f2', borderRadius: 1, fontSize: 11, lineHeight: '18px' }}>
                Ctrl K
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isDesktop && <InstallButton />}
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
            {user?.displayName || user?.loginName}
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleProfile}>
            <PersonIcon sx={{ mr: 1 }} fontSize="small" />
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
