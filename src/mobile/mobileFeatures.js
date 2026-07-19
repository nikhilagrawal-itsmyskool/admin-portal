import { matchPath } from "react-router-dom";
import {
  CalendarMonth as TimetableIcon,
  FactCheck as AttendanceIcon,
  DirectionsBus as TransportIcon,
  School as StudentIcon,
  AssignmentReturn as TransferIcon,
  People as PeopleIcon,
  PersonSearch as HiringIcon,
  Campaign as CommunicationIcon,
  LocalLibrary as LibraryIcon,
  SwapHoriz as CirculationIcon,
  LocalHospital as MedicalIcon,
  Science as ScienceIcon,
  SportsCricket as SportsIcon,
  Widgets as SuppliesIcon,
  Tag as CountsIcon,
  Groups as AssemblyIcon,
  MenuBook as SyllabusIcon,
} from "@mui/icons-material";

// Features published to the mobile (small-screen) surface. EVERYTHING ELSE is
// desktop-only. A tile shows on the mobile home + nav when the user's role grants its
// `perm` (or it has none). `routes` lists every path the mobile route-guard permits for
// the feature (list + add + detail, ...); when omitted it defaults to [path].
export const MOBILE_FEATURES = [
  { title: "My Timetable", icon: TimetableIcon, path: "/timetable/published", perm: "timetable.view" },
  // Read-only day view. Authoring (plans/themes) is intentionally desktop-only.
  { title: "Assembly", icon: AssemblyIcon, path: "/assembly/day", perm: "assembly.view" },
  {
    // Teacher's assigned syllabus plans; tap a section to mark coverage. Authoring
    // (subjects/plans/entries) stays desktop-only.
    title: "My Syllabus",
    icon: SyllabusIcon,
    path: "/syllabus/my",
    perm: "syllabus.view",
    routes: ["/syllabus/my", "/syllabus/my/:syllabusId/:classId"],
  },
  {
    title: "Take Attendance",
    icon: AttendanceIcon,
    path: "/attendance/mark",
    routes: ["/attendance/mark", "/attendance/sessions", "/attendance/sessions/:id"],
  },
  {
    title: "Bus Attendance",
    icon: TransportIcon,
    path: "/transport/attendance/mark",
    perm: "transport.attendance.mark",
    routes: ["/transport/attendance/mark", "/transport/attendance/sessions"],
  },
  {
    title: "Students",
    icon: StudentIcon,
    path: "/students",
    perm: "student.view",
    routes: ["/students", "/students/:id"],
  },
  {
    // Read-only TC search/list on mobile; tapping a row opens the student detail
    // (permitted via the Students feature above). Apply/issue stays desktop-only.
    title: "Transfer",
    icon: TransferIcon,
    path: "/transfer",
    perm: "transfer.view",
    routes: ["/transfer"],
  },
  { title: "Employees", icon: PeopleIcon, path: "/employees", perm: "employee.view" },
  {
    title: "Hiring",
    icon: HiringIcon,
    path: "/hiring",
    perm: "hiring.view",
    routes: ["/hiring", "/hiring/:id"],
  },
  { title: "Send Message", icon: CommunicationIcon, path: "/communication/compose", perm: "communication.send" },
  {
    title: "Library Catalog",
    icon: LibraryIcon,
    path: "/library/catalog",
    perm: "library.view",
    routes: ["/library/catalog", "/library/catalog/:id"],
  },
  { title: "Library Circulation", icon: CirculationIcon, path: "/library/circulation", perm: "library.view" },
  { title: "Medical Items", icon: MedicalIcon, path: "/medical/items", perm: "medical.view" },
  {
    title: "Medical Issues",
    icon: MedicalIcon,
    path: "/medical/issues",
    perm: "medical.view",
    routes: ["/medical/issues", "/medical/issues/add"],
  },
  { title: "Lab Items", icon: ScienceIcon, path: "/lab/items", perm: "lab.view" },
  {
    title: "Lab Issues",
    icon: ScienceIcon,
    path: "/lab/issues",
    perm: "lab.view",
    routes: ["/lab/issues", "/lab/issues/add"],
  },
  { title: "Sports Items", icon: SportsIcon, path: "/sports/items", perm: "sports.view" },
  {
    title: "Sports Issues",
    icon: SportsIcon,
    path: "/sports/issues",
    perm: "sports.view",
    routes: ["/sports/issues", "/sports/issues/add"],
  },
  { title: "Supplies Items", icon: SuppliesIcon, path: "/supplies/items", perm: "supplies.view" },
  {
    title: "Supplies Issues",
    icon: SuppliesIcon,
    path: "/supplies/issues",
    perm: "supplies.view",
    routes: ["/supplies/issues", "/supplies/issues/add"],
  },
  { title: "Asset Counts", icon: CountsIcon, path: "/asset/counts", perm: "asset.view" },
];

// Home + profile are always reachable on mobile.
const ALWAYS_ALLOWED = ["/", "/profile"];

// Every route pattern permitted on the mobile surface (drives the route guard).
export const MOBILE_ROUTES = [
  ...ALWAYS_ALLOWED,
  ...MOBILE_FEATURES.flatMap((f) => f.routes || [f.path]),
];

// True if `pathname` is within the mobile allowlist (exact / :param match).
export function isMobilePathAllowed(pathname) {
  return MOBILE_ROUTES.some((p) => matchPath({ path: p, end: true }, pathname));
}
