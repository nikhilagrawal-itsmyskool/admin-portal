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
  EditCalendar as AssemblyRosterIcon,
  FactCheck as AssemblyChecklistIcon,
  Grading as AssemblyGradeIcon,
  MenuBook as SyllabusIcon,
  Business as OfficeIcon,
} from "@mui/icons-material";

// Features published to the mobile (small-screen) surface. EVERYTHING ELSE is
// desktop-only. A tile shows on the mobile home + nav when the user's role grants its
// `perm` (or it has none). `routes` lists every path the mobile route-guard permits for
// the feature (list + add + detail, ...); when omitted it defaults to [path].
//
// The home is organised in two bands (`section`): "today" (the daily-touch tiles) and
// "modules". Features that share a `hub` key collapse into ONE tile that opens a little
// hub screen (/hub/:key) listing its actions — so Assembly's day/roster/checklist/grade,
// Library's catalog/circulation, and each inventory module's items/issues are one tile
// each, not four/two. A hub with only ONE visible action for you doesn't add a tap: its
// tile links straight to that action (see buildMobileTiles). `hubLabel` is the child's
// name inside the hub; `derived` is an extra runtime gate (house member / evaluator)
// resolved via /me/assembly/duties (see useMobileVisibility).
export const MOBILE_FEATURES = [
  // ── Today ──────────────────────────────────────────────────────────────────
  { title: "My Timetable", icon: TimetableIcon, path: "/timetable/published", perm: "timetable.view", section: "today" },
  {
    title: "Take Attendance",
    icon: AttendanceIcon,
    path: "/attendance/mark",
    section: "today",
    routes: ["/attendance/mark", "/attendance/sessions", "/attendance/sessions/:id"],
  },
  {
    title: "My Syllabus",
    icon: SyllabusIcon,
    path: "/syllabus/my",
    perm: "syllabus.view",
    section: "today",
    routes: ["/syllabus/my", "/syllabus/my/:syllabusId/:classId"],
  },
  // Assembly hub: the read-only day view (everyone with assembly.view) + the house
  // member's roster/checklist + the evaluator's grade. A plain teacher only has the
  // day view, so their Assembly tile links straight to it (no hub screen).
  { title: "Today's assembly", hubLabel: "Today's assembly", icon: AssemblyIcon, path: "/assembly/day", perm: "assembly.view", section: "today", hub: "assembly" },
  { title: "My Roster", hubLabel: "My Roster", icon: AssemblyRosterIcon, path: "/assembly/my-roster", perm: "assembly.view", derived: "houseMember", section: "today", hub: "assembly" },
  { title: "My Checklist", hubLabel: "My Checklist", icon: AssemblyChecklistIcon, path: "/assembly/my-checklist", perm: "assembly.view", derived: "houseMember", section: "today", hub: "assembly" },
  { title: "Grade Assembly", hubLabel: "Grade", icon: AssemblyGradeIcon, path: "/assembly/my-grade", perm: "assembly.view", derived: "evaluator", section: "today", hub: "assembly" },
  {
    title: "Bus Attendance",
    icon: TransportIcon,
    path: "/transport/attendance/mark",
    perm: "transport.attendance.mark",
    section: "today",
    routes: ["/transport/attendance/mark", "/transport/attendance/sessions"],
  },

  // ── Modules ────────────────────────────────────────────────────────────────
  { title: "Library Catalog", hubLabel: "Catalog", icon: LibraryIcon, path: "/library/catalog", perm: "library.view", section: "modules", hub: "library", routes: ["/library/catalog", "/library/catalog/:id"] },
  { title: "Library Circulation", hubLabel: "Circulation", icon: CirculationIcon, path: "/library/circulation", perm: "library.view", section: "modules", hub: "library" },

  { title: "Sports Items", hubLabel: "Items", icon: SportsIcon, path: "/sports/items", perm: "sports.view", section: "modules", hub: "sports" },
  // Issuing/wastage is a write op → the in-charge's action (sports.manage), not every
  // teacher's. Plain teachers keep read-only "Items" (sports.view).
  { title: "Sports Issues", hubLabel: "Issues", icon: SportsIcon, path: "/sports/issues", perm: "sports.manage", section: "modules", hub: "sports", routes: ["/sports/issues", "/sports/issues/add"] },

  { title: "Supplies Items", hubLabel: "Items", icon: SuppliesIcon, path: "/supplies/items", perm: "supplies.view", section: "modules", hub: "supplies" },
  { title: "Supplies Issues", hubLabel: "Issues", icon: SuppliesIcon, path: "/supplies/issues", perm: "supplies.manage", section: "modules", hub: "supplies", routes: ["/supplies/issues", "/supplies/issues/add"] },

  { title: "Medical Items", hubLabel: "Items", icon: MedicalIcon, path: "/medical/items", perm: "medical.view", section: "modules", hub: "medical" },
  { title: "Medical Issues", hubLabel: "Issues", icon: MedicalIcon, path: "/medical/issues", perm: "medical.view", section: "modules", hub: "medical", routes: ["/medical/issues", "/medical/issues/add"] },

  { title: "Lab Items", hubLabel: "Items", icon: ScienceIcon, path: "/lab/items", perm: "lab.view", section: "modules", hub: "lab" },
  { title: "Lab Issues", hubLabel: "Issues", icon: ScienceIcon, path: "/lab/issues", perm: "lab.view", section: "modules", hub: "lab", routes: ["/lab/issues", "/lab/issues/add"] },

  { title: "Students", hubLabel: "Students", icon: StudentIcon, path: "/students", perm: "student.view", section: "modules", hub: "people", routes: ["/students", "/students/:id"] },
  { title: "Employees", hubLabel: "Employees", icon: PeopleIcon, path: "/employees", perm: "employee.view", section: "modules", hub: "people" },

  { title: "Hiring", hubLabel: "Hiring", icon: HiringIcon, path: "/hiring", perm: "hiring.view", section: "modules", hub: "office", routes: ["/hiring", "/hiring/:id"] },
  // Read-only TC search/list on mobile; tapping a row opens the student detail
  // (permitted via the Students feature). Apply/issue stays desktop-only.
  { title: "Transfer", hubLabel: "Transfer", icon: TransferIcon, path: "/transfer", perm: "transfer.view", section: "modules", hub: "office", routes: ["/transfer"] },
  { title: "Send Message", hubLabel: "Send Message", icon: CommunicationIcon, path: "/communication/compose", perm: "communication.send", section: "modules", hub: "office" },

  // Physical stock-count is the assets-incharge's job (asset.manage), not every teacher's.
  { title: "Asset Counts", icon: CountsIcon, path: "/asset/counts", perm: "asset.manage", section: "modules" },
];

