// src/mock-data.js

export const initialStockData = [
    { id: 1, name: 'Paracetamol 500mg', batch: 'P500-2025', quantity: 1500, expiry: '2026-04-01', unit: 'mg', createdDate: '2024-01-15' },
    { id: 2, name: 'Amoxicillin 250mg', batch: 'A250-2024', quantity: 500, expiry: '2025-11-15', createdDate: '2023-12-01' },
    { id: 3, name: 'Ibuprofen 400mg', batch: 'I400-2025', quantity: 2000, expiry: '2026-08-20', createdDate: '2024-02-10' },
];

export const initialIssueLogData = [
    { id: 101, medicineName: 'Paracetamol 500mg', quantity: 50, issuedTo: 'Ward A', issueDate: '2024-05-10' },
    { id: 102, medicineName: 'Amoxicillin 250mg', quantity: 10, issuedTo: 'OPD', issueDate: '2024-05-12' },
];

export const initialPurchaseLogData = [
    { id: 201, medicineName: 'Paracetamol 500mg', quantity: 5000, supplier: 'PharmaCo', purchaseDate: '2023-11-01', cost: 50000 },
];