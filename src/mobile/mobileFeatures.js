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
  PhotoCamera as HomeworkIcon,
  RecordVoiceOver as AssistantIcon,
  Event as AcademicCalendarIcon,
  HistoryEdu as ExamMgmtIcon,
  HowToReg as DutyIcon,
  EventNote as ScheduleIcon,
  Image as BrandingTileIcon,
  Payments as FeesIcon,
  ReceiptLong as DuesIcon,
  Receipt as ReceiptIcon,
  QrCodeScanner as ScanIcon,
} from "@mui/icons-material";

// Features published to the mobile (small-screen) surface. EVERYTHING ELSE is
// desktop-only. A tile shows on the mobile home + nav when the user's role grants its
// `perm` (or it has none). `routes` lists every path the mobile route-guard permits.
//
// The home bands (`section`, order/labels in MOBILE_SECTIONS): "office" (god-only),
// "today" (shown as "Now" — daily-touch tiles), "mine" (personal/durable), "manage"
// (module consoles), "people" (People & Staff), "stores" (Stores & Inventory), "tools".
// Same module grouping the desktop sidebar uses. Features that share a `hub` key collapse into ONE tile that
// opens a hub screen (/hub/:key); a hub with only one visible action for you links
// straight to it (see buildMobileTiles). `color` is the tile's module accent (mirrors the
// desktop dashboard); on a hub the color comes from MOBILE_HUBS. `derived` is an extra
// runtime gate (house member / evaluator) resolved via /me/assembly/duties.
export const MOBILE_FEATURES = [
  // ── Today ──────────────────────────────────────────────────────────────────
  // Voice/LLM student assistant — god-only (assistant.use is granted to no role).
  { title: "My Timetable", icon: TimetableIcon, path: "/timetable/published", perm: "timetable.view", section: "mine", color: "#f4b400" },
  {
    title: "Take Attendance",
    icon: AttendanceIcon,
    path: "/attendance/mark",
    perm: "attendance.mark", // class teachers (+ admin/god); marking only, finalize is admin
    section: "today",
    color: "#43a047",
    routes: ["/attendance/mark", "/attendance/sessions", "/attendance/sessions/:id"],
  },
  {
    title: "My Syllabus",
    icon: SyllabusIcon,
    path: "/syllabus/my",
    perm: "syllabus.view",
    section: "mine",
    color: "#8e24aa",
    routes: ["/syllabus/my", "/syllabus/my/:syllabusId/:classId"],
  },
  // Assembly hub: the read-only day view (everyone with assembly.view) + the house
  // member's roster/checklist + the evaluator's grade. A plain teacher only has the day
  // view, so their Assembly tile links straight to it (no hub screen).
  // Read-only academic calendar (month view + holidays). No operations on mobile —
  // the page forces read-only and hides Import/Manage columns below the sm breakpoint.
  { title: "Academic Calendar", icon: AcademicCalendarIcon, path: "/academic-calendar", perm: "academic-calendar.view", section: "mine", color: "#3366ff", routes: ["/academic-calendar"] },
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
    color: "#ff6f00",
    routes: ["/transport/attendance/mark", "/transport/attendance/sessions"],
  },
  // My Homework — the class teacher posts the day's homework photos (pick class + date).
  { title: "Post Homework", icon: HomeworkIcon, path: "/homework", perm: "homework.post", section: "today", color: "#d97706" },
  // Send Message — a daily action, pulled up out of the old "Office" hub.
  { title: "Send Message", icon: CommunicationIcon, path: "/communication/compose", perm: "communication.send", section: "today", color: "#e91e63" },

  // ── Examinations ─────────────────────────────────────────────────────────────
  // Schedule + duties are open to all staff (no perm); management is exam.view only.
  { title: "Exam Schedule", icon: ScheduleIcon, path: "/exam/schedule", section: "mine", color: "#5e35b1", routes: ["/exam/schedule"] },
  { title: "My Exam Duties", icon: DutyIcon, path: "/exam/my-invigilations", section: "mine", color: "#5e35b1", routes: ["/exam/my-invigilations", "/exam/roster/:examId/:paperId/:sectionId", "/exam/room-roster/:examId/:roomId/:date"] },
  { title: "Examinations", icon: ExamMgmtIcon, path: "/examinations", perm: "exam.view", section: "manage", color: "#5e35b1", routes: ["/examinations", "/examinations/:id", "/examinations/:id/config", "/examinations/:id/datesheet", "/examinations/:id/seating", "/examinations/:id/invigilators", "/examinations/:id/room-invigilators", "/examinations/:id/admit-cards", "/examinations/:id/roster/:paperId/:sectionId", "/examinations/:id/room-roster/:roomId/:date", "/examinations/verify/:id"] },
  { title: "Branding", icon: BrandingTileIcon, path: "/branding", perm: "exam.manage", section: "manage", color: "#5e35b1", routes: ["/branding"] },

  // ── People & Staff ───────────────────────────────────────────────────────────
  { title: "Students", hubLabel: "Students", icon: StudentIcon, path: "/students", perm: "student.view", section: "people", hub: "people", routes: ["/students", "/students/:id"] },
  { title: "Employees", hubLabel: "Employees", icon: PeopleIcon, path: "/employees", perm: "employee.view", section: "people", hub: "people" },
  { title: "Hiring", hubLabel: "Hiring", icon: HiringIcon, path: "/hiring", perm: "hiring.view", section: "people", hub: "people", routes: ["/hiring", "/hiring/:id"] },
  // Read-only TC search/list on mobile; tapping a row opens the student detail
  // (permitted via the Students feature). Apply/issue stays desktop-only.
  { title: "Transfer Certificate", hubLabel: "TC", icon: TransferIcon, path: "/transfer", perm: "transfer.view", section: "people", hub: "people", routes: ["/transfer"] },

  // ── Stores & Inventory ───────────────────────────────────────────────────────
  { title: "Library Catalog", hubLabel: "Catalog", icon: LibraryIcon, path: "/library/catalog", perm: "library.view", section: "stores", hub: "library", routes: ["/library/catalog", "/library/catalog/:id"] },
  { title: "Library Circulation", hubLabel: "Circulation", icon: CirculationIcon, path: "/library/circulation", perm: "library.view", section: "stores", hub: "library" },

  { title: "Lab Items", hubLabel: "Items", icon: ScienceIcon, path: "/lab/items", perm: "lab.view", section: "stores", hub: "lab" },
  { title: "Lab Issues", hubLabel: "Issues", icon: ScienceIcon, path: "/lab/issues", perm: "lab.view", section: "stores", hub: "lab", routes: ["/lab/issues", "/lab/issues/add"] },

  { title: "Medical Items", hubLabel: "Items", icon: MedicalIcon, path: "/medical/items", perm: "medical.view", section: "stores", hub: "medical" },
  { title: "Medical Issues", hubLabel: "Issues", icon: MedicalIcon, path: "/medical/issues", perm: "medical.view", section: "stores", hub: "medical", routes: ["/medical/issues", "/medical/issues/add"] },

  { title: "Sports Items", hubLabel: "Items", icon: SportsIcon, path: "/sports/items", perm: "sports.view", section: "stores", hub: "sports" },
  // Issuing/wastage is a write op → the in-charge's action (sports.manage), not every
  // teacher's. Plain teachers keep read-only "Items" (sports.view).
  { title: "Sports Issues", hubLabel: "Issues", icon: SportsIcon, path: "/sports/issues", perm: "sports.manage", section: "stores", hub: "sports", routes: ["/sports/issues", "/sports/issues/add"] },

  { title: "Supplies Items", hubLabel: "Items", icon: SuppliesIcon, path: "/supplies/items", perm: "supplies.view", section: "stores", hub: "supplies" },
  { title: "Supplies Issues", hubLabel: "Issues", icon: SuppliesIcon, path: "/supplies/issues", perm: "supplies.manage", section: "stores", hub: "supplies", routes: ["/supplies/issues", "/supplies/issues/add"] },

  // Physical stock-count is the assets-incharge's job (asset.manage), not every teacher's.
  { title: "Asset Counts", icon: CountsIcon, path: "/asset/counts", perm: "asset.manage", section: "stores", color: "#8d6e63" },

  // ── Office — god only. The godpwa.* perms are granted to NO role, so only god ('*')
  // sees these; admins on a phone won't. Read-only checking on the go.
  { title: "Syllabus Overview", icon: SyllabusIcon, path: "/syllabus/overview", perm: "godpwa.syllabus.overview", section: "manage", color: "#8e24aa", routes: ["/syllabus/overview"] },
  { title: "Fees Overview", hubLabel: "Overview", icon: FeesIcon, path: "/fees", perm: "godpwa.fee.overview", section: "office", hub: "fees", routes: ["/fees"] },
  { title: "Dues Report", hubLabel: "Dues", icon: DuesIcon, path: "/fees/dues", perm: "godpwa.fee.dues", section: "office", hub: "fees", routes: ["/fees/dues"] },
  { title: "Receipts", hubLabel: "Receipts", icon: ReceiptIcon, path: "/fees/receipts", perm: "godpwa.fee.receipts", section: "office", hub: "fees", routes: ["/fees/receipts"] },
  // Scan a receipt QR to confirm it's genuine (works for any type incl transport). admin + god
  // (receipt.verify) — camera-based, so meaningful on a phone only.
  { title: "Scan & Verify", icon: ScanIcon, path: "/verify/scan", perm: "receipt.verify", section: "office", color: "#00897b", routes: ["/verify/scan"] },

  // ── Tools — pinned last. Assistant is god-only (assistant.use granted to no role).
  { title: "Assistant", icon: AssistantIcon, path: "/assistant", perm: "assistant.use", section: "tools", color: "#3366ff" },
];

