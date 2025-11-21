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

const PurchaseLogList = () => {
  const navigate = useNavigate();
  
  // 1. Hook into the global data context for records and functions
  const { purchaseRecords, deletePurchaseLog } = useData(); 
  
  const [searchText, setSearchText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // --- Data Grid Columns ---
  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'medicineName', headerName: 'Medicine Name', width: 250 },
    { field: 'quantity', headerName: 'Quantity', type: 'number', width: 130 },
    { field: 'supplier', headerName: 'Supplier', width: 200 },
    { field: 'purchaseDate', headerName: 'Purchase Date', width: 150 },
    { 
      field: 'cost', 
      headerName: 'Total Cost', 
      type: 'number', 
      width: 150,
      renderCell: (params) => `$${params.value.toFixed(2)}`
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {/* Edit Button: Navigates to the edit route using the row ID */}
          <Button
            onClick={() => navigate(`/purchase-log/edit/${params.row.id}`)}
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

  // Filter the purchase records based on the search text
  const filteredRows = purchaseRecords.filter((row) =>
    Object.values(row).some((value) =>
      // Convert all values to string and check for a match (case-insensitive)
      String(value).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const handleDelete = () => {
    // Call the delete function from the context (which updates localStorage)
    deletePurchaseLog(selectedId); 
    setDialogOpen(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Purchase Log Records
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
        
        {/* Add Purchase Log Button */}
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={() => navigate('/purchase-log/add')}
        >
          Add Purchase Record
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
        content="Are you sure you want to delete this purchase log record? This action cannot be undone."
      />
    </Box>
  );
};

export default PurchaseLogList;