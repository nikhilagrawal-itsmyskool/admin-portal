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
import LabIssueList from './pages/lab/issues/LabIssueList';
import LabIssueForm from './pages/lab/issues/LabIssueForm';
import LabBreakageList from './pages/lab/breakages/LabBreakageList';
import LabBreakageForm from './pages/lab/breakages/LabBreakageForm';

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
        <Route index element={<Dashboard />} />
        <Route path="medical" element={<MedicalDashboard />} />
        <Route path="medical/items" element={<ItemList />} />
        <Route path="medical/items/add" element={<ItemForm />} />
        <Route path="medical/items/:id/edit" element={<ItemForm />} />
        <Route path="medical/purchases" element={<PurchaseList />} />
        <Route path="medical/purchases/add" element={<PurchaseForm />} />
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
        <Route path="lab/purchases/add" element={<LabPurchaseForm />} />
        <Route path="lab/purchases/:id/edit" element={<LabPurchaseForm />} />
        <Route path="lab/issues" element={<LabIssueList />} />
        <Route path="lab/issues/add" element={<LabIssueForm />} />
        <Route path="lab/issues/:id/edit" element={<LabIssueForm />} />
        <Route path="lab/breakages" element={<LabBreakageList />} />
        <Route path="lab/breakages/add" element={<LabBreakageForm />} />
        <Route path="lab/breakages/:id/edit" element={<LabBreakageForm />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