// Hub display metadata (title, icon, module accent color), keyed by the `hub` field above.
export const MOBILE_HUBS = {
  assembly: { title: "Assembly", icon: AssemblyIcon, color: "#1e88e5" },
  people: { title: "People", icon: PeopleIcon, color: "#3d5afe" },
  library: { title: "Library", icon: LibraryIcon, color: "#5e35b1" },
  lab: { title: "Lab", icon: ScienceIcon, color: "#00b887" },
  medical: { title: "Medical", icon: MedicalIcon, color: "#3366ff" },
  sports: { title: "Sports", icon: SportsIcon, color: "#0095ff" },
  supplies: { title: "Supplies", icon: SuppliesIcon, color: "#00acc1" },
  fees: { title: "Fees", icon: FeesIcon, color: "#00897b" },
};

// The home bands, in display order (mirrors the desktop groups; "Today" is mobile-first).
export const MOBILE_SECTIONS = [
  { key: "office", label: "Office" }, // god-only tiles (godpwa.*) — pinned to the top
  { key: "today", label: "Now" },
  { key: "mine", label: "Mine" },
  { key: "manage", label: "Manage" }, // module consoles (Examinations; god-only Syllabus Overview)
  { key: "people", label: "People & Staff" },
  { key: "stores", label: "Stores & Inventory" },
  { key: "tools", label: "Tools" }, // Assistant (god) — pinned last
];

const DEFAULT_COLOR = "#3366ff";

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
        const color = hub.color || DEFAULT_COLOR;
        tiles.push(
          kids.length === 1
            ? { kind: "link", id: f.hub, title: hub.title, icon: hub.icon, path: kids[0].path, color }
            : { kind: "hub", id: f.hub, title: hub.title, icon: hub.icon, path: `/hub/${f.hub}`, count: kids.length, color },
        );
      } else if (visible(f)) {
        tiles.push({ kind: "link", id: f.path, title: f.title, icon: f.icon, path: f.path, color: f.color || DEFAULT_COLOR });
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
