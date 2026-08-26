import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCan } from '../permissions/can';
import { buildMobileTiles } from '../mobile/mobileFeatures';
import { useMobileVisibility } from '../mobile/useMobileVisibility';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Collapse,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import { groupByModule } from '../config/moduleGroups';
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
  RecordVoiceOver as AssistantIcon,
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
  MenuBook as SyllabusIcon,
  LibraryBooks as PlanIcon,
  Subject as SyllabusSubjectIcon,
  Checklist as CoverageIcon,
  Groups as AssemblyIcon,
  Palette as ThemeIcon,
  ViewWeek as WeekIcon,
  CalendarMonth as CalendarIcon,
  Settings as AsmSettingsIcon,
  Diversity3 as HouseRotationIcon,
  EditCalendar as RosterIcon,
  FactCheck as ChecklistIcon,
  Grading as GradingIcon,
  EmojiEvents as LeaderboardIcon,
  PhotoCamera as HomeworkIcon,
  HistoryEdu as ExamIcon,
  Payments as FeesIcon,
  PointOfSale as CollectIcon,
  RequestQuote as StructureIcon,
  MoneyOff as WaiverIcon,
  Undo as RefundIcon,
  ReceiptLong as DuesIcon,
  Receipt as ReceiptIcon,
  SchoolOutlined as ExamOnlyIcon,
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
    title: 'Fees',
    icon: FeesIcon,
    perm: 'fee.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/fees' },
      { title: 'Dues Report', icon: DuesIcon, path: '/fees/dues', perm: 'fee.view' },
      { title: 'Collect Fees', icon: CollectIcon, path: '/fees/collect', perm: 'fee.collect' },
      { title: 'Receipts', icon: ReceiptIcon, path: '/fees/receipts', perm: 'fee.view' },
      { title: 'Setup', icon: TypeIcon, path: '/fees/setup', perm: 'fee.manage' },
      { title: 'Fee Structure', icon: StructureIcon, path: '/fees/structure', perm: 'fee.manage' },
      { title: 'Concessions', icon: GavelIcon, path: '/fees/concessions', perm: 'fee.manage' },
      { title: 'Transport Slabs', icon: TransportIcon, path: '/fees/transport-slabs', perm: 'fee.manage' },
      { title: 'Late Fees', icon: ScheduleIcon, path: '/fees/late-fees', perm: 'fee.manage' },
      { title: 'Fine Exemptions', icon: WaiverIcon, path: '/fees/fine-exemptions', perm: 'fee.manage' },
      { title: 'Fee Exempt', icon: ExamOnlyIcon, path: '/fees/exam-only', perm: 'fee.manage' },
      { title: 'Waivers', icon: WaiverIcon, path: '/fees/waivers', perm: 'fee.manage' },
      { title: 'Refunds', icon: RefundIcon, path: '/fees/refunds', perm: 'fee.collect' },
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
      { title: 'Overview', icon: OverviewIcon, path: '/sports', perm: 'sports.manage' },
      { title: 'In-charges', icon: SportsIcon, path: '/sports/incharges', perm: 'sports.manage' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/sports/items' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/sports/purchases', perm: 'sports.manage' },
      { title: 'Issue Log', icon: IssueIcon, path: '/sports/issues', perm: 'sports.manage' },
      { title: 'Breakage Log', icon: BrokenImageIcon, path: '/sports/breakages', perm: 'sports.manage' },
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
      { title: 'Overview', icon: OverviewIcon, path: '/library', perm: 'library.manage' },
      { title: 'Catalog', icon: CatalogIcon, path: '/library/catalog' },
      { title: 'Circulation', icon: CirculationIcon, path: '/library/circulation' },
      { title: 'Fines', icon: GavelIcon, path: '/library/fines', perm: 'library.manage' },
      { title: 'Settings', icon: TypeIcon, path: '/library/settings', perm: 'library.manage' },
    ],
  },
  {
    title: 'Supplies',
    icon: SuppliesIcon,
    perm: 'supplies.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/supplies', perm: 'supplies.manage' },
      { title: 'Categories', icon: CategoryIcon, path: '/supplies/categories', perm: 'supplies.manage' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/supplies/items' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/supplies/purchases', perm: 'supplies.manage' },
      { title: 'Issue Log', icon: IssueIcon, path: '/supplies/issues', perm: 'supplies.manage' },
      { title: 'Wastage Log', icon: WastageIcon, path: '/supplies/wastages', perm: 'supplies.manage' },
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
    perm: 'attendance.mark',
    children: [
      // Class teachers (attendance.mark, no finalize) get only Take Attendance;
      // the review surfaces (Overview/Register/History) are admin/god (attendance.finalize).
      { title: 'Overview', icon: OverviewIcon, path: '/attendance', perm: 'attendance.finalize' },
      { title: 'Take Attendance', icon: MarkIcon, path: '/attendance/mark' },
      { title: 'Register', icon: MenuBookIcon, path: '/attendance/register', perm: 'attendance.finalize' },
      { title: 'History', icon: HistoryIcon, path: '/attendance/sessions', perm: 'attendance.finalize' },
    ],
  },
  {
    title: 'Communication',
    icon: CommunicationIcon,
    perm: 'communication.send',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/communication' },
      { title: 'Compose', icon: ComposeIcon, path: '/communication/compose' },
      { title: 'Templates', icon: TemplateIcon, path: '/communication/templates' },
      { title: 'Sent Messages', icon: SentIcon, path: '/communication/messages' },
    ],
  },
  {
    title: 'Assistant',
    icon: AssistantIcon,
    path: '/assistant',
    perm: 'assistant.use',
  },
  {
    title: 'Students',
    icon: StudentIcon,
    perm: 'student.view',
    children: [
      { title: 'All Students', icon: PeopleIcon, path: '/students' },
      { title: 'Class Strength', icon: OverviewIcon, path: '/students/class-strength', perm: 'student.manage' },
      { title: 'Bulk Edit', icon: GridIcon, path: '/students/bulk-edit', perm: 'student.manage' },
      { title: 'Houses', icon: HouseIcon, path: '/students/houses', perm: 'student.manage' },
    ],
  },
  {
    title: 'Transfer Certs',
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
  {
    // No parent perm: teachers (syllabus.view, no manage) see only "My Plans" —
    // their own assigned sections. Managers (syllabus.manage) get the school-wide
    // authoring surfaces + the "Coverage" picker. Both the full Plans list and the
    // Coverage picker expose every subject, so they are manage-gated.
    title: 'Syllabus',
    icon: SyllabusIcon,
    children: [
      { title: 'Overview', icon: SyllabusSubjectIcon, path: '/syllabus/overview', perm: 'syllabus.manage' },
      { title: 'Subjects', icon: SyllabusSubjectIcon, path: '/syllabus/subjects', perm: 'syllabus.manage' },
      { title: 'Offerings', icon: SyllabusSubjectIcon, path: '/syllabus/offerings', perm: 'syllabus.manage' },
      { title: 'My Plans', icon: AssignmentIcon, path: '/syllabus/my', perm: 'syllabus.view', notPerm: 'syllabus.manage' },
      { title: 'Plans', icon: PlanIcon, path: '/syllabus', perm: 'syllabus.manage' },
      { title: 'Model Papers', icon: SyllabusSubjectIcon, path: '/syllabus/model-papers', perm: 'syllabus.manage' },
      { title: 'Coverage', icon: CoverageIcon, path: '/syllabus/progress', perm: 'syllabus.manage' },
    ],
  },
  {
    // No parent perm: class teachers (homework.post) see Post Homework; admins also
    // see Class Teachers (the mapping override, gated by homework.manage).
    title: 'Homework',
    icon: HomeworkIcon,
    children: [
      { title: 'Post Homework', icon: HomeworkIcon, path: '/homework', perm: 'homework.post' },
      { title: 'Class Teachers', icon: PeopleIcon, path: '/homework/class-teachers', perm: 'homework.manage' },
    ],
  },
  {
    title: 'Academic Calendar',
    icon: CalendarIcon,
    path: '/academic-calendar',
    perm: 'academic-calendar.view',
  },
  {
    title: 'Examinations',
    icon: ExamIcon,
    path: '/examinations',
    perm: 'exam.view',
  },
  {
    title: 'Assembly',
    icon: AssemblyIcon,
    children: [
      // 'Day' is a mobile-only view (wired via MOBILE_FEATURES → /assembly/day);
      // on desktop 'This Week' already covers it, so it's intentionally omitted here.
      { title: 'This Week', icon: WeekIcon, path: '/assembly/week', perm: 'assembly.view' },
      { title: 'Calendar', icon: CalendarIcon, path: '/assembly/calendar', perm: 'assembly.view' },
      // House-duty screens for teachers — shown only to the relevant house member /
      // evaluator (derived via /me/assembly/duties), hidden from admins who use the
      // authoring entries below. Mirrors the mobile "my" tiles onto desktop.
      { title: 'My Roster', icon: RosterIcon, path: '/assembly/my-roster', perm: 'assembly.view', derived: 'houseMember' },
      { title: 'My Checklist', icon: ChecklistIcon, path: '/assembly/my-checklist', perm: 'assembly.view', derived: 'houseMember' },
      { title: 'My Grading', icon: GradingIcon, path: '/assembly/my-grade', perm: 'assembly.view', derived: 'evaluator' },
      // Authoring — admin/god only (assembly.manage) and desktop-only (absent from MOBILE_FEATURES).
      { title: 'Plans', icon: PlanIcon, path: '/assembly', perm: 'assembly.manage' },
      { title: 'Themes', icon: ThemeIcon, path: '/assembly/themes', perm: 'assembly.manage' },
      // House mode — authoring (admin/god only). Harmless in template mode.
      { title: 'Houses & Rotation', icon: HouseRotationIcon, path: '/assembly/houses', perm: 'assembly.manage' },
      { title: 'Roster', icon: RosterIcon, path: '/assembly/roster', perm: 'assembly.manage' },
      { title: 'Checklist', icon: ChecklistIcon, path: '/assembly/checklist', perm: 'assembly.manage' },
      { title: 'Grading', icon: GradingIcon, path: '/assembly/grading', perm: 'assembly.manage' },
      { title: 'Leaderboard', icon: LeaderboardIcon, path: '/assembly/leaderboard', perm: 'assembly.manage' },
      { title: 'Settings', icon: AsmSettingsIcon, path: '/assembly/settings', perm: 'assembly.manage' },
    ],
  },
];

