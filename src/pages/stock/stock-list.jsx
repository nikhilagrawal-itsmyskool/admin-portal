import React, { useState } from 'react';
import { Typography, Box, Button, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

// Import local components and the data context
import ConfirmDialog from '../../components/shared/confirm-dialog';
import { useData } from '../../context/data-context'; 

const StockList = () => {
  const navigate = useNavigate();
  
  // 1. Hook into the global data context for records and functions
  const { stockRecords, deleteStock } = useData(); 
  
  const [searchText, setSearchText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // --- Data Grid Columns ---
  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Medicine Name', width: 250 },
    { field: 'batch', headerName: 'Batch No.', width: 150 },
    { field: 'quantity', headerName: 'Quantity', type: 'number', width: 130 },
    { field: 'expiry', headerName: 'Expiry Date', width: 150 },
    { field: 'createdDate', headerName: 'Added On', width: 120 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {/* Edit Button: Navigates to the edit route using the row ID */}
          <Button
            onClick={() => navigate(`/stock/edit/${params.row.id}`)}
            size="small"
            color="primary"
          >
            <EditIcon fontSize="small" />
          </Button>
          {/* Delete Button: Opens confirmation dialog */}
          <Button
            onClick={() => {
              setSelectedId(params.row.id);
              setDialogOpen(true);
            }}
            size="small"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </Button>
        </Box>
      ),
    },
  ];

  // --- Handlers and Filtering ---

  const handleSearch = (event) => {
    setSearchText(event.target.value);
  };

  // Filter the stock records based on the search text
  const filteredRows = stockRecords.filter((row) =>
    Object.values(row).some((value) =>
      // Convert all values to string and check for a match (case-insensitive)
      String(value).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const handleDelete = () => {
    // Call the delete function from the context (which updates localStorage)
    deleteStock(selectedId); 
    setDialogOpen(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Medicine Stock Records
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        {/* Search Input */}
        <TextField
          label="Search Records"
          variant="outlined"
          value={searchText}
          onChange={handleSearch}
          size="small"
          sx={{ width: '300px' }}
        />
        
        {/* Add Stock Button */}
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={() => navigate('/stock/add')}
        >
          Add Medicine Stock
        </Button>
      </Box>

      {/* Data Grid Table */}
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={filteredRows} // Data source
          columns={columns}
          pageSizeOptions={[5, 10, 20]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Confirmation Dialog for Deletion */}
      <ConfirmDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        content="Are you sure you want to delete this medicine stock record? This action cannot be undone."
      />
    </Box>
  );
};

export default StockList;