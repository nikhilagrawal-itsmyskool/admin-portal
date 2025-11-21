// src/context/data-context.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialStockData, initialIssueLogData, initialPurchaseLogData } from '../mock-data';

const DataContext = createContext();
const STORAGE_KEY = 'admin_app_data';

// Helper to safely retrieve data from localStorage or fall back to mock data
const getInitialState = () => {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    return JSON.parse(savedData);
  }
  return {
    stock: initialStockData,
    issueLog: initialIssueLogData,
    purchaseLog: initialPurchaseLogData,
  };
};

export const DataProvider = ({ children }) => {
  const [data, setData] = useState(getInitialState);

  // Effect to save data to localStorage whenever 'data' changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // --- 💊 CRUD Operations for Medicine Stock ---

  const getStockById = (id) => {
    return data.stock.find(item => item.id === parseInt(id));
  };

  const addStock = (newStock) => {
    setData(prev => ({
      ...prev,
      stock: [
        ...prev.stock,
        { 
          ...newStock,
          id: Date.now(), // Simple unique ID generation
          createdDate: new Date().toISOString().split('T')[0]
        }
      ]
    }));
  };

  const editStock = (updatedStock) => {
    setData(prev => ({
      ...prev,
      stock: prev.stock.map(item => 
        item.id === updatedStock.id ? updatedStock : item
      )
    }));
  };

  const deleteStock = (id) => {
    setData(prev => ({
      ...prev,
      stock: prev.stock.filter(item => item.id !== id)
    }));
  };

  // --- 📦 CRUD Operations for Purchase Log ---

  const getPurchaseLogById = (id) => {
    return data.purchaseLog.find(item => item.id === parseInt(id));
  };

  const addPurchaseLog = (newPurchaseLog) => {
    setData(prev => ({
      ...prev,
      purchaseLog: [
        ...prev.purchaseLog,
        { 
          ...newPurchaseLog,
          id: Date.now(), // Simple unique ID generation
          purchaseDate: newPurchaseLog.purchaseDate || new Date().toISOString().split('T')[0]
        }
      ]
    }));
  };

  const editPurchaseLog = (updatedPurchaseLog) => {
    setData(prev => ({
      ...prev,
      purchaseLog: prev.purchaseLog.map(item => 
        item.id === updatedPurchaseLog.id ? updatedPurchaseLog : item
      )
    }));
  };

  const deletePurchaseLog = (id) => {
    setData(prev => ({
      ...prev,
      purchaseLog: prev.purchaseLog.filter(item => item.id !== id)
    }));
  };

  const value = {
    // Expose all records
    stockRecords: data.stock,
    issueRecords: data.issueLog,
    purchaseRecords: data.purchaseLog,

    // Expose stock functions
    getStockById,
    addStock,
    editStock,
    deleteStock,

    // Expose purchase log functions
    getPurchaseLogById,
    addPurchaseLog,
    editPurchaseLog,
    deletePurchaseLog,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  return useContext(DataContext);
};