export default function Sidebar({ open, onClose, isDesktop }) {
  const navigate = useNavigate();
  const location = useLocation();
  const can = useCan();
  const isMobile = useIsMobile();
  // Enabled on mobile (home tiles) and, on desktop, for anyone with assembly.view so
  // the derived "My Roster/Checklist/Grading" sidebar entries can resolve house roles.
  const { visible: mobileVisible } = useMobileVisibility(isMobile || can('assembly.view'));
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
        if (perm && !can(perm)) return false;
        // Negative gate: hide from anyone who HAS this action (e.g. show the scoped
        // "My Plans" to teachers but not to managers, who use the full "Plans" list).
        if (c.notPerm && can(c.notPerm)) return false;
        // Derived "my" entries (house member / evaluator): shown to the matching
        // teacher only; admins use the authoring entries instead.
        if (c.derived) return !can('assembly.manage') && mobileVisible(c);
        return true;
      });
      return children.length ? { ...item, children } : null;
    })
    .filter(Boolean);

  // Desktop menu: pin Dashboard on top, then the rest split into labelled groups
  // (People & Staff / Academics / Operations / Stores & Inventory) with a divider each.
  // Flatten to a single list of entries (item | divider | label) so the render loop keeps
  // the existing per-item markup and just interleaves separators.
  const dashboardItem = visibleMenu.find((i) => i.title === 'Dashboard');
  const groupedMenu = groupByModule(visibleMenu.filter((i) => i.title !== 'Dashboard'));
  const desktopEntries = [];
  if (dashboardItem) desktopEntries.push({ type: 'item', item: dashboardItem });
  groupedMenu.forEach((group) => {
    desktopEntries.push({ type: 'divider', key: `div-${group.key}` });
    if (group.label) desktopEntries.push({ type: 'label', key: `lbl-${group.key}`, label: group.label });
    group.items.forEach((item) => desktopEntries.push({ type: 'item', item }));
  });

  // On small screens the sidebar mirrors the mobile home: the Today / Modules bands,
  // hub tiles collapsing to /hub/:key (same buildMobileTiles model + derived gating).
  const mobileSections = buildMobileTiles(mobileVisible);

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
          Staff Portal
        </Typography>
      </Box>

      {!isMobile ? (
      <List sx={{ pt: 2 }}>
        {desktopEntries.map((entry) => {
          if (entry.type === 'divider') {
            return <Divider key={entry.key} sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1 }} />;
          }
          if (entry.type === 'label') {
            return (
              <ListSubheader
                key={entry.key}
                sx={{
                  bgcolor: 'transparent',
                  color: sidebarStyles.text,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  lineHeight: '2.4',
                }}
              >
                {entry.label}
              </ListSubheader>
            );
          }
          const item = entry.item;
          return (
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
          );
        })}
      </List>
      ) : (
        <List sx={{ pt: 1 }}>
          {mobileSections.map((sec) => (
            <React.Fragment key={sec.key}>
              <ListSubheader
                sx={{
                  bgcolor: 'transparent',
                  color: sidebarStyles.text,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  lineHeight: '2.4',
                }}
              >
                {sec.label}
              </ListSubheader>
              {sec.tiles.map((t) => (
                <ListItem key={t.id ?? t.path} disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigate(t.path)}
                    sx={{
                      px: 3,
                      py: 1.5,
                      backgroundColor: isActive(t.path)
                        ? 'rgba(51, 102, 255, 0.2)'
                        : 'transparent',
                      borderLeft: isActive(t.path)
                        ? '3px solid #3366ff'
                        : '3px solid transparent',
                      '&:hover': { backgroundColor: sidebarStyles.hover },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive(t.path)
                          ? sidebarStyles.textActive
                          : sidebarStyles.text,
                        minWidth: 40,
                      }}
                    >
                      <t.icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={t.title}
                      sx={{
                        '& .MuiTypography-root': {
                          color: isActive(t.path)
                            ? sidebarStyles.textActive
                            : sidebarStyles.text,
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </React.Fragment>
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
