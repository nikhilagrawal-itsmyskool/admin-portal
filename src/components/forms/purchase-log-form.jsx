import React, { useState, useEffect } from 'react';
import {items as itemOptions} from '../../data/items.json';
import {units as unitOptions} from '../../data/units.json';

// Define the initial empty state for a new log
const initialFormState = {
  id: null,
  date: '',
  itemName: '',
  batch: '',
  expiryDate: '',
  quantity: 0,
  unit: unitOptions[0]?.unitName || '', // Default to the first unit
  supplierName: '',
  costPerUnit: 0.00,
  totalCost: 0.00,
};

// This component is now fully reusable for both Add and Edit
const PurchaseLogForm = ({ onSubmit, onCancel, initialData = null, formTitle }) => {
  // Initialize state: use initialData if provided (Edit mode), otherwise use empty state (Add mode)
  const [formData, setFormData] = useState(() => initialData || initialFormState);

  // --- Synchronization for Editing ---
  // Ensure the form state is updated if a different 'initialData' object is passed (e.g., switching between edit records)
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialFormState,
        ...initialData,
        // Ensure numeric fields are populated correctly
        quantity: initialData.quantity,
        costPerUnit: initialData.costPerUnit,
        totalCost: initialData.totalCost
      });
    } else {
      setFormData(initialFormState);
    }
  }, [initialData]);
  // --- END Synchronization ---


  // --- Calculation Logic ---
  // Effect to calculate Total Cost whenever Quantity or CostPerUnit changes
  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const cost = parseFloat(formData.costPerUnit) || 0;
    
    const newTotalCost = (quantity * cost).toFixed(2);
    
    // Crucial check to prevent infinite loop (totalCost is also a dependency here)
    if (newTotalCost !== formData.totalCost) {
        setFormData(prev => ({
            ...prev,
            totalCost: newTotalCost
        }));
    }
  }, [formData.quantity, formData.costPerUnit, formData.totalCost]);
  // --- END Calculation Logic ---


  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Handle number inputs gracefully
    const processedValue = (type === 'number' && value !== '') ? parseFloat(value) : value;

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pass the final, clean data object back to the parent component (AddPurchaseLog or EditPurchaseLog)
    onSubmit(formData);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>{formTitle || (initialData ? 'Edit Purchase Log' : 'Add New Purchase Log')}</h3>
      <form onSubmit={handleSubmit}>

        {/* --- FORM FIELDS (Using basic inline styles for clarity) --- */}
        
        {/* ROW 1: Date & Item Name */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          <label style={{ flex: 1 }}>Date:<input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></label>
          <label style={{ flex: 1 }}>Item Name:
            <select name="itemName" value={formData.itemName} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
              <option value="" disabled>Select Item</option>
              {itemOptions.map(item => (<option key={item} value={item}>{item}</option>))}
            </select>
          </label>
        </div>

        {/* ROW 2: Batch & Expiry Date */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          <label style={{ flex: 1 }}>Batch:<input type="text" name="batch" value={formData.batch} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></label>
          <label style={{ flex: 1 }}>Expiry Date:<input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></label>
        </div>

        {/* ROW 3: Quantity & Unit */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          <label style={{ flex: 1 }}>Quantity Purchased:<input type="number" name="quantity" min="0" value={formData.quantity} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></label>
          <label style={{ flex: 1 }}>Unit:
            <select name="unit" value={formData.unit} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
              {unitOptions.map(unit => (<option key={unit.unitName} value={unit.unitName}>{unit.unitName}</option>))}
            </select>
          </label>
        </div>

        {/* ROW 4: Supplier Name */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ width: '100%' }}>Supplier Name:<input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></label>
        </div>

        {/* ROW 5: Cost Per Unit & Total Cost */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <label style={{ flex: 1 }}>Cost Per Unit:<input type="number" name="costPerUnit" min="0" step="0.01" value={formData.costPerUnit} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/></label>
          <label style={{ flex: 1 }}>Total Cost (Calculated):
            <input type="text" name="totalCost" value={`$ ${formData.totalCost}`} readOnly style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#f0f0f0' }}/>
          </label>
        </div>
        
        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={onCancel} 
            style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {initialData ? 'Save Changes' : 'Log Purchase'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseLogForm;