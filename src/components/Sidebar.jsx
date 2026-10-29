import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCan } from '../permissions/can';
import { useAdminReveal } from '../context/AdminRevealContext';
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
  Tooltip,
  IconButton,
} from '@mui/material';
import { groupByModule } from '../config/moduleGroups';
import {
  Dashboard as DashboardIcon,
  MonitorHeart as CockpitIcon,
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
  PhonelinkLock as AppAccessIcon,
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
  EditCalendar as ManualTimetableIcon,
  Schedule as ScheduleIcon,
  School as StudentIcon,
  Summarize as ReportIcon,
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
  Forum as ProgrammesIcon,
  LibraryBooks as PlanIcon,
  Subject as SyllabusSubjectIcon,
  Checklist as CoverageIcon,
  Groups as AssemblyIcon,
  Palette as ThemeIcon,
  ViewWeek as WeekIcon,
  CalendarMonth as CalendarIcon,
  Settings as AsmSettingsIcon,
  AdminPanelSettings as PermissionsIcon,
  Diversity3 as HouseRotationIcon,
  EditCalendar as RosterIcon,
  FactCheck as ChecklistIcon,
  Grading as GradingIcon,
  EmojiEvents as LeaderboardIcon,
  PhotoCamera as HomeworkIcon,
  PhotoLibrary as MomentsIcon,
  Language as WebsiteIcon,
  HistoryEdu as ExamIcon,
  HowToReg as DutyIcon,
  Image as BrandingSidebarIcon,
  Payments as FeesIcon,
  PointOfSale as CollectIcon,
  RequestQuote as StructureIcon,
  MoneyOff as WaiverIcon,
  Undo as RefundIcon,
  ReceiptLong as DuesIcon,
  Receipt as ReceiptIcon,
  SchoolOutlined as ExamOnlyIcon,
  EventBusy as LeaveNavIcon,
  Feedback as FeedbackNavIcon,
  UploadFile as BioImportIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;
// Collapsed "icon rail" width — icons only, labels on hover. Only applies to the
// permanent (desktop >= md) drawer; the temporary tablet/mobile drawer ignores it.
const COLLAPSED_WIDTH = 72;

const menuItems = [
  {
    // School branding (crests, stamp, printed-header text + report-card masthead) is school-wide,
    // so it sits at the top rather than inside Examinations. Director-only Copilot slots in below.
    title: 'Branding',
    icon: BrandingSidebarIcon,
    path: '/branding',
    perm: 'exam.schedule.manage',
  },
  {
    // Director's Cockpit / School Pulse — pinned as the first nav item, above Dashboard.
    // Director + god only (god via '*').
    title: 'Cockpit',
    icon: CockpitIcon,
    path: '/cockpit',
    perm: 'cockpit.view',
  },
  {
    title: 'Dashboard',
    icon: DashboardIcon,
    path: '/',
  },
  {
    title: 'Medical',
    icon: MedicalIcon,
    perm: 'medical.inventory.view',
    children: [
      // Convention: Overview first (when present), then Permissions, then Config, then the rest.
      // Overview is a mixed dashboard (stock + expiring purchases), so it rides purchase.view
      // (admin/incharge). Teachers get the clean single-resource Inventory Items + Issue Log.
      { title: 'Overview', icon: OverviewIcon, path: '/medical', perm: 'medical.purchase.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/medical/permissions', perm: 'authz.manage', admin: true },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/medical/items', perm: 'medical.inventory.view' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/medical/purchases', perm: 'medical.purchase.view' },
      { title: 'Issue Log', icon: IssueIcon, path: '/medical/issues', perm: 'medical.issue.view' },
    ],
  },
  {
    title: 'Laboratory',
    icon: ScienceIcon,
    perm: 'lab.inventory.view',
    children: [
      // Convention: Overview first (when present), then Permissions, then the rest.
      // Overview is a mixed dashboard; teachers get the clean Inventory Items + Issue Log.
      { title: 'Overview', icon: OverviewIcon, path: '/lab', perm: 'lab.purchase.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/lab/permissions', perm: 'authz.manage', admin: true },
      { title: 'Labs', icon: ScienceIcon, path: '/lab/labs', perm: 'lab.setup.view' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/lab/items', perm: 'lab.inventory.view' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/lab/purchases', perm: 'lab.purchase.view' },
      { title: 'Issue Log', icon: IssueIcon, path: '/lab/issues', perm: 'lab.issue.view' },
      { title: 'Breakage Log', icon: BrokenImageIcon, path: '/lab/breakages', perm: 'lab.breakage.view' },
    ],
  },
  {
    title: 'Fines',
    icon: GavelIcon,
    perm: 'fine.incident.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/fine', perm: 'fine.incident.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/fine/permissions', perm: 'authz.manage', admin: true },
      { title: 'Incidents', icon: GavelIcon, path: '/fine/incidents', perm: 'fine.incident.view' },
    ],
  },
  {
    title: 'Fees',
    icon: FeesIcon,
    perm: 'fee.report.view',
    children: [
      // Convention: Overview first, then Permissions (god-only), then the rest.
      { title: 'Overview', icon: OverviewIcon, path: '/fees' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/fees/permissions', perm: 'authz.manage', admin: true },
      { title: 'Dues Report', icon: DuesIcon, path: '/fees/dues', perm: 'fee.report.view' },
      { title: 'Accumulated Dues', icon: DuesIcon, path: '/fees/accumulated-dues', perm: 'fee.report.view' },
      // Collection Desk — the manager's phone-first view; also opened by god/director here. Gated
      // latefine.exempt so only god + manager see the link (admins/clerks don't).
      { title: 'Collection Desk', icon: CollectIcon, path: '/fees/collection-desk', perm: 'fee.fine.exempt' },
      { title: 'Collect Fees', icon: CollectIcon, path: '/fees/collect', perm: 'fee.collect.collect' },
      { title: 'Receipts', icon: ReceiptIcon, path: '/fees/receipts', perm: 'fee.report.view' },
      { title: 'Setup', icon: TypeIcon, path: '/fees/setup', perm: 'fee.structure.manage' },
      { title: 'Fee Structure', icon: StructureIcon, path: '/fees/structure', perm: 'fee.structure.manage' },
      { title: 'Concessions', icon: GavelIcon, path: '/fees/concessions', perm: 'fee.concession.assign' },
      { title: 'Transport Slabs', icon: TransportIcon, path: '/fees/transport-slabs', perm: 'fee.transport.manage' },
      { title: 'Late Fees', icon: ScheduleIcon, path: '/fees/late-fees', perm: 'fee.latefee.manage' },
      { title: 'Fine Exemptions', icon: WaiverIcon, path: '/fees/fine-exemptions', perm: 'fee.report.view' },
      { title: 'Fee Exempt', icon: ExamOnlyIcon, path: '/fees/exam-only', perm: 'fee.student.manage' },
      { title: 'Waivers', icon: WaiverIcon, path: '/fees/waivers', perm: 'fee.waiver.manage' },
      { title: 'Refunds', icon: RefundIcon, path: '/fees/refunds', perm: 'fee.collect.collect' },
    ],
  },
  {
    title: 'Uniform',
    icon: CheckroomIcon,
    perm: 'uniform.inventory.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/uniform', perm: 'uniform.inventory.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/uniform/permissions', perm: 'authz.manage', admin: true },
      { title: 'Catalog', icon: CheckroomIcon, path: '/uniform/catalog', perm: 'uniform.inventory.view' },
      { title: 'Purchases', icon: PurchaseIcon, path: '/uniform/purchases', perm: 'uniform.purchase.view' },
      { title: 'Sets', icon: SetsIcon, path: '/uniform/sets', perm: 'uniform.set.view' },
      { title: 'Sales', icon: IssueIcon, path: '/uniform/sales', perm: 'uniform.sale.view' },
    ],
  },
  {
    title: 'Shop',
    icon: MenuBookIcon,
    perm: 'shop.inventory.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/shop', perm: 'shop.inventory.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/shop/permissions', perm: 'authz.manage', admin: true },
      { title: 'Grade Sets', icon: SetsIcon, path: '/shop/sets', perm: 'shop.set.view' },
      { title: 'Assign to Student', icon: IssueIcon, path: '/shop/assign', perm: 'shop.sale.view' },
      { title: 'Assignments', icon: IssueIcon, path: '/shop/sales', perm: 'shop.sale.view' },
      { title: 'Catalog', icon: MenuBookIcon, path: '/shop/catalog', perm: 'shop.inventory.view' },
    ],
  },
  {
    title: 'Sports',
    icon: SportsIcon,
    perm: 'sports.inventory.view',
    children: [
      // Convention: Overview first, then Permissions, then the rest.
      { title: 'Overview', icon: OverviewIcon, path: '/sports', perm: 'sports.purchase.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/sports/permissions', perm: 'authz.manage', admin: true },
      { title: 'In-charges', icon: SportsIcon, path: '/sports/incharges', perm: 'sports.setup.view' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/sports/items', perm: 'sports.inventory.view' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/sports/purchases', perm: 'sports.purchase.view' },
      { title: 'Issue Log', icon: IssueIcon, path: '/sports/issues', perm: 'sports.issue.view' },
      { title: 'Breakage Log', icon: BrokenImageIcon, path: '/sports/breakages', perm: 'sports.breakage.view' },
    ],
  },
  {
    title: 'Assets',
    icon: AssetIcon,
    perm: 'asset.register.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/asset', perm: 'asset.register.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/asset/permissions', perm: 'authz.manage', admin: true },
      { title: 'Asset Register', icon: AssetTreeIcon, path: '/asset/tree', perm: 'asset.register.view' },
      { title: 'Counts', icon: CountsIcon, path: '/asset/counts', perm: 'asset.register.view' },
      { title: 'Asset Types', icon: TypeIcon, path: '/asset/types', perm: 'asset.type.view' },
    ],
  },
  {
    title: 'Library',
    icon: LibraryIcon,
    perm: 'library.catalog.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/library', perm: 'library.catalog.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/library/permissions', perm: 'authz.manage', admin: true },
      { title: 'Settings', icon: TypeIcon, path: '/library/settings', perm: 'library.config.view', admin: true },
      { title: 'Catalog', icon: CatalogIcon, path: '/library/catalog', perm: 'library.catalog.view' },
      { title: 'Circulation', icon: CirculationIcon, path: '/library/circulation', perm: 'library.circulation.view' },
      { title: 'Fines', icon: GavelIcon, path: '/library/fines', perm: 'library.fine.view' },
    ],
  },
  {
    title: 'Supplies',
    icon: SuppliesIcon,
    perm: 'supplies.inventory.view',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/supplies', perm: 'supplies.purchase.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/supplies/permissions', perm: 'authz.manage', admin: true },
      { title: 'Categories', icon: CategoryIcon, path: '/supplies/categories', perm: 'supplies.category.view' },
      { title: 'Inventory Items', icon: InventoryIcon, path: '/supplies/items', perm: 'supplies.inventory.view' },
      { title: 'Purchase Log', icon: PurchaseIcon, path: '/supplies/purchases', perm: 'supplies.purchase.view' },
      { title: 'Issue Log', icon: IssueIcon, path: '/supplies/issues', perm: 'supplies.issue.view' },
      { title: 'Wastage Log', icon: WastageIcon, path: '/supplies/wastages', perm: 'supplies.wastage.view' },
    ],
  },
  {
    title: 'Timetable',
    icon: TimetableIcon,
    perm: 'timetable.grid.view',
    children: [
      // Planning pages: admin+god (timetable.print); teachers see Published only.
      { title: 'Overview', icon: OverviewIcon, path: '/timetable', perm: 'timetable.grid.print' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/timetable/permissions', perm: 'authz.manage', admin: true },
      { title: 'Subjects', icon: SubjectIcon, path: '/timetable/subjects', perm: 'timetable.grid.print' },
      { title: 'Grid Config', icon: GridIcon, path: '/timetable/configs', perm: 'timetable.grid.print' },
      { title: 'Class Setup', icon: ClassSetupIcon, path: '/timetable/setup', perm: 'timetable.grid.print' },
      { title: 'Class Groups', icon: CohortIcon, path: '/timetable/class-groups', perm: 'timetable.grid.print' },
      { title: 'Wings', icon: WingIcon, path: '/timetable/wings', perm: 'timetable.grid.print' },
      { title: 'Teacher Constraints', icon: ConstraintIcon, path: '/timetable/constraints', perm: 'timetable.grid.print' },
      { title: 'Seasons & Bell Timings', icon: ScheduleIcon, path: '/timetable/seasons', perm: 'timetable.grid.print' },
      { title: 'Generate', icon: GenerateIcon, path: '/timetable/generate', perm: 'timetable.grid.print' },
      { title: 'Generation Runs', icon: HistoryIcon, path: '/timetable/runs', perm: 'timetable.grid.print' },
      { title: 'Manual Timetable', icon: ManualTimetableIcon, path: '/timetable/manual', perm: 'timetable.grid.print' },
      { title: 'Published', icon: PublishedIcon, path: '/timetable/published', perm: 'timetable.grid.view' },
    ],
  },
  {
    title: 'Attendance',
    icon: AttendanceIcon,
    perm: 'attendance.session.mark',
    children: [
      // Convention: Overview, then Permissions (god-only), then Config, then the work surfaces.
      // Class teachers (attendance.session.mark, no finalize) get only Take Attendance;
      // the review surfaces (Overview/Register/History) are admin/god (attendance.session.finalize).
      { title: 'Overview', icon: OverviewIcon, path: '/attendance', perm: 'attendance.session.finalize' },
      // Permissions + Config are god-only by default (authz.manage / attendance.config.manage,
      // the latter not granted to admin in policy); god can open Config to admin via the grid.
      { title: 'Permissions', icon: PermissionsIcon, path: '/attendance/permissions', perm: 'authz.manage', admin: true },
      { title: 'Config', icon: AsmSettingsIcon, path: '/attendance/config', perm: 'attendance.config.manage', admin: true },
      { title: 'Take Attendance', icon: MarkIcon, path: '/attendance/mark' },
      { title: 'Register', icon: MenuBookIcon, path: '/attendance/register', perm: 'attendance.session.finalize' },
      { title: 'History', icon: HistoryIcon, path: '/attendance/sessions', perm: 'attendance.session.finalize' },
    ],
  },
  {
    title: 'Communication',
    icon: CommunicationIcon,
    perm: 'communication.message.send',
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/communication' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/communication/permissions', perm: 'authz.manage', admin: true },
      { title: 'Config', icon: AsmSettingsIcon, path: '/communication/config', perm: 'communication.config.view', admin: true },
      { title: 'Compose', icon: ComposeIcon, path: '/communication/compose' },
      { title: 'Templates', icon: TemplateIcon, path: '/communication/templates' },
      { title: 'Sent Messages', icon: SentIcon, path: '/communication/messages' },
    ],
  },
  {
    title: 'Assistant',
    icon: AssistantIcon,
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/assistant/permissions', perm: 'authz.manage', admin: true },
      { title: 'Assistant', icon: AssistantIcon, path: '/assistant', perm: 'assistant.voice.use' },
    ],
  },
  {
    title: 'Students',
    icon: StudentIcon,
    perm: 'student.record.view',
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/students/permissions', perm: 'authz.manage', admin: true },
      { title: 'All Students', icon: PeopleIcon, path: '/students' },
      { title: 'Class Strength', icon: OverviewIcon, path: '/students/class-strength', perm: 'student.record.manage' },
      { title: 'Bulk Edit', icon: GridIcon, path: '/students/bulk-edit', perm: 'student.record.manage' },
      { title: 'Houses', icon: HouseIcon, path: '/students/houses', perm: 'student.record.manage' },
      { title: 'Reports', icon: ReportIcon, path: '/students/reports', perm: 'student.record.manage' },
      { title: 'App Access', icon: AppAccessIcon, path: '/students/app-logins', perm: 'student.record.manage' },
    ],
  },
  {
    title: 'Transfer Certs',
    icon: TransferIcon,
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/transfer/permissions', perm: 'authz.manage', admin: true },
      { title: 'Transfer Certs', icon: TransferIcon, path: '/transfer', perm: 'transfer.certificate.view' },
    ],
  },
  {
    title: 'Employees',
    icon: PeopleIcon,
    perm: 'employee.record.view',
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/employees/permissions', perm: 'authz.manage', admin: true },
      { title: 'Config', icon: AsmSettingsIcon, path: '/employees/config', perm: 'employee.config.manage', admin: true },
      { title: 'All Employees', icon: PeopleIcon, path: '/employees', perm: 'employee.record.view' },
      // Staff document handbook lives under Employees. Managing (documents.handbook.manage) is
      // god-only; everyone else with documents.sign gets their personal "My Documents".
      { title: 'Documents', icon: TemplateIcon, path: '/documents', perm: 'documents.handbook.manage' },
      { title: 'My Documents', icon: AssignmentIcon, path: '/me/documents', perm: 'documents.sign', notPerm: 'documents.handbook.manage' },
    ],
  },
  {
    title: 'Hiring',
    icon: HiringIcon,
    perm: 'hiring.candidate.view',
    children: [
      // Convention: Permissions first (no Overview in this module), then the rest.
      { title: 'Permissions', icon: PermissionsIcon, path: '/hiring/permissions', perm: 'authz.manage', admin: true },
      { title: 'Candidates', icon: HiringIcon, path: '/hiring', perm: 'hiring.candidate.view' },
    ],
  },
  {
    // No parent perm: managers (transport.setup.view) see all children; a
    // transport-attendance teacher (transport.attendance.mark) sees only the two
    // attendance items below, so the menu shows with just those.
    title: 'Transport',
    icon: TransportIcon,
    children: [
      { title: 'Overview', icon: OverviewIcon, path: '/transport', perm: 'transport.setup.view' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/transport/permissions', perm: 'authz.manage', admin: true },
      { title: 'Stops', icon: StopIcon, path: '/transport/stops', perm: 'transport.setup.view' },
      { title: 'Vehicles', icon: VehicleIcon, path: '/transport/vehicles', perm: 'transport.setup.view' },
      { title: 'Routes', icon: RouteIcon, path: '/transport/routes', perm: 'transport.setup.view' },
      { title: 'Student Assignments', icon: AssignmentIcon, path: '/transport/assignments', perm: 'transport.setup.view' },
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
      { title: 'Overview', icon: SyllabusSubjectIcon, path: '/syllabus/overview', perm: 'syllabus.plan.manage' },
      { title: 'Permissions', icon: PermissionsIcon, path: '/syllabus/permissions', perm: 'authz.manage', admin: true },
      { title: 'Subjects', icon: SyllabusSubjectIcon, path: '/syllabus/subjects', perm: 'syllabus.plan.manage' },
      { title: 'Offerings', icon: SyllabusSubjectIcon, path: '/syllabus/offerings', perm: 'syllabus.plan.manage' },
      { title: 'My Plans', icon: AssignmentIcon, path: '/syllabus/my', perm: 'syllabus.plan.view', notPerm: 'syllabus.plan.manage' },
      { title: 'Plans', icon: PlanIcon, path: '/syllabus', perm: 'syllabus.plan.manage' },
      { title: 'Model Papers', icon: SyllabusSubjectIcon, path: '/syllabus/model-papers', perm: 'syllabus.plan.manage' },
      { title: 'Coverage', icon: CoverageIcon, path: '/syllabus/progress', perm: 'syllabus.plan.manage' },
    ],
  },
  {
    // No parent perm: teachers (programme.unit.view) see the read-only "Spoken English"
    // reader; authors (programme.unit.manage) also get "Manage Content". Permissions is
    // god-only (admin:true) and Settings is config.manage (god-first).
    title: 'Programmes',
    icon: ProgrammesIcon,
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/programmes/permissions', perm: 'authz.manage', admin: true },
      { title: 'Spoken English', icon: ProgrammesIcon, path: '/programmes/selc', perm: 'programme.unit.view' },
      { title: 'Manage Spoken English', icon: SyllabusSubjectIcon, path: '/programmes/selc/edit', perm: 'programme.unit.manage' },
      { title: 'Spoken English Settings', icon: AsmSettingsIcon, path: '/programmes/selc/settings', perm: 'programme.config.manage', admin: true },
    ],
  },
  {
    // No parent perm: class teachers (homework.day.post) see Post Homework; admins also
    // see Class Teachers (the mapping override, gated by homework.day.manage). Permissions
    // is god-only (admin:true → behind the reveal toggle).
    title: 'Homework',
    icon: HomeworkIcon,
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/homework/permissions', perm: 'authz.manage', admin: true },
      { title: 'Post Homework', icon: HomeworkIcon, path: '/homework', perm: 'homework.day.post' },
      { title: 'Class Teachers', icon: PeopleIcon, path: '/homework/class-teachers', perm: 'homework.day.manage' },
    ],
  },
  {
    // Parent-facing "Moments" photo feed. moment.post (class teacher) + moment.manage (admin
    // compose) both reach the Moments screen; Permissions is god-only (behind the reveal toggle).
    title: 'Moments',
    icon: MomentsIcon,
    perm: 'outreach.moment.view',
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/outreach/permissions', perm: 'authz.manage', admin: true },
      { title: 'Moments', icon: MomentsIcon, path: '/outreach', perm: 'outreach.moment.view' },
    ],
  },
  {
    // Website publisher — per-school push of curated Moments photos into Contentful. Gated on
    // website.publish (god + website-incharge only), so it's invisible unless a school uses it.
    title: 'Website',
    icon: WebsiteIcon,
    perm: 'website.publish',
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/website/permissions', perm: 'authz.manage', admin: true },
      { title: 'Publish', icon: WebsiteIcon, path: '/website', perm: 'website.publish' },
    ],
  },
  {
    // No parent perm: teachers (academic-calendar.view) see the Calendar; Permissions is
    // god-only (admin:true → behind the reveal toggle). Convention: Permissions first.
    title: 'Academic Calendar',
    icon: CalendarIcon,
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/academic-calendar/permissions', perm: 'authz.manage', admin: true },
      { title: 'Calendar', icon: CalendarIcon, path: '/academic-calendar', perm: 'academic-calendar.view' },
    ],
  },
  {
    // No parent perm: invigilators (teachers) see "My Duties"; admins also see "Exams".
    title: 'Examinations',
    icon: ExamIcon,
    children: [
      // Convention: Permissions is the FIRST item in every module (god-only).
      { title: 'Permissions', icon: PermissionsIcon, path: '/exam/permissions', perm: 'authz.manage', admin: true },
      { title: 'Exam Schedule', icon: CalendarIcon, path: '/exam/schedule' },
      { title: 'Exams', icon: ExamIcon, path: '/examinations', perm: 'exam.schedule.view' },
      { title: 'My Duties', icon: DutyIcon, path: '/exam/my-invigilations' },
      { title: 'Progress', icon: ExamIcon, path: '/exam/report-progress', perm: 'exam.progress.view' },
      { title: 'Subject Mapping', icon: ExamIcon, path: '/exam/subject-mapping', perm: 'exam.mapping.manage' },
      { title: 'Class Teachers', icon: ExamIcon, path: '/exam/class-teachers', perm: 'exam.mapping.manage' },
      { title: 'Enter Marks', icon: CalendarIcon, path: '/exam/marks' },
      { title: 'Co-Scholastic', icon: CalendarIcon, path: '/exam/coscholastic' },
      { title: 'Report Card Review', icon: ReportIcon, path: '/exam/report-review' },
      { title: 'Remark Templates', icon: TypeIcon, path: '/exam/remark-templates', perm: 'exam.remark.manage' },
      { title: 'Report Format', icon: TypeIcon, path: '/exam/report-format', perm: 'exam.format.manage' },
      { title: 'Report Cards', icon: ReportIcon, path: '/exam/report-cards', perm: 'exam.reportcard.manage' },
    ],
  },
  {
    // Clubs & Activities (day-neutral "Saturday Activities" engine). Locked god-first;
    // god opens roles up via Permissions. Teachers see only "My Activities" (conduct).
    title: 'Clubs & Activities',
    icon: AssemblyIcon,
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/club/permissions', perm: 'authz.manage', admin: true },
      { title: 'Clubs', icon: AssemblyIcon, path: '/club', perm: 'club.setup.view' },
      { title: 'Planning Board', icon: CalendarIcon, path: '/club/plans', perm: 'club.plan.view' },
      { title: 'Saved Groups', icon: PeopleIcon, path: '/club/saved-groups', perm: 'club.plan.view' },
      { title: 'Review Queue', icon: ReportIcon, path: '/club/reviews', perm: 'club.activity.review' },
      { title: 'My Activities', icon: DutyIcon, path: '/club/me', perm: 'club.plan.conduct' },
      { title: 'Settings', icon: TypeIcon, path: '/club/settings', perm: 'club.setup.manage' },
    ],
  },
  {
    title: 'Assembly',
    icon: AssemblyIcon,
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/assembly/permissions', perm: 'authz.manage', admin: true },
      // 'Day' is a mobile-only view (wired via MOBILE_FEATURES → /assembly/day);
      // on desktop 'This Week' already covers it, so it's intentionally omitted here.
      { title: 'This Week', icon: WeekIcon, path: '/assembly/week', perm: 'assembly.plan.view' },
      { title: 'Calendar', icon: CalendarIcon, path: '/assembly/calendar', perm: 'assembly.plan.view' },
      // House-duty screens for teachers — the conduct surface, shown only to the relevant house
      // member / evaluator (derived via /me/assembly/duties), hidden from admins who use the
      // authoring entries below. Mirrors the mobile "my" tiles onto desktop.
      { title: 'My Roster', icon: RosterIcon, path: '/assembly/my-roster', perm: 'assembly.week.conduct', derived: 'houseMember' },
      { title: 'My Checklist', icon: ChecklistIcon, path: '/assembly/my-checklist', perm: 'assembly.week.conduct', derived: 'houseMember' },
      { title: 'My Grading', icon: GradingIcon, path: '/assembly/my-grade', perm: 'assembly.week.conduct', derived: 'evaluator' },
      // Authoring — desktop-only (absent from MOBILE_FEATURES).
      { title: 'Plans', icon: PlanIcon, path: '/assembly', perm: 'assembly.plan.manage' },
      { title: 'Themes', icon: ThemeIcon, path: '/assembly/themes', perm: 'assembly.plan.manage' },
      // House mode — authoring. Harmless in template mode.
      { title: 'Houses & Rotation', icon: HouseRotationIcon, path: '/assembly/houses', perm: 'assembly.house.manage' },
      { title: 'Roster', icon: RosterIcon, path: '/assembly/roster', perm: 'assembly.week.manage' },
      { title: 'Checklist', icon: ChecklistIcon, path: '/assembly/checklist', perm: 'assembly.grading.manage' },
      { title: 'Grading', icon: GradingIcon, path: '/assembly/grading', perm: 'assembly.grading.manage' },
      { title: 'Leaderboard', icon: LeaderboardIcon, path: '/assembly/leaderboard', perm: 'assembly.plan.view' },
      { title: 'Settings', icon: AsmSettingsIcon, path: '/assembly/settings', perm: 'assembly.config.manage', admin: true },
    ],
  },
  {
    // No parent perm: staff (leave.application.apply) see the "My *" children; approvers
    // see the oversight children. notPerm:leave.application.approve hides the personal
    // screens from an oversight user (god) — the Syllabus "My Plans" pattern. Permissions +
    // Config lead the list (admin:true → hidden behind the header reveal toggle).
    title: 'Leave',
    icon: LeaveNavIcon,
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/leave/permissions', perm: 'authz.manage', admin: true },
      { title: 'Config', icon: AsmSettingsIcon, path: '/leave/types', perm: 'leave.config.view', admin: true },
      { title: 'Apply / My Requests', icon: MarkIcon, path: '/leave/me', perm: 'leave.application.apply', notPerm: 'leave.application.approve' },
      { title: 'My Penalty', icon: WaiverIcon, path: '/leave/me/penalty', perm: 'leave.application.apply', notPerm: 'leave.application.approve' },
      { title: 'Leave Calendar', icon: CalendarIcon, path: '/leave/day', perm: 'leave.calendar.view' },
      { title: 'Approvals', icon: DutyIcon, path: '/leave/approvals', perm: 'leave.application.approve' },
      { title: 'Deduction Report', icon: StructureIcon, path: '/leave/deductions', perm: 'leave.deduction.view' },
    ],
  },
  {
    // Staff Attendance (live-ESSL generation) — supersedes the old Leave-based attendance
    // screens. No parent perm: each child self-filters (god/admin/director see oversight;
    // every staff member sees My Attendance). Config is admin:true (behind the reveal toggle).
    title: 'Staff Attendance',
    icon: AttendanceIcon,
    children: [
      { title: 'Config', icon: AsmSettingsIcon, path: '/staff-attendance/config', perm: 'staff-attendance.config.manage', admin: true },
      { title: 'My Attendance', icon: AttendanceIcon, path: '/staff-attendance/me', perm: 'staff-attendance.regularization.apply' },
      { title: 'Dashboard', icon: PeopleIcon, path: '/staff-attendance', perm: 'staff-attendance.record.view' },
      { title: 'Report', icon: ReportIcon, path: '/staff-attendance/report', perm: 'staff-attendance.record.view' },
      { title: 'Regularizations', icon: DutyIcon, path: '/staff-attendance/regularizations', perm: 'staff-attendance.regularization.approve' },
      { title: 'Biometric Devices', icon: BioImportIcon, path: '/staff-attendance/devices', perm: 'biometric.device.view' },
    ],
  },
  {
    // Home-visit feedback / complaints. No parent perm: teachers (feedback.ticket.record /
    // feedback.ticket.respond) see Record + My Feedback; the reviewer (feedback.ticket.review = god for
    // now) sees the Dashboard. notPerm hides the teacher self-service item from the
    // reviewer (same pattern as Leave). Admin has no feedback.* so the menu is hidden.
    title: 'Feedback',
    icon: FeedbackNavIcon,
    children: [
      { title: 'Permissions', icon: PermissionsIcon, path: '/feedback/permissions', perm: 'authz.manage', admin: true },
      { title: 'Record Feedback', icon: MarkIcon, path: '/feedback/record', perm: 'feedback.ticket.record' },
      { title: 'My Feedback', icon: AttendanceIcon, path: '/feedback/me', perm: 'feedback.ticket.respond', notPerm: 'feedback.ticket.review' },
      { title: 'Dashboard', icon: DutyIcon, path: '/feedback', perm: 'feedback.ticket.review' },
    ],
  },
];

