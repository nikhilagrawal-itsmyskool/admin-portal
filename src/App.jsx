import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MedicalDashboard from './pages/medical/MedicalDashboard';
import ItemList from './pages/medical/items/ItemList';
import ItemForm from './pages/medical/items/ItemForm';
import PurchaseList from './pages/medical/purchases/PurchaseList';
import PurchaseForm from './pages/medical/purchases/PurchaseForm';
import IssueList from './pages/medical/issues/IssueList';
import IssueForm from './pages/medical/issues/IssueForm';
import LabDashboard from './pages/lab/LabDashboard';
import LabList from './pages/lab/labs/LabList';
import LabForm from './pages/lab/labs/LabForm';
import LabItemList from './pages/lab/items/LabItemList';
import LabItemForm from './pages/lab/items/LabItemForm';
import LabPurchaseList from './pages/lab/purchases/LabPurchaseList';
import LabPurchaseForm from './pages/lab/purchases/LabPurchaseForm';
import LabBulkPurchaseForm from './pages/lab/purchases/LabBulkPurchaseForm';
import LabIssueList from './pages/lab/issues/LabIssueList';
import LabIssueForm from './pages/lab/issues/LabIssueForm';
import LabBreakageList from './pages/lab/breakages/LabBreakageList';
import LabBreakageForm from './pages/lab/breakages/LabBreakageForm';
import SportDashboard from './pages/sports/SportDashboard';
import SportInchargeList from './pages/sports/incharges/SportInchargeList';
import SportItemList from './pages/sports/items/SportItemList';
import SportItemForm from './pages/sports/items/SportItemForm';
import SportPurchaseList from './pages/sports/purchases/SportPurchaseList';
import SportPurchaseForm from './pages/sports/purchases/SportPurchaseForm';
import SportBulkPurchaseForm from './pages/sports/purchases/SportBulkPurchaseForm';
import SportIssueList from './pages/sports/issues/SportIssueList';
import SportIssueForm from './pages/sports/issues/SportIssueForm';
import SportBreakageList from './pages/sports/breakages/SportBreakageList';
import SportBreakageForm from './pages/sports/breakages/SportBreakageForm';
import FineDashboard from './pages/fine/FineDashboard';
import FineIncidentList from './pages/fine/incidents/FineIncidentList';
import FineIncidentForm from './pages/fine/incidents/FineIncidentForm';
import FineIncidentDetail from './pages/fine/incidents/FineIncidentDetail';
import HiringCandidateList from './pages/hiring/HiringCandidateList';
import HiringCandidateForm from './pages/hiring/HiringCandidateForm';
import HiringCandidateDetail from './pages/hiring/HiringCandidateDetail';
import TransferList from './pages/transfer/TransferList';
import UniformDashboard from './pages/uniform/UniformDashboard';
import UniformCatalog from './pages/uniform/catalog/UniformCatalog';
import UniformPurchaseList from './pages/uniform/purchases/UniformPurchaseList';
import UniformPurchaseForm from './pages/uniform/purchases/UniformPurchaseForm';
import UniformSetList from './pages/uniform/sets/UniformSetList';
import UniformSetForm from './pages/uniform/sets/UniformSetForm';
import UniformSaleList from './pages/uniform/sales/UniformSaleList';
import UniformSaleForm from './pages/uniform/sales/UniformSaleForm';
import UniformSaleDetail from './pages/uniform/sales/UniformSaleDetail';
import ShopDashboard from './pages/shop/ShopDashboard';
import ShopCatalog from './pages/shop/catalog/ShopCatalog';
import ShopPurchaseList from './pages/shop/purchases/ShopPurchaseList';
import ShopPurchaseForm from './pages/shop/purchases/ShopPurchaseForm';
import ShopSetList from './pages/shop/sets/ShopSetList';
import ShopSetForm from './pages/shop/sets/ShopSetForm';
import ShopSaleList from './pages/shop/sales/ShopSaleList';
import ShopSaleForm from './pages/shop/sales/ShopSaleForm';
import ShopSaleDetail from './pages/shop/sales/ShopSaleDetail';
import AssetDashboard from './pages/asset/AssetDashboard';
import AssetTree from './pages/asset/tree/AssetTree';
import AssetTypeList from './pages/asset/types/AssetTypeList';
import AssetCounts from './pages/asset/AssetCounts';
import EmployeeList from './pages/employee/EmployeeList';
import EmployeeForm from './pages/employee/EmployeeForm';
import LibraryDashboard from './pages/library/LibraryDashboard';
import WorkList from './pages/library/works/WorkList';
import CatalogForm from './pages/library/works/CatalogForm';
import WorkDetail from './pages/library/works/WorkDetail';
import Circulation from './pages/library/circulation/Circulation';
import FineList from './pages/library/fines/FineList';
import LibrarySettings from './pages/library/settings/LibrarySettings';
import SuppliesDashboard from './pages/supplies/SuppliesDashboard';
import SupplyCategoryList from './pages/supplies/categories/SupplyCategoryList';
import SupplyItemList from './pages/supplies/items/SupplyItemList';
import SupplyItemForm from './pages/supplies/items/SupplyItemForm';
import SupplyPurchaseList from './pages/supplies/purchases/SupplyPurchaseList';
import SupplyBulkPurchaseForm from './pages/supplies/purchases/SupplyBulkPurchaseForm';
import SupplyIssueList from './pages/supplies/issues/SupplyIssueList';
import SupplyIssueForm from './pages/supplies/issues/SupplyIssueForm';
import SupplyWastageList from './pages/supplies/wastages/SupplyWastageList';
import SupplyWastageForm from './pages/supplies/wastages/SupplyWastageForm';
import TimetableDashboard from './pages/timetable/TimetableDashboard';
import SubjectList from './pages/timetable/subjects/SubjectList';
import ConfigList from './pages/timetable/config/ConfigList';
import ConfigBuilder from './pages/timetable/config/ConfigBuilder';
import ClassSetup from './pages/timetable/setup/ClassSetup';
import WingList from './pages/timetable/wings/WingList';
import ClassGroupList from './pages/timetable/groups/ClassGroupList';
import RunList from './pages/timetable/runs/RunList';
import RunDetail from './pages/timetable/runs/RunDetail';
import ConstraintList from './pages/timetable/constraints/ConstraintList';
import GenerateWizard from './pages/timetable/generate/GenerateWizard';
import PublishedTimetable from './pages/timetable/published/PublishedTimetable';
import SeasonList from './pages/timetable/seasons/SeasonList';
import SeasonEditor from './pages/timetable/seasons/SeasonEditor';
import StudentList from './pages/student/StudentList';
import StudentForm from './pages/student/StudentForm';
import StudentDetail from './pages/student/StudentDetail';
import ClassStrength from './pages/student/ClassStrength';
import HouseList from './pages/student/houses/HouseList';
import AttendanceDashboard from './pages/attendance/AttendanceDashboard';
import TakeAttendance from './pages/attendance/TakeAttendance';
import AttendanceSessionList from './pages/attendance/AttendanceSessionList';
import AttendanceSessionDetail from './pages/attendance/AttendanceSessionDetail';
import AttendanceRegister from './pages/attendance/AttendanceRegister';
import CommunicationDashboard from './pages/communication/CommunicationDashboard';
import TemplateList from './pages/communication/templates/TemplateList';
import TemplateForm from './pages/communication/templates/TemplateForm';
import ComposeMessage from './pages/communication/messages/ComposeMessage';
import MessageJobList from './pages/communication/messages/MessageJobList';
import MessageJobDetail from './pages/communication/messages/MessageJobDetail';
import TransportDashboard from './pages/transport/TransportDashboard';
import StopList from './pages/transport/stops/StopList';
import VehicleList from './pages/transport/vehicles/VehicleList';
import VehicleForm from './pages/transport/vehicles/VehicleForm';
import RouteList from './pages/transport/routes/RouteList';
import RouteForm from './pages/transport/routes/RouteForm';
import TransportAssignmentList from './pages/transport/assignments/AssignmentList';
import TransportTakeAttendance from './pages/transport/attendance/TransportTakeAttendance';
import TransportSessionList from './pages/transport/attendance/TransportSessionList';
import SyllabusList from './pages/syllabus/SyllabusList';
import OfferingsMatrix from './pages/syllabus/OfferingsMatrix';
import ModelPapers from './pages/syllabus/ModelPapers';
import SyllabusBuilder from './pages/syllabus/SyllabusBuilder';
import SyllabusSubjectList from './pages/syllabus/subjects/SubjectList';
import SyllabusProgress from './pages/syllabus/SyllabusProgress';
import MySyllabus from './pages/syllabus/MySyllabus';
import TeacherCoverage from './pages/syllabus/TeacherCoverage';
import HomeworkPage from './pages/homework/HomeworkPage';
import HomeworkMappingPage from './pages/homework/HomeworkMappingPage';
import AssemblyList from './pages/assembly/AssemblyList';
import PlanBuilder from './pages/assembly/PlanBuilder';
import SpecialBuilder from './pages/assembly/SpecialBuilder';
import ThemesPage from './pages/assembly/ThemesPage';
import ScheduleWeek from './pages/assembly/ScheduleWeek';
import ScheduleCalendar from './pages/assembly/ScheduleCalendar';
import ScheduleDay from './pages/assembly/ScheduleDay';
import AssemblySettings from './pages/assembly/AssemblySettings';
import HousesRotation from './pages/assembly/HousesRotation';
import RosterEditor from './pages/assembly/RosterEditor';
import ChecklistPage from './pages/assembly/ChecklistPage';
import GradingPage from './pages/assembly/GradingPage';
import LeaderboardPage from './pages/assembly/LeaderboardPage';
import MyRoster from './pages/assembly/MyRoster';
import MyChecklist from './pages/assembly/MyChecklist';
import MyGrade from './pages/assembly/MyGrade';
import Profile from './pages/Profile';
import MobileHome from './pages/MobileHome';
import HubPage from './pages/HubPage';
import { useIsMobile } from './hooks/useIsMobile';

