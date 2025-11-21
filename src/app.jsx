// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/main-layout';
import StockList from './pages/stock/stock-list';
import AddStock from './pages/stock/add-stock';
import EditStock from './pages/stock/edit-stock';
import PurchaseLogList from './pages/purchase-log/purchase-log-list';
import AddPurchaseLog from './pages/purchase-log/add-purchase-log';
import EditPurchaseLog from './pages/purchase-log/edit-purchase-log';
import Dashboard from './pages/dashboard';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          <Route path="/stock" element={<StockList />} />
          <Route path="/stock/add" element={<AddStock />} />
          <Route path="/stock/edit/:id" element={<EditStock />} />
          <Route path="/purchases" element={<PurchaseLogList />} />
          <Route path="/purchases/add" element={<AddPurchaseLog />} />
          <Route path="/purchases/edit/:id" element={<EditPurchaseLog />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;