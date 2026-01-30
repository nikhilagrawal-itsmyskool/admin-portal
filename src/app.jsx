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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
