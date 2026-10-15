import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  FormControl,
  Select,
  Tooltip,
} from '@mui/material';
import {
  AccountCircle,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Menu as MenuIcon,
  Search as SearchIcon,
  ArrowBack as BackIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useAdminReveal } from '../context/AdminRevealContext';
import { useCan } from '../permissions/can';
import { useIsMobile } from '../hooks/useIsMobile';
import NotificationBell from './NotificationBell';
import { DRAWER_WIDTH, hasAdminScreens } from './Sidebar';
// Fixed AppBar must track the live drawer width so it reflows when the sidebar collapses.
import { getShortDisplayName, getFirstNameInitial } from '../utils/userDisplay';

export default function Header({ onMenuClick, isDesktop, drawerWidth = DRAWER_WIDTH }) {
  const { user, logout, schoolCode } = useAuth();
  const { years, academicYearId, setAcademicYearId } = useAcademicYear();
  const { reveal, toggle } = useAdminReveal();
  const can = useCan();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  // The reveal toggle only appears to users who have an admin screen to reveal
  // (god for Permissions, or a *.config.manage holder for Config) and never on
  // phones — Permissions/Config are desktop/tablet-only.
  const showAdminToggle = !isMobile && hasAdminScreens(can);

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
        width: isDesktop ? `calc(100% - ${drawerWidth}px)` : '100%',
        ml: isDesktop ? `${drawerWidth}px` : 0,
        backgroundColor: '#fff',
        borderBottom: '1px solid #e4e9f2',
        transition: 'width 180ms ease, margin 180ms ease',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isDesktop && (location.pathname !== '/' ? (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => navigate(-1)}
              aria-label="Back"
              sx={{ color: '#222b45' }}
            >
              <BackIcon />
            </IconButton>
          ) : (
            <IconButton
              color="inherit"
              edge="start"
              onClick={onMenuClick}
              aria-label="Menu"
              sx={{ color: '#222b45' }}
            >
              <MenuIcon />
            </IconButton>
          ))}
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

          {isDesktop && years.length > 0 && (
            <FormControl size="small" sx={{ ml: 1.5, minWidth: 128 }}>
              <Select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                displayEmpty
                title="Academic year — scopes the data shown across the portal"
                sx={{
                  height: 34, fontSize: 13, color: '#222b45', backgroundColor: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e4e9f2' },
                }}
              >
                {years.map((y) => (
                  <MenuItem key={y.uuid} value={y.uuid} sx={{ fontSize: 13 }}>
                    {y.name}{y.isCurrent ? ' • current' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {showAdminToggle && (
            <Tooltip title={reveal ? 'Hide admin screens (Permissions & Config)' : 'Show admin screens (Permissions & Config)'}>
              <IconButton
                onClick={toggle}
                size="small"
                aria-label="Toggle admin screens"
                aria-pressed={reveal}
                sx={{ color: reveal ? '#3366ff' : '#8f9bb3' }}
              >
                <AdminPanelSettingsIcon />
              </IconButton>
            </Tooltip>
          )}
          <NotificationBell />
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