// On small screens the app is restricted to the mobile feature set (see
// src/mobile/mobileFeatures + the MainLayout guard); "/" shows the mobile home menu.
function HomeScreen() {
  return useIsMobile() ? <MobileHome /> : <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeScreen />} />
        <Route path="hub/:key" element={<HubPage />} />
        <Route path="medical" element={<MedicalDashboard />} />
        <Route path="medical/items" element={<ItemList />} />
        <Route path="medical/items/add" element={<ItemForm />} />
        <Route path="medical/items/:id/edit" element={<ItemForm />} />
        <Route path="medical/purchases" element={<PurchaseList />} />
        <Route path="medical/purchases/add" element={<PurchaseForm />} />
        <Route path="medical/purchases/bulk/:id/edit" element={<PurchaseForm />} />
        <Route path="medical/purchases/:id/edit" element={<PurchaseForm />} />
        <Route path="medical/issues" element={<IssueList />} />
        <Route path="medical/issues/add" element={<IssueForm />} />
        <Route path="medical/issues/:id/edit" element={<IssueForm />} />
        <Route path="lab" element={<LabDashboard />} />
        <Route path="lab/labs" element={<LabList />} />
        <Route path="lab/labs/add" element={<LabForm />} />
        <Route path="lab/labs/:id/edit" element={<LabForm />} />
        <Route path="lab/items" element={<LabItemList />} />
        <Route path="lab/items/add" element={<LabItemForm />} />
        <Route path="lab/items/:id/edit" element={<LabItemForm />} />
        <Route path="lab/purchases" element={<LabPurchaseList />} />
        <Route path="lab/purchases/bulk/add" element={<LabBulkPurchaseForm />} />
        <Route path="lab/purchases/bulk/:id/edit" element={<LabBulkPurchaseForm />} />
        <Route path="lab/purchases/add" element={<LabPurchaseForm />} />
        <Route path="lab/purchases/:id/edit" element={<LabPurchaseForm />} />
        <Route path="lab/issues" element={<LabIssueList />} />
        <Route path="lab/issues/add" element={<LabIssueForm />} />
        <Route path="lab/issues/:id/edit" element={<LabIssueForm />} />
        <Route path="lab/breakages" element={<LabBreakageList />} />
        <Route path="lab/breakages/add" element={<LabBreakageForm />} />
        <Route path="lab/breakages/:id/edit" element={<LabBreakageForm />} />
        <Route path="sports" element={<SportDashboard />} />
        <Route path="sports/incharges" element={<SportInchargeList />} />
        <Route path="sports/items" element={<SportItemList />} />
        <Route path="sports/items/add" element={<SportItemForm />} />
        <Route path="sports/items/:id/edit" element={<SportItemForm />} />
        <Route path="sports/purchases" element={<SportPurchaseList />} />
        <Route path="sports/purchases/bulk/add" element={<SportBulkPurchaseForm />} />
        <Route path="sports/purchases/bulk/:id/edit" element={<SportBulkPurchaseForm />} />
        <Route path="sports/purchases/add" element={<SportPurchaseForm />} />
        <Route path="sports/purchases/:id/edit" element={<SportPurchaseForm />} />
        <Route path="sports/issues" element={<SportIssueList />} />
        <Route path="sports/issues/add" element={<SportIssueForm />} />
        <Route path="sports/issues/:id/edit" element={<SportIssueForm />} />
        <Route path="sports/breakages" element={<SportBreakageList />} />
        <Route path="sports/breakages/add" element={<SportBreakageForm />} />
        <Route path="sports/breakages/:id/edit" element={<SportBreakageForm />} />
        <Route path="fine" element={<FineDashboard />} />
        <Route path="fine/incidents" element={<FineIncidentList />} />
        <Route path="fine/incidents/new" element={<FineIncidentForm />} />
        <Route path="fine/incidents/:id" element={<FineIncidentDetail />} />
        <Route path="fine/incidents/:id/edit" element={<FineIncidentForm />} />
        <Route path="hiring" element={<HiringCandidateList />} />
        <Route path="hiring/new" element={<HiringCandidateForm />} />
        <Route path="hiring/:id" element={<HiringCandidateDetail />} />
        <Route path="hiring/:id/edit" element={<HiringCandidateForm />} />
        <Route path="uniform" element={<UniformDashboard />} />
        <Route path="uniform/catalog" element={<UniformCatalog />} />
        <Route path="uniform/purchases" element={<UniformPurchaseList />} />
        <Route path="uniform/purchases/new" element={<UniformPurchaseForm />} />
        <Route path="uniform/purchases/:id" element={<UniformPurchaseForm />} />
        <Route path="uniform/sets" element={<UniformSetList />} />
        <Route path="uniform/sets/new" element={<UniformSetForm />} />
        <Route path="uniform/sets/:id/edit" element={<UniformSetForm />} />
        <Route path="uniform/sales" element={<UniformSaleList />} />
        <Route path="uniform/sales/new" element={<UniformSaleForm />} />
        <Route path="uniform/sales/:id" element={<UniformSaleDetail />} />
        <Route path="shop" element={<ShopDashboard />} />
        <Route path="shop/catalog" element={<ShopCatalog />} />
        <Route path="shop/purchases" element={<ShopPurchaseList />} />
        <Route path="shop/purchases/new" element={<ShopPurchaseForm />} />
        <Route path="shop/purchases/:id" element={<ShopPurchaseForm />} />
        <Route path="shop/sets" element={<ShopSetList />} />
        <Route path="shop/sets/new" element={<ShopSetForm />} />
        <Route path="shop/sets/:id/edit" element={<ShopSetForm />} />
        <Route path="shop/sales" element={<ShopSaleList />} />
        <Route path="shop/sales/new" element={<ShopSaleForm />} />
        <Route path="shop/sales/:id" element={<ShopSaleDetail />} />
        <Route path="asset" element={<AssetDashboard />} />
        <Route path="asset/tree" element={<AssetTree />} />
        <Route path="asset/types" element={<AssetTypeList />} />
        <Route path="asset/counts" element={<AssetCounts />} />
        <Route path="students" element={<StudentList />} />
        <Route path="students/new" element={<StudentForm />} />
        <Route path="students/class-strength" element={<ClassStrength />} />
        <Route path="students/houses" element={<HouseList />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="students/:id/edit" element={<StudentForm />} />
        <Route path="transfer" element={<TransferList />} />
        <Route path="employees" element={<EmployeeList />} />
        <Route path="employees/add" element={<EmployeeForm />} />
        <Route path="employees/:id/edit" element={<EmployeeForm />} />
        <Route path="library" element={<LibraryDashboard />} />
        <Route path="library/catalog" element={<WorkList />} />
        <Route path="library/catalog/new" element={<CatalogForm />} />
        <Route path="library/catalog/:id" element={<WorkDetail />} />
        <Route path="library/circulation" element={<Circulation />} />
        <Route path="library/fines" element={<FineList />} />
        <Route path="library/settings" element={<LibrarySettings />} />
        <Route path="supplies" element={<SuppliesDashboard />} />
        <Route path="supplies/categories" element={<SupplyCategoryList />} />
        <Route path="supplies/items" element={<SupplyItemList />} />
        <Route path="supplies/items/add" element={<SupplyItemForm />} />
        <Route path="supplies/items/:id/edit" element={<SupplyItemForm />} />
        <Route path="supplies/purchases" element={<SupplyPurchaseList />} />
        <Route path="supplies/purchases/add" element={<SupplyBulkPurchaseForm />} />
        <Route path="supplies/purchases/:id/edit" element={<SupplyBulkPurchaseForm />} />
        <Route path="supplies/issues" element={<SupplyIssueList />} />
        <Route path="supplies/issues/add" element={<SupplyIssueForm />} />
        <Route path="supplies/issues/:id/edit" element={<SupplyIssueForm />} />
        <Route path="supplies/wastages" element={<SupplyWastageList />} />
        <Route path="supplies/wastages/add" element={<SupplyWastageForm />} />
        <Route path="supplies/wastages/:id/edit" element={<SupplyWastageForm />} />
        <Route path="timetable" element={<TimetableDashboard />} />
        <Route path="timetable/subjects" element={<SubjectList />} />
        <Route path="timetable/configs" element={<ConfigList />} />
        <Route path="timetable/configs/:id" element={<ConfigBuilder />} />
        <Route path="timetable/setup" element={<ClassSetup />} />
        <Route path="timetable/wings" element={<WingList />} />
        <Route path="timetable/class-groups" element={<ClassGroupList />} />
        <Route path="timetable/constraints" element={<ConstraintList />} />
        <Route path="timetable/generate" element={<GenerateWizard />} />
        <Route path="timetable/runs" element={<RunList />} />
        <Route path="timetable/runs/:id" element={<RunDetail />} />
        <Route path="timetable/published" element={<PublishedTimetable />} />
        <Route path="timetable/seasons" element={<SeasonList />} />
        <Route path="timetable/seasons/:id" element={<SeasonEditor />} />
        <Route path="attendance" element={<AttendanceDashboard />} />
        <Route path="attendance/mark" element={<TakeAttendance />} />
        <Route path="attendance/sessions" element={<AttendanceSessionList />} />
        <Route path="attendance/sessions/:id" element={<AttendanceSessionDetail />} />
        <Route path="attendance/register" element={<AttendanceRegister />} />
        <Route path="communication" element={<CommunicationDashboard />} />
        <Route path="communication/templates" element={<TemplateList />} />
        <Route path="communication/templates/add" element={<TemplateForm />} />
        <Route path="communication/templates/:id/edit" element={<TemplateForm />} />
        <Route path="communication/compose" element={<ComposeMessage />} />
        <Route path="communication/messages" element={<MessageJobList />} />
        <Route path="communication/messages/:id" element={<MessageJobDetail />} />
        <Route path="transport" element={<TransportDashboard />} />
        <Route path="transport/stops" element={<StopList />} />
        <Route path="transport/vehicles" element={<VehicleList />} />
        <Route path="transport/vehicles/add" element={<VehicleForm />} />
        <Route path="transport/vehicles/:id/edit" element={<VehicleForm />} />
        <Route path="transport/routes" element={<RouteList />} />
        <Route path="transport/routes/new" element={<RouteForm />} />
        <Route path="transport/routes/:id" element={<RouteForm />} />
        <Route path="transport/assignments" element={<TransportAssignmentList />} />
        <Route path="transport/attendance/mark" element={<TransportTakeAttendance />} />
        <Route path="transport/attendance/sessions" element={<TransportSessionList />} />
        <Route path="syllabus" element={<SyllabusList />} />
        <Route path="syllabus/offerings" element={<OfferingsMatrix />} />
        <Route path="syllabus/model-papers" element={<ModelPapers />} />
        <Route path="syllabus/subjects" element={<SyllabusSubjectList />} />
        <Route path="syllabus/progress" element={<SyllabusProgress />} />
        <Route path="syllabus/plans/:id" element={<SyllabusBuilder />} />
        <Route path="syllabus/my" element={<MySyllabus />} />
        <Route path="syllabus/my/:syllabusId/:classId" element={<TeacherCoverage />} />
        <Route path="homework" element={<HomeworkPage />} />
        <Route path="homework/class-teachers" element={<HomeworkMappingPage />} />
        <Route path="assembly" element={<AssemblyList />} />
        <Route path="assembly/day" element={<ScheduleDay />} />
        <Route path="assembly/week" element={<ScheduleWeek />} />
        <Route path="assembly/calendar" element={<ScheduleCalendar />} />
        <Route path="assembly/themes" element={<ThemesPage />} />
        <Route path="assembly/settings" element={<AssemblySettings />} />
        <Route path="assembly/houses" element={<HousesRotation />} />
        <Route path="assembly/roster" element={<RosterEditor />} />
        <Route path="assembly/checklist" element={<ChecklistPage />} />
        <Route path="assembly/grading" element={<GradingPage />} />
        <Route path="assembly/leaderboard" element={<LeaderboardPage />} />
        <Route path="assembly/my-roster" element={<MyRoster />} />
        <Route path="assembly/my-checklist" element={<MyChecklist />} />
        <Route path="assembly/my-grade" element={<MyGrade />} />
        <Route path="assembly/plans/:id" element={<PlanBuilder />} />
        <Route path="assembly/specials/:id" element={<SpecialBuilder />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