// Hub display metadata, keyed by the `hub` field above.
export const MOBILE_HUBS = {
  assembly: { title: "Assembly", icon: AssemblyIcon },
  library: { title: "Library", icon: LibraryIcon },
  sports: { title: "Sports", icon: SportsIcon },
  supplies: { title: "Supplies", icon: SuppliesIcon },
  medical: { title: "Medical", icon: MedicalIcon },
  lab: { title: "Lab", icon: ScienceIcon },
  people: { title: "People", icon: PeopleIcon },
  office: { title: "Office", icon: OfficeIcon },
};

// The home bands, in display order.
export const MOBILE_SECTIONS = [
  { key: "today", label: "Today" },
  { key: "modules", label: "Modules" },
];

export const getHub = (key) => MOBILE_HUBS[key];

// Visible children of a hub (for the hub screen), in declaration order.
export const hubChildren = (key, visible) =>
  MOBILE_FEATURES.filter((f) => f.hub === key && visible(f));

// Build the grouped, permission-filtered home model. `visible(feature) => boolean`
// (supplied by useMobileVisibility) encapsulates perm + derived + admin-bypass.
// Returns [{ key, label, tiles }] with empty sections dropped. A tile is either a
// direct `link` or a `hub`; a hub with a single visible child collapses to a link.
export function buildMobileTiles(visible) {
  return MOBILE_SECTIONS.map((sec) => {
    const tiles = [];
    const seenHubs = new Set();
    for (const f of MOBILE_FEATURES) {
      if (f.section !== sec.key) continue;
      if (f.hub) {
        if (seenHubs.has(f.hub)) continue;
        seenHubs.add(f.hub);
        const kids = hubChildren(f.hub, visible);
        if (kids.length === 0) continue;
        const hub = MOBILE_HUBS[f.hub];
        tiles.push(
          kids.length === 1
            ? { kind: "link", id: f.hub, title: hub.title, icon: hub.icon, path: kids[0].path }
            : { kind: "hub", id: f.hub, title: hub.title, icon: hub.icon, path: `/hub/${f.hub}`, count: kids.length },
        );
      } else if (visible(f)) {
        tiles.push({ kind: "link", id: f.path, title: f.title, icon: f.icon, path: f.path });
      }
    }
    return { ...sec, tiles };
  }).filter((s) => s.tiles.length > 0);
}

// Home + profile are always reachable on mobile.
const ALWAYS_ALLOWED = ["/", "/profile", "/hub/:key"];

// Every route pattern permitted on the mobile surface (drives the route guard).
export const MOBILE_ROUTES = [
  ...ALWAYS_ALLOWED,
  ...MOBILE_FEATURES.flatMap((f) => f.routes || [f.path]),
];

// True if `pathname` is within the mobile allowlist (exact / :param match).
export function isMobilePathAllowed(pathname) {
  return MOBILE_ROUTES.some((p) => matchPath({ path: p, end: true }, pathname));
}