// Admin screens (Permissions / Config) are marked admin:true on their menu child.
// The top-right reveal toggle only appears when the user can actually see at least
// one of them — god (authz.manage) for Permissions, or anyone holding the relevant
// *.config.manage grant for Config. Derived from the menu so it stays correct as
// modules are added.
export function hasAdminScreens(can) {
  return menuItems.some((item) =>
    (item.children || []).some((c) => c.admin && can(c.perm ?? item.perm))
  );
}

export default function Sidebar({ open, onClose, isDesktop, collapsed = false, onToggleCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const can = useCan();
  const { reveal } = useAdminReveal();
  const isMobile = useIsMobile();
  // Enabled on mobile (home tiles) and, on desktop, for anyone with assembly.view so
  // the derived "My Roster/Checklist/Grading" sidebar entries can resolve house roles.
  const { visible: mobileVisible } = useMobileVisibility(isMobile || can('assembly.plan.view'));
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
        // Admin screens (Permissions / Config) stay hidden until the top-right
        // reveal toggle is on — purely a visibility declutter, never a grant.
        if (c.admin && !reveal) return false;
        // Negative gate: hide from anyone who HAS this action (e.g. show the scoped
        // "My Plans" to teachers but not to managers, who use the full "Plans" list).
        if (c.notPerm && can(c.notPerm)) return false;
        // Derived "my" entries (house member / evaluator): shown to the matching
        // teacher only; admins use the authoring entries instead.
        if (c.derived) return !can('assembly.week.manage') && mobileVisible(c);
        return true;
      });
      return children.length ? { ...item, children } : null;
    })
    .filter(Boolean);

  // Desktop menu: pin Dashboard on top, then the rest split into labelled groups
  // (People & Staff / Academics / Operations / Stores & Inventory) with a divider each.
  // Flatten to a single list of entries (item | divider | label) so the render loop keeps
  // the existing per-item markup and just interleaves separators.
  const cockpitItem = visibleMenu.find((i) => i.title === 'Cockpit');
  const dashboardItem = visibleMenu.find((i) => i.title === 'Dashboard');
  const groupedMenu = groupByModule(visibleMenu.filter((i) => i.title !== 'Dashboard' && i.title !== 'Cockpit'));
  const desktopEntries = [];
  if (cockpitItem) desktopEntries.push({ type: 'item', item: cockpitItem });
  if (dashboardItem) desktopEntries.push({ type: 'item', item: dashboardItem });
  groupedMenu.forEach((group) => {
    desktopEntries.push({ type: 'divider', key: `div-${group.key}` });
    if (group.label) desktopEntries.push({ type: 'label', key: `lbl-${group.key}`, label: group.label });
    group.items.forEach((item) => desktopEntries.push({ type: 'item', item }));
  });

  // On small screens the sidebar mirrors the mobile home: the Today / Modules bands,
  // hub tiles collapsing to /hub/:key (same buildMobileTiles model + derived gating).
  const mobileSections = buildMobileTiles(mobileVisible);

  // Accordion: opening one module tree collapses the others, so at most one is
  // expanded at a time — the biggest single declutter of a long menu.
  const handleToggle = (title) => {
    setOpenMenus((prev) => (prev[title] ? {} : { [title]: true }));
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // A module is "active" if its own path or any of its children's paths match.
  const isItemActive = (item) =>
    item.path ? isActive(item.path) : (item.children || []).some((c) => isActive(c.path));

  const handleNavigate = (path) => {
    navigate(path);
    if (!isDesktop) {
      onClose();
    }
  };

  // Icon rail only applies to the permanent desktop drawer; tablet/mobile use a
  // temporary overlay where an icon rail makes no sense.
  const railCollapsed = isDesktop && collapsed;

  // In the collapsed rail a parent has nowhere to show its submenu, so clicking it
  // re-expands the sidebar and opens that tree; a leaf just navigates.
  const handleRailClick = (item) => {
    if (item.children) {
      setOpenMenus({ [item.title]: true });
      onToggleCollapsed?.();
    } else {
      handleNavigate(item.path);
    }
  };

  const sidebarStyles = {
    background: '#222b45',
    text: '#8f9bb3',
    textActive: '#ffffff',
    hover: '#1a2138',
  };

  // One mobile tile as a sidebar list row (shared by a section's loose tiles and its groups).
  const renderMobileTile = (t) => (
    <ListItem key={t.id ?? t.path} disablePadding>
      <ListItemButton
        onClick={() => handleNavigate(t.path)}
        sx={{
          px: 3,
          py: 1.5,
          backgroundColor: isActive(t.path) ? 'rgba(51, 102, 255, 0.2)' : 'transparent',
          borderLeft: isActive(t.path) ? '3px solid #3366ff' : '3px solid transparent',
          '&:hover': { backgroundColor: sidebarStyles.hover },
        }}
      >
        <ListItemIcon sx={{ color: isActive(t.path) ? sidebarStyles.textActive : sidebarStyles.text, minWidth: 40 }}>
          <t.icon />
        </ListItemIcon>
        <ListItemText
          primary={t.title}
          sx={{ '& .MuiTypography-root': { color: isActive(t.path) ? sidebarStyles.textActive : sidebarStyles.text } }}
        />
      </ListItemButton>
    </ListItem>
  );

  const drawerContent = (
    <>
      <Box
        sx={{
          px: railCollapsed ? 1 : 3,
          py: 2.25,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: railCollapsed ? 'center' : 'space-between',
        }}
      >
        {!railCollapsed && (
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, letterSpacing: 1 }}>
              ItsMySkool
            </Typography>
            <Typography variant="caption" sx={{ color: sidebarStyles.text }}>
              Staff Portal
            </Typography>
          </Box>
        )}
        {/* Collapse toggle — permanent desktop drawer only. */}
        {isDesktop && onToggleCollapsed && (
          <Tooltip title={collapsed ? 'Expand menu' : 'Collapse menu'} placement="right">
            <IconButton
              onClick={onToggleCollapsed}
              size="small"
              aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
              sx={{ color: sidebarStyles.text, '&:hover': { color: '#fff' } }}
            >
              {collapsed ? <ExpandIcon /> : <CollapseIcon />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {railCollapsed ? (
        <List sx={{ pt: 2 }}>
          {desktopEntries
            .filter((e) => e.type === 'item')
            .map(({ item }) => {
              const active = isItemActive(item);
              return (
                <ListItem key={item.title} disablePadding sx={{ justifyContent: 'center' }}>
                  <Tooltip title={item.title} placement="right">
                    <ListItemButton
                      onClick={() => handleRailClick(item)}
                      sx={{
                        justifyContent: 'center',
                        py: 1.5,
                        backgroundColor: active ? 'rgba(51, 102, 255, 0.2)' : 'transparent',
                        borderLeft: active ? '3px solid #3366ff' : '3px solid transparent',
                        '&:hover': { backgroundColor: sidebarStyles.hover },
                      }}
                    >
                      <ListItemIcon
                        sx={{ color: active ? sidebarStyles.textActive : sidebarStyles.text, minWidth: 0 }}
                      >
                        <item.icon />
                      </ListItemIcon>
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
        </List>
      ) : !isMobile ? (
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
              {sec.tiles.map(renderMobileTile)}
              {sec.groups.map((g) => (
                <React.Fragment key={g.label}>
                  <ListSubheader
                    sx={{
                      bgcolor: 'transparent',
                      color: sidebarStyles.text,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      lineHeight: '2.2',
                      pl: 5,
                      opacity: 0.8,
                    }}
                  >
                    {g.label}
                  </ListSubheader>
                  {g.tiles.map(renderMobileTile)}
                </React.Fragment>
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
        width: railCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: railCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: sidebarStyles.background,
          borderRight: 'none',
          overflowX: 'hidden',
          transition: 'width 180ms ease',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export { DRAWER_WIDTH, COLLAPSED_WIDTH };
