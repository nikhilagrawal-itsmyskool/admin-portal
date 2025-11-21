// src/components/Forms/MedicineForm.jsx
import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Grid, Typography } from '@mui/material';

// The 'initialData' prop will be passed for 'Edit' mode
const MedicineForm = ({ initialData = {}, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    comment: '',
    dosage: '',
    unit: '',
    reorderLevel: '',
    ...initialData,
  });

  useEffect(() => {
    // console.log('firing');
    setFormData({ name: '', description: '', comment: '', dosage: '', unit: '', reorderLevel: '', ...initialData });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // console.log(e, name, value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // ⚠️ TODO: Add form validation here
    onSubmit(formData);
  };

  const isEdit = Boolean(initialData.id);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom>
        {isEdit ? 'Edit Medicine Item' : 'Add New Medicine Item'}
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Medicine Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Comment"
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Dosage"
            name="dosage"
            value={formData.dosage}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Quantity"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Expiry Date"
            name="expiry"
            type="date"
            value={formData.expiry}
            onChange={handleChange}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" color="primary" sx={{ mr: 2 }}>
            {isEdit ? 'Save Changes' : 'Add Stock'}
          </Button>
          <Button variant="outlined" onClick={() => window.history.back()}>
            Cancel
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MedicineForm;