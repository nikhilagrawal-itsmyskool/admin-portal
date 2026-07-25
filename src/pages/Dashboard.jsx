import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Divider,
} from "@mui/material";
import {
  LocalHospital as MedicalIcon,
  Science as ScienceIcon,
  Gavel as GavelIcon,
  Checkroom as CheckroomIcon,
  MenuBook as MenuBookIcon,
  SportsCricket as SportsIcon,
  Inventory2 as AssetIcon,
  LocalLibrary as LibraryIcon,
  Widgets as SuppliesIcon,
  CalendarMonth as TimetableIcon,
  People as PeopleIcon,
  FactCheck as AttendanceIcon,
  Campaign as CommunicationIcon,
  PersonSearch as HiringIcon,
  DirectionsBus as TransportIcon,
  School as StudentIcon,
  AssignmentReturn as TransferIcon,
  LibraryBooks as SyllabusIcon,
  Groups as AssemblyIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useCan } from "../permissions/can";
import { getFirstName } from "../utils/userDisplay";
import { groupByModule } from "../config/moduleGroups";

// `perm` mirrors the left-menu gating in Sidebar.jsx — cards lead into a module, so a
// user only sees the card if they can reach that module. Cards with no `perm` are open
// to all signed-in staff (Attendance, Communication).
const modules = [
  {
    title: "Medical",
    description: "Manage medical inventory, purchases, and issues",
    icon: MedicalIcon,
    path: "/medical",
    color: "#3366ff",
    perm: "medical.view",
  },
  {
    title: "Laboratory",
    description: "Manage lab inventory, purchases, issues, and breakages",
    icon: ScienceIcon,
    path: "/lab",
    color: "#00b887",
    perm: "lab.view",
  },
  {
    title: "Fines",
    description: "Track incidents, decisions, and fine collections",
    icon: GavelIcon,
    path: "/fine",
    color: "#ff3d71",
    perm: "fine.view",
  },
  {
    title: "Uniform",
    description: "Manage uniform catalog, stock, and student sales",
    icon: CheckroomIcon,
    path: "/uniform",
    color: "#7b5ea7",
    perm: "uniform.view",
  },
  {
    title: "Shop",
    description: "Manage shop catalog, stock, and student sales",
    icon: MenuBookIcon,
    path: "/shop",
    color: "#ff9f43",
    perm: "shop.view",
  },
  {
    title: "Sports",
    description: "Manage sports inventory, purchases, issues, and breakages",
    icon: SportsIcon,
    path: "/sports",
    color: "#0095ff",
    perm: "sports.view",
  },
  {
    title: "Assets",
    description: "Manage the asset register, asset tree, and asset types",
    icon: AssetIcon,
    path: "/asset",
    color: "#8d6e63",
    perm: "asset.view",
  },
  {
    title: "Library",
    description: "Manage the catalog, circulation, and library fines",
    icon: LibraryIcon,
    path: "/library",
    color: "#5e35b1",
    perm: "library.view",
  },
  {
    title: "Supplies",
    description:
      "Manage supply categories, inventory, purchases, issues, and wastage",
    icon: SuppliesIcon,
    path: "/supplies",
    color: "#00acc1",
    perm: "supplies.view",
  },
  {
    title: "Timetable",
    description:
      "Build subjects, grids, and wings, then auto-generate class timetables",
    icon: TimetableIcon,
    // Route by capability: planners get the overview, teachers the published view.
    path: (can) => (can("timetable.print") ? "/timetable" : "/timetable/published"),
    color: "#f4b400",
    perm: "timetable.view",
  },
  {
    title: "Attendance",
    description: "Take daily attendance and review session history",
    icon: AttendanceIcon,
    path: "/attendance",
    color: "#43a047",
    perm: "attendance.mark",
  },
  {
    title: "Communication",
    description: "Compose messages, manage templates, and track sent messages",
    icon: CommunicationIcon,
    path: "/communication",
    color: "#e91e63",
    perm: "communication.send",
  },
  {
    title: "Employees",
    description: "Manage employees, logins, and passwords",
    icon: PeopleIcon,
    path: "/employees",
    color: "#009688",
    perm: "employee.view",
  },
  {
    title: "Hiring",
    description: "Track candidates through the interview pipeline",
    icon: HiringIcon,
    path: "/hiring",
    color: "#795548",
    perm: "hiring.view",
  },
  {
    title: "Transport",
    description: "Manage stops, vehicles, routes, and bus attendance",
    icon: TransportIcon,
    path: "/transport",
    color: "#ff6f00",
    perm: "transport.view",
  },
  {
    title: "Students",
    description: "Search students, class strength, and houses",
    icon: StudentIcon,
    path: "/students",
    color: "#3d5afe",
    perm: "student.view",
  },
  {
    title: "Transfer Certs",
    description: "Apply for and issue transfer certificates",
    icon: TransferIcon,
    path: "/transfer",
    color: "#607d8b",
    perm: "transfer.view",
  },
  {
    title: "Syllabus",
    description: "Plan month-wise syllabus and track coverage",
    icon: SyllabusIcon,
    path: "/syllabus",
    color: "#8e24aa",
    perm: "syllabus.view",
  },
  {
    title: "Assembly",
    description: "Plan the morning assembly, roster, and grading",
    icon: AssemblyIcon,
    path: "/assembly/week",
    color: "#1e88e5",
    perm: "assembly.view",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const can = useCan();

  const firstName = getFirstName(user?.displayName) || user?.loginName;
  const visibleModules = modules.filter((m) => !m.perm || can(m.perm));

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Welcome back, {firstName}
      </Typography>
      <Typography variant="body1" sx={{ color: "#8f9bb3", mb: 4 }}>
        Select a module to get started
      </Typography>

      {groupByModule(visibleModules).map((group) => (
        <Box key={group.key} sx={{ mb: 4 }}>
          {group.label && (
            <>
              <Typography
                variant="overline"
                sx={{ color: "#8f9bb3", fontWeight: 700, letterSpacing: 1 }}
              >
                {group.label}
              </Typography>
              <Divider sx={{ mb: 2, mt: 0.5 }} />
            </>
          )}
          <Grid container spacing={3}>
            {group.items.map((module) => (
              <Grid item xs={12} sm={6} md={4} key={module.title}>
                <Card>
                  <CardActionArea
                    onClick={() =>
                      navigate(
                        typeof module.path === "function"
                          ? module.path(can)
                          : module.path,
                      )
                    }
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          backgroundColor: `${module.color}15`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 2,
                        }}
                      >
                        <module.icon sx={{ fontSize: 28, color: module.color }} />
                      </Box>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {module.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#8f9bb3" }}>
                        {module.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
