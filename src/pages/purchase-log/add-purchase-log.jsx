import React from 'react';
import PurchaseLogForm from '../../components/forms/purchase-log-form';

const AddPurchaseLog = ({ onAdd, onCancel }) => {
  return (
    <PurchaseLogForm
      onSubmit={onAdd}
      onCancel={onCancel}
      formTitle="Add New Purchase Log Entry"
    />
  );
};

export default AddPurchaseLog;