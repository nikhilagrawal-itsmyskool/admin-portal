import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCan } from '../permissions/can';
import { MOBILE_FEATURES } from '../mobile/mobileFeatures';
import { useIsMobile } from '../hooks/useIsMobile';
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
  Science as ScienceIcon,
  BrokenImage as BrokenImageIcon,
  Gavel as GavelIcon,
  Checkroom as CheckroomIcon,
  Style as SetsIcon,
  MenuBook as MenuBookIcon,
  SportsCricket as SportsIcon,
  AccountTree as AssetTreeIcon,
  Category as TypeIcon,
  Inventory2 as AssetIcon,
  Tag as CountsIcon,
  People as PeopleIcon,
  LocalLibrary as LibraryIcon,
  LibraryAdd as CatalogIcon,
  SwapHoriz as CirculationIcon,
  Widgets as SuppliesIcon,
  DeleteSweep as WastageIcon,
  Category as CategoryIcon,
  CalendarMonth as TimetableIcon,
  Subject as SubjectIcon,
  GridOn as GridIcon,
  Groups as ClassSetupIcon,
  Diversity3 as CohortIcon,
  AccountTree as WingIcon,
  Rule as ConstraintIcon,
  AutoAwesome as GenerateIcon,
  EventAvailable as PublishedIcon,
  Schedule as ScheduleIcon,
  School as StudentIcon,
  AssignmentReturn as TransferIcon,
  Home as HouseIcon,
  FactCheck as AttendanceIcon,
  EditCalendar as MarkIcon,
  History as HistoryIcon,
  Campaign as CommunicationIcon,
  Send as ComposeIcon,
  Description as TemplateIcon,
  Outbox as SentIcon,
  PersonSearch as HiringIcon,
  DirectionsBus as TransportIcon,
  PinDrop as StopIcon,
  AirportShuttle as VehicleIcon,
  AltRoute as RouteIcon,
  AssignmentInd as AssignmentIcon,
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
    perm: 'medical.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/medical' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/medical/items' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/medical/purchases' },
      { title: 'Issue Log', icon: IssueIcon, path: '/medical/issues' },
    ],
  },
  {
    title: 'Laboratory',
    icon: ScienceIcon,
    perm: 'lab.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/lab' },
      { title: 'Labs', icon: ScienceIcon, path: '/lab/labs' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/lab/items' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/lab/purchases' },
      { title: 'Issue Log', icon: IssueIcon, path: '/lab/issues' },
      { title: 'Breakage Log', icon: BrokenImageIcon, path: '/lab/breakages' },
    ],
  },
  {
    title: 'Fines',
    icon: GavelIcon,
    perm: 'fine.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/fine' },
      { title: 'Incidents', icon: GavelIcon, path: '/fine/incidents' },
    ],
  },
  {
    title: 'Uniform',
    icon: CheckroomIcon,
    perm: 'uniform.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/uniform' },
      { title: 'Catalog', icon: CheckroomIcon, path: '/uniform/catalog' },
      { title: 'Purchases', icon: PurchaseIcon, path: '/uniform/purchases' },
      { title: 'Sets', icon: SetsIcon, path: '/uniform/sets' },
      { title: 'Sales', icon: IssueIcon, path: '/uniform/sales' },
    ],
  },
  {
    title: 'Shop',
    icon: MenuBookIcon,
    perm: 'shop.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/shop' },
      { title: 'Catalog', icon: MenuBookIcon, path: '/shop/catalog' },
      { title: 'Purchases', icon: PurchaseIcon, path: '/shop/purchases' },
      { title: 'Sets', icon: SetsIcon, path: '/shop/sets' },
      { title: 'Sales', icon: IssueIcon, path: '/shop/sales' },
    ],
  },
  {
    title: 'Sports',
    icon: SportsIcon,
    perm: 'sports.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/sports' },
      { title: 'In-charges', icon: SportsIcon, path: '/sports/incharges', perm: 'sports.manage' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/sports/items' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/sports/purchases' },
      { title: 'Issue Log', icon: IssueIcon, path: '/sports/issues' },
      { title: 'Breakage Log', icon: BrokenImageIcon, path: '/sports/breakages' },
    ],
  },
  {
    title: 'Assets',
    icon: AssetIcon,
    perm: 'asset.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/asset' },
      { title: 'Asset Register', icon: AssetTreeIcon, path: '/asset/tree' },
      { title: 'Counts', icon: CountsIcon, path: '/asset/counts' },
      { title: 'Asset Types', icon: TypeIcon, path: '/asset/types' },
    ],
  },
  {
    title: 'Library',
    icon: LibraryIcon,
    perm: 'library.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/library' },
      { title: 'Catalog', icon: CatalogIcon, path: '/library/catalog' },
      { title: 'Circulation', icon: CirculationIcon, path: '/library/circulation' },
      { title: 'Fines', icon: GavelIcon, path: '/library/fines' },
      { title: 'Settings', icon: TypeIcon, path: '/library/settings' },
    ],
  },
  {
    title: 'Supplies',
    icon: SuppliesIcon,
    perm: 'supplies.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/supplies' },
      { title: 'Categories', icon: CategoryIcon, path: '/supplies/categories' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/supplies/items' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/supplies/purchases' },
      { title: 'Issue Log', icon: IssueIcon, path: '/supplies/issues' },
      { title: 'Wastage Log', icon: WastageIcon, path: '/supplies/wastages' },
    ],
  },
  {
    title: 'Timetable',
    icon: TimetableIcon,
    perm: 'timetable.view',
    children: [
      // Planning pages: admin+god (timetable.print); teachers see Published only.
      { title: 'Overview', icon: OverviewIcon, path: '/timetable', perm: 'timetable.print' },
      { title: 'Subjects', icon: SubjectIcon, path: '/timetable/subjects', perm: 'timetable.print' },
      { title: 'Grid Config', icon: GridIcon, path: '/timetable/configs', perm: 'timetable.print' },
      { title: 'Class Setup', icon: ClassSetupIcon, path: '/timetable/setup', perm: 'timetable.print' },
      { title: 'Class Groups', icon: CohortIcon, path: '/timetable/class-groups', perm: 'timetable.print' },
      { title: 'Wings', icon: WingIcon, path: '/timetable/wings', perm: 'timetable.print' },
      { title: 'Teacher Constraints', icon: ConstraintIcon, path: '/timetable/constraints', perm: 'timetable.print' },
      { title: 'Seasons & Bell Timings', icon: ScheduleIcon, path: '/timetable/seasons', perm: 'timetable.print' },
      { title: 'Generate', icon: GenerateIcon, path: '/timetable/generate', perm: 'timetable.print' },
      { title: 'Generation Runs', icon: HistoryIcon, path: '/timetable/runs', perm: 'timetable.print' },
      { title: 'Published', icon: PublishedIcon, path: '/timetable/published', perm: 'timetable.view' },
    ],
  },
  {
    title: 'Attendance',
    icon: AttendanceIcon,
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/attendance' },
      { title: 'Take Attendance', icon: MarkIcon, path: '/attendance/mark' },
      { title: 'History', icon: HistoryIcon, path: '/attendance/sessions' },
    ],
  },
  {
    title: 'Communication',
    icon: CommunicationIcon,
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/communication' },
      { title: 'Compose', icon: ComposeIcon, path: '/communication/compose' },
      { title: 'Templates', icon: TemplateIcon, path: '/communication/templates' },
      { title: 'Sent Messages', icon: SentIcon, path: '/communication/messages' },
    ],
  },
  {
    title: 'Students',
    icon: StudentIcon,
    perm: 'student.view',
    children: [
      { title: 'All Students', icon: PeopleIcon, path: '/students' },
      { title: 'Houses', icon: HouseIcon, path: '/students/houses', perm: 'student.manage' },
    ],
  },
  {
    title: 'Transfer',
    icon: TransferIcon,
    path: '/transfer',
    perm: 'transfer.view',
  },
  {
    title: 'Employees',
    icon: PeopleIcon,
    path: '/employees',
    perm: 'employee.view',
  },
  {
    title: 'Hiring',
    icon: HiringIcon,
    path: '/hiring',
    perm: 'hiring.view',
  },
  {
    // No parent perm: managers (transport.view) see all children; a
    // transport-attendance teacher (transport.attendance.mark) sees only the two
    // attendance items below, so the menu shows with just those.
    title: 'Transport',
    icon: TransportIcon,
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/transport', perm: 'transport.view' },
      { title: 'Stops', icon: StopIcon, path: '/transport/stops', perm: 'transport.view' },
      { title: 'Vehicles', icon: VehicleIcon, path: '/transport/vehicles', perm: 'transport.view' },
      { title: 'Routes', icon: RouteIcon, path: '/transport/routes', perm: 'transport.view' },
      { title: 'Student Assignments', icon: AssignmentIcon, path: '/transport/assignments', perm: 'transport.view' },
      { title: 'Take Attendance', icon: MarkIcon, path: '/transport/attendance/mark', perm: 'transport.attendance.mark' },
      { title: 'Attendance History', icon: HistoryIcon, path: '/transport/attendance/sessions', perm: 'transport.attendance.mark' },
    ],
  },
];

export default function Sidebar({ open, onClose, isDesktop }) {
  const navigate = useNavigate();
  const location = useLocation();
  const can = useCan();
  const isMobile = useIsMobile();
  const [openMenus, setOpenMenus] = useState({ Medical: true, Laboratory: false, Fines: false, Uniform: false, Shop: false, Sports: false, Assets: false, Library: false, Supplies: false, Timetable: false, Attendance: false, Communication: false });

  // Filter the static menu by the user's permissions: a parent with its own `perm`
  // the user fails is dropped; its children are filtered by each child's `perm`
  // (falling back to the parent's), and a parent left with no children is dropped.
  const visibleMenu = menuItems
    .map((item) => {
      if (!item.children) {
        return !item.perm || can(item.perm) ? item : null;
      }
      if (item.perm && !can(item.perm)) return null;
      const children = item.children.filter((c) => {
        const perm = c.perm ?? item.perm;
        return !perm || can(perm);
      });
      return children.length ? { ...item, children } : null;
    })
    .filter(Boolean);

  // On small screens the sidebar shows only the mobile-published features (flat list).
  const mobileItems = MOBILE_FEATURES.filter((f) => !f.perm || can(f.perm));

  const handleToggle = (title) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (!isDesktop) {
      onClose();
    }
  };

  const sidebarStyles = {
    background: '#222b45',
    text: '#8f9bb3',
    textActive: '#ffffff',
    hover: '#1a2138',
  };

  const drawerContent = (
    <>
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

      {!isMobile ? (
      <List sx={{ pt: 2 }}>
        {visibleMenu.map((item) => (
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
                        onClick={() => handleNavigate(child.path)}
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
                  onClick={() => handleNavigate(item.path)}
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
      ) : (
        <List sx={{ pt: 2 }}>
          {mobileItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
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
          ))}
        </List>
      )}
    </>
  );

  return (
    <Drawer
      variant={isDesktop ? 'permanent' : 'temporary'}
      open={isDesktop ? true : open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
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
      {drawerContent}
    </Drawer>
  );
}

export { DRAWER_WIDTH };
