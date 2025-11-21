// src/pages/stock/add-stock.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

// Import local components and the data context
import MedicineForm from '../../components/forms/medicine-form';
import { useData } from '../../context/data-context';

const AddStock = () => {
    const navigate = useNavigate();
    // Get the function to add new data from the global context
    const { addStock } = useData();

    const handleFormSubmit = (formData) => {
        // 1. Call the global function to add the new record to the list and localStorage
        addStock(formData);
        
        // 2. Redirect back to the stock list after successful submission
        navigate('/stock');
    };

    const handleCancel = () => {
        // Navigate back to the stock list without saving
        navigate('/stock');
    };

    return (
        <MedicineForm 
            // Pass the handler to the form
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            // initialData is left blank, so the form renders as 'Add' mode
        />
    );
};

export default AddStock;