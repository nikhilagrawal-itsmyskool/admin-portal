// src/pages/stock/edit-stock.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';

// Import local components and the data context
import MedicineForm from '../../components/forms/medicine-form';
import { useData } from '../../context/data-context';

const EditStock = () => {
    // 1. Get the 'id' parameter from the current URL (e.g., '/stock/edit/123')
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    // Get the helper functions from the context
    const { getStockById, editStock } = useData();

    // 2. Fetch the existing data for this ID to pre-populate the form
    // Note: We parse the ID to an integer because useParams returns a string
    const initialData = getStockById(parseInt(id)); 

    // --- Error Handling (If the ID is invalid or the record doesn't exist) ---
    if (!initialData) {
        return (
            <Box>
                <Typography variant="h5" color="error">
                    Error: Medicine record with ID {id} not found.
                </Typography>
                <Button onClick={() => navigate('/stock')} variant="contained" sx={{mt: 2}}>
                    Go to Stock List
                </Button>
            </Box>
        );
    }

    const handleFormSubmit = (updatedData) => {
        // 3. Ensure the original ID is attached to the data before updating
        // This is crucial for the context logic to know which item to modify
        editStock({ ...updatedData, id: initialData.id });
        
        // 4. Redirect back to the stock list
        navigate('/stock');
    };

    const handleCancel = () => {
        navigate('/stock');
    };

    return (
        <MedicineForm 
            // Pass the fetched data to the form to put it in 'Edit' mode
            initialData={initialData}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
        />
    );
};

export default EditStock